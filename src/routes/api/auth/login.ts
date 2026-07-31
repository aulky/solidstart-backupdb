import { type APIEvent } from "@solidjs/start/server";
import { pool } from "../../../../server/db/connection.js";
import { initDatabase } from "../../../../server/db/init.js";
import { verifyPassword } from "../../../../server/services/password.js";
import { signJwt } from "../../../../server/services/auth.js";
import type { RowDataPacket } from "mysql2/promise";

interface SettingsRow extends RowDataPacket {
  admin_username: string;
  admin_password: string;
}

export async function POST(event: APIEvent): Promise<Response> {
  try {
    const body = await event.request.json();
    const { username, password } = body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Username and password are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Pastikan database backup_automation & tabel sudah di-init
    await initDatabase();

    const [rows] = await pool.query<SettingsRow[]>(
      "SELECT admin_username, admin_password FROM backup_settings WHERE id = 1"
    );

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Server Error",
          message: "Admin settings not initialized",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const settings = rows[0];

    if (username !== settings.admin_username) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid username or password",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const passwordValid = await verifyPassword(
      password,
      settings.admin_password
    );
    if (!passwordValid) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid username or password",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = await signJwt(username);
    const isSecure = event.request.url.startsWith("https:");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Login successful",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `session_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${isSecure ? "; Secure" : ""}`,
        },
      }
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
