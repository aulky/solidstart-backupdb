import { type APIEvent } from "@solidjs/start/server";
import { rootPool } from "../../../../../../../server/db/connection.js";
import { requireAuth } from "../../../../../../../server/middleware/auth.js";
import { sanitizeIdentifier, SYSTEM_DBS } from "../../../../../../../server/shared/constants.js";
import type { RowDataPacket } from "mysql2/promise";

/**
 * GET /api/databases/[name]/tables/[table]/data
 * Preview 100 baris data tabel (read-only).
 */
export async function GET(event: APIEvent): Promise<Response> {
  const auth = await requireAuth(event.request);
  if (auth instanceof Response) return auth;

  try {
    const dbName = sanitizeIdentifier(event.params.name);
    const tableName = sanitizeIdentifier(event.params.table);

    if (!dbName || !tableName || SYSTEM_DBS.includes(dbName as typeof SYSTEM_DBS[number])) {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "Invalid database or table name" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const conn = await rootPool.getConnection();
    try {
      await conn.query(`USE \`${dbName}\``);
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT * FROM \`${tableName}\` LIMIT 100`
      );

      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return new Response(
        JSON.stringify({ database: dbName, table: tableName, columns, rows }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } finally {
      conn.release();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: "Server Error", message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
