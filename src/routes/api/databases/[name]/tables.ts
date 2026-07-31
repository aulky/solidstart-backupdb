import { type APIEvent } from "@solidjs/start/server";
import { rootPool } from "../../../../../server/db/connection.js";
import { requireAuth } from "../../../../../server/middleware/auth.js";
import { sanitizeIdentifier, SYSTEM_DBS } from "../../../../../server/shared/constants.js";
import type { RowDataPacket } from "mysql2/promise";

/**
 * GET /api/databases/[name]/tables
 * Daftar tabel dalam satu database beserta row count & size.
 */
export async function GET(event: APIEvent): Promise<Response> {
  const auth = await requireAuth(event.request);
  if (auth instanceof Response) return auth;

  try {
    const dbName = sanitizeIdentifier(event.params.name);
    if (!dbName || SYSTEM_DBS.includes(dbName as typeof SYSTEM_DBS[number])) {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "Invalid database name" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const [tables] = await rootPool.query<RowDataPacket[]>(
      `SELECT
        TABLE_NAME as name,
        TABLE_ROWS as rowCount,
        (DATA_LENGTH + INDEX_LENGTH) as sizeBytes,
        UPDATE_TIME as lastUpdated
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME ASC`,
      [dbName]
    );

    return new Response(
      JSON.stringify({ database: dbName, tables }),
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
