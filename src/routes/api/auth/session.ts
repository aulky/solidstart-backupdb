import { type APIEvent } from "@solidjs/start/server";
import { getSessionFromCookie } from "../../../../server/services/auth.js";
import { verifyPassword } from "../../../../server/services/password.js";
import { pool } from "../../../../server/db/connection.js";
import { initDatabase } from "../../../../server/db/init.js";
import type { RowDataPacket } from "mysql2/promise";

interface SettingsRow extends RowDataPacket {
  admin_password: string;
}

/**
 * GET /api/auth/session
 * Memverifikasi status sesi aktif dari cookie JWT server-side.
 * Juga mengecek apakah password admin masih menggunakan default ("admin123").
 */
export async function GET(event: APIEvent): Promise<Response> {
  const session = await getSessionFromCookie(event.request);

  if (!session) {
    return new Response(
      JSON.stringify({ authenticated: false }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Cek apakah password masih default "admin123"
  let isDefaultPassword = false;
  try {
    await initDatabase();
    const [rows] = await pool.query<SettingsRow[]>(
      "SELECT admin_password FROM backup_settings WHERE id = 1"
    );
    if (rows && rows.length > 0) {
      isDefaultPassword = await verifyPassword("admin123", rows[0].admin_password);
    }
  } catch {
    // Jika DB belum di-init / error, abaikan check default password
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      user: {
        username: session.sub,
        role: session.role,
      },
      isDefaultPassword,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * POST /api/auth/session
 * Logout: Menghapus cookie session_token dengan mengeset Max-Age=0.
 */
export async function POST(): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, message: "Logged out successfully" }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": "session_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0",
      },
    }
  );
}
