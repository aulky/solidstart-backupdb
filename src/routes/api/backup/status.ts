import { type APIEvent } from "@solidjs/start/server";
import { requireAuth } from "../../../../server/middleware/auth.js";
import { isBackupRunning } from "../../../../server/services/backup.js";

/**
 * GET /api/backup/status
 * Cek status apakah backup sedang berjalan ({ running: boolean }).
 */
export async function GET(event: APIEvent): Promise<Response> {
  const auth = await requireAuth(event.request);
  if (auth instanceof Response) return auth;

  return new Response(
    JSON.stringify({ running: isBackupRunning() }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
