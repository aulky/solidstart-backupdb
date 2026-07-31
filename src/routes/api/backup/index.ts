import { type APIEvent } from "@solidjs/start/server";
import { requireAuth } from "../../../../server/middleware/auth.js";
import { runBackup, isBackupRunning } from "../../../../server/services/backup.js";

/**
 * POST /api/backup
 * Trigger backup manual. Mengembalikan 409 jika backup sedang berjalan.
 */
export async function POST(event: APIEvent): Promise<Response> {
  const auth = await requireAuth(event.request);
  if (auth instanceof Response) return auth;

  if (isBackupRunning()) {
    return new Response(
      JSON.stringify({ error: "Conflict", message: "Backup is already running" }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await event.request.json().catch(() => ({}));
    const overrideDbs = (body as { databases?: string[] }).databases;

    // Run backup asynchronously — respond immediately
    const backupPromise = runBackup("manual", overrideDbs);

    // We still await it to report the result in this response
    const result = await backupPromise;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Backup completed",
        folderName: result.folderName,
        results: result.results,
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
