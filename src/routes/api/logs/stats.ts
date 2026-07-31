import { type APIEvent } from "@solidjs/start/server";
import { pool, rootPool } from "../../../../server/db/connection.js";
import { requireAuth } from "../../../../server/middleware/auth.js";
import { getDiskSpace } from "../../../../server/services/disk.js";
import type { RowDataPacket } from "mysql2/promise";

/**
 * GET /api/logs/stats
 * Mengambil agregat statistik untuk kartu dashboard.
 */
export async function GET(event: APIEvent): Promise<Response> {
  const auth = await requireAuth(event.request);
  if (auth instanceof Response) return auth;

  try {
    // Total databases (non-system)
    const [dbRows] = await rootPool.query<RowDataPacket[]>("SHOW DATABASES");
    const systemDbs = ["information_schema", "mysql", "performance_schema", "sys", "backup_automation"];
    const totalDatabases = dbRows.filter(
      (r) => !systemDbs.includes(String(Object.values(r)[0]))
    ).length;

    // Active schedules
    const [schedRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM backup_schedules WHERE enabled = 1"
    );
    const activeSchedules = Number(schedRows[0]?.count || 0);

    // Settings (last run times)
    const [settingsRows] = await pool.query<RowDataPacket[]>(
      "SELECT last_run_success, last_run_fail, backup_dir FROM backup_settings WHERE id = 1"
    );
    const settings = settingsRows[0] || {};

    // Total backup size (success, non-retention)
    const [sizeRows] = await pool.query<RowDataPacket[]>(
      "SELECT SUM(file_size) as total_size FROM backup_logs WHERE status = 'success' AND type != 'retention'"
    );
    const totalBackupSize = Number(sizeRows[0]?.total_size || 0);

    // Total backup folders (distinct successful folders)
    const [folderRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(DISTINCT folder_name) as count FROM backup_logs WHERE status = 'success' AND type != 'retention'"
    );
    const totalFolders = Number(folderRows[0]?.count || 0);

    // Disk space
    let disk = { freeBytes: 0, totalBytes: 0 };
    try {
      disk = await getDiskSpace(settings.backup_dir as string);
    } catch {
      // Disk info unavailable
    }

    return new Response(
      JSON.stringify({
        totalDatabases,
        activeSchedules,
        lastRunSuccess: settings.last_run_success || null,
        lastRunFail: settings.last_run_fail || null,
        totalBackupSize,
        totalFolders,
        disk,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: "Server Error", message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
