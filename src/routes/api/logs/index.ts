import { type APIEvent } from "@solidjs/start/server";
import { pool } from "../../../../server/db/connection.js";
import { requireAuth } from "../../../../server/middleware/auth.js";
import type { RowDataPacket } from "mysql2/promise";

/**
 * GET /api/logs
 * Mengambil histori log terpaginasi + filter + data chart 30 hari.
 */
export async function GET(event: APIEvent): Promise<Response> {
  const auth = await requireAuth(event.request);
  if (auth instanceof Response) return auth;

  try {
    const url = new URL(event.request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10))
    );
    const offset = (page - 1) * limit;

    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");
    const db = url.searchParams.get("db");
    const search = url.searchParams.get("search");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const showRetention = url.searchParams.get("showRetention") === "true";

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (!showRetention) {
      conditions.push("type != 'retention'");
    }

    if (type) {
      conditions.push("type = ?");
      params.push(type);
    }
    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }
    if (db) {
      conditions.push("db_name = ?");
      params.push(db);
    }
    if (search) {
      conditions.push("(db_name LIKE ? OR folder_name LIKE ? OR error_message LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (startDate) {
      conditions.push("executed_at >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("executed_at <= ?");
      params.push(endDate);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Query count
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM backup_logs ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    // Query logs
    const [logs] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM backup_logs ${whereClause} ORDER BY executed_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Query chart data (30 days aggregation) dengan DATE_FORMAT presisi YYYY-MM-DD
    const [chartRows] = await pool.query<RowDataPacket[]>(`
      SELECT
        DATE_FORMAT(executed_at, '%Y-%m-%d') as date,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as fail_count
      FROM backup_logs
      WHERE type != 'retention' AND executed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE_FORMAT(executed_at, '%Y-%m-%d')
      ORDER BY date ASC
    `);

    return new Response(
      JSON.stringify({
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        chartData: chartRows,
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
