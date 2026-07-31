import { type APIEvent } from "@solidjs/start/server";
import { rootPool } from "../../../../../../../server/db/connection.js";
import { requireAuth } from "../../../../../../../server/middleware/auth.js";
import { sanitizeIdentifier } from "../../../../../../../server/shared/constants.js";
import type { RowDataPacket } from "mysql2/promise";

/**
 * GET /api/databases/[name]/tables/[table]/structure
 * Struktur/skema kolom tabel (read-only).
 */
export async function GET(event: APIEvent): Promise<Response> {
  const auth = await requireAuth(event.request);
  if (auth instanceof Response) return auth;

  try {
    const dbName = sanitizeIdentifier(event.params.name);
    const tableName = sanitizeIdentifier(event.params.table);

    if (!dbName || !tableName) {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "Invalid database or table name" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const [columns] = await rootPool.query<RowDataPacket[]>(
      `SELECT
        COLUMN_NAME as name,
        COLUMN_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_KEY as \`key\`,
        COLUMN_DEFAULT as \`default\`,
        EXTRA as extra
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION ASC`,
      [dbName, tableName]
    );

    return new Response(
      JSON.stringify({ database: dbName, table: tableName, columns }),
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
