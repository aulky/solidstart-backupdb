import { type APIEvent } from "@solidjs/start/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { pool } from "../../../server/db/connection.js";
import { requireAuth } from "../../../server/middleware/auth.js";
import { getEnv } from "../../../server/env.js";
import type { RowDataPacket } from "mysql2/promise";

/**
 * GET /api/download?folder=&file=
 * Unduh file .sql hasil backup dengan perlindungan path traversal.
 */
export async function GET(event: APIEvent): Promise<Response> {
  const auth = await requireAuth(event.request);
  if (auth instanceof Response) return auth;

  try {
    const url = new URL(event.request.url);
    const folder = url.searchParams.get("folder");
    const rawFile = url.searchParams.get("file");

    if (!folder || !rawFile) {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "folder and file parameters are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Sanitize filename — izinkan spasi, huruf, angka, _, -, .
    const file = path.basename(rawFile).replace(/[^a-zA-Z0-9_\-\s\.]/g, "").trim();
    if (!file || !file.endsWith(".sql")) {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "Invalid file name" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const env = getEnv();
    const backupDir = path.resolve(env.BACKUP_DIR);
    const targetPath = path.resolve(path.join(backupDir, folder, file));

    // Path traversal guard
    if (!targetPath.startsWith(backupDir)) {
      return new Response(
        JSON.stringify({ error: "Forbidden", message: "Access denied" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify log entry exists and was successful
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM backup_logs WHERE folder_name = ? AND status = 'success' AND (db_name = ? OR ? LIKE CONCAT(db_name, '.sql'))",
      [folder, file.replace(/\.sql$/, ""), file]
    );

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Not Found", message: "Backup record not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    let fileStat;
    try {
      fileStat = await stat(targetPath);
    } catch {
      return new Response(
        JSON.stringify({ error: "Not Found", message: "File does not exist on disk" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Convert Node ReadStream to Web ReadableStream properly
    const nodeStream = createReadStream(targetPath);
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file)}"`,
        "Content-Length": String(fileStat.size),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: "Server Error", message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
