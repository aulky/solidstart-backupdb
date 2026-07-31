import { type APIEvent } from "@solidjs/start/server";
import { rootPool } from "../../../server/db/connection.js";
import { requireAuth } from "../../../server/middleware/auth.js";
import { SYSTEM_DBS } from "../../../server/shared/constants.js";
import type { RowDataPacket } from "mysql2/promise";

/**
 * GET /api/databases
 * Daftar seluruh database non-sistem di MySQL server.
 */
export async function GET(event: APIEvent): Promise<Response> {
  const auth = await requireAuth(event.request);
  if (auth instanceof Response) return auth;

  try {
    const [rows] = await rootPool.query<RowDataPacket[]>("SHOW DATABASES");
    const databases = rows
      .map((r) => String(Object.values(r)[0]))
      .filter((db) => !(SYSTEM_DBS as readonly string[]).includes(db));

    return new Response(
      JSON.stringify({ databases }),
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
