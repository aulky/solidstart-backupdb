import { type APIEvent } from "@solidjs/start/server";
import { rm } from "node:fs/promises";
import path from "node:path";
import { pool } from "../../../server/db/connection.js";
import { requireAuth } from "../../../server/middleware/auth.js";
import { getEnv } from "../../../server/env.js";

const FOLDER_REGEX = /^\d{4}-\d{2}-\d{2}_\d{6}$/;

/**
 * DELETE /api/delete-backup
 * Hapus folder backup + baris log terkait.
 */
export async function DELETE(event: APIEvent): Promise<Response> {
  const auth = await requireAuth(event.request);
  if (auth instanceof Response) return auth;

  try {
    const body = await event.request.json();
    const folder = (body as { folder?: string }).folder;

    if (!folder) {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "folder is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate folder name format — FEATURES.md §6
    if (!FOLDER_REGEX.test(folder)) {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "Invalid folder name format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const env = getEnv();
    const backupDir = path.resolve(env.BACKUP_DIR);
    const folderPath = path.resolve(path.join(backupDir, folder));

    // Path traversal guard
    if (!folderPath.startsWith(backupDir)) {
      return new Response(
        JSON.stringify({ error: "Forbidden", message: "Access denied" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Remove folder recursively
    await rm(folderPath, { recursive: true, force: true });

    // Remove related log entries
    await pool.query(
      "DELETE FROM backup_logs WHERE folder_name = ?",
      [folder]
    );

    return new Response(
      JSON.stringify({ success: true, message: `Backup folder '${folder}' deleted` }),
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
