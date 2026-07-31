import { type APIEvent } from "@solidjs/start/server";
import { pool } from "../../../server/db/connection.js";
import { requireAuth } from "../../../server/middleware/auth.js";
import { getDiskSpace } from "../../../server/services/disk.js";
import { syncSchedules } from "../../../server/services/scheduler.js";
import { hashPassword } from "../../../server/services/password.js";
import type { RowDataPacket } from "mysql2/promise";

interface SettingsRow extends RowDataPacket {
  id: number;
  retention_limit: number;
  backup_dir: string;
  backup_all: number;
  selected_dbs: string | null;
  last_run_success: string | null;
  last_run_fail: string | null;
  admin_username: string;
  admin_password: string;
}

/**
 * GET /api/settings
 * Mengembalikan seluruh pengaturan aplikasi + info disk space.
 */
export async function GET(event: APIEvent): Promise<Response> {
  const auth = await requireAuth(event.request);
  if (auth instanceof Response) return auth;

  try {
    const [rows] = await pool.query<SettingsRow[]>(
      "SELECT * FROM backup_settings WHERE id = 1"
    );

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Settings not initialized" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const settings = rows[0];

    // Get disk info
    let disk = { freeBytes: 0, totalBytes: 0 };
    try {
      disk = await getDiskSpace(settings.backup_dir);
    } catch {
      // Disk info unavailable — return zeros
    }

    // Get schedules
    const [schedules] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM backup_schedules ORDER BY created_at DESC"
    );

    // Safe JSON parse — Audit #14
    let parsedDbs: string[] = [];
    if (settings.selected_dbs) {
      try {
        parsedDbs = JSON.parse(settings.selected_dbs);
      } catch {
        parsedDbs = [];
      }
    }

    return new Response(
      JSON.stringify({
        settings: {
          retention_limit: settings.retention_limit,
          backup_dir: settings.backup_dir,
          backup_all: settings.backup_all,
          selected_dbs: parsedDbs,
          last_run_success: settings.last_run_success,
          last_run_fail: settings.last_run_fail,
          admin_username: settings.admin_username,
        },
        schedules,
        disk,
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

/**
 * POST /api/settings
 * Memperbarui pengaturan parsial + menyinkronkan scheduler.
 */
export async function POST(event: APIEvent): Promise<Response> {
  const auth = await requireAuth(event.request);
  if (auth instanceof Response) return auth;

  try {
    const body = await event.request.json();
    const updates: string[] = [];
    const values: unknown[] = [];

    // General settings
    if (body.retention_limit !== undefined) {
      const limit = Number(body.retention_limit);
      if (isNaN(limit) || limit < 1) {
        return new Response(
          JSON.stringify({ error: "retention_limit must be a positive number" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      updates.push("retention_limit = ?");
      values.push(limit);
    }

    if (body.backup_dir !== undefined) {
      updates.push("backup_dir = ?");
      values.push(String(body.backup_dir));
    }

    if (body.backup_all !== undefined) {
      updates.push("backup_all = ?");
      values.push(body.backup_all ? 1 : 0);
    }

    if (body.selected_dbs !== undefined) {
      updates.push("selected_dbs = ?");
      values.push(JSON.stringify(body.selected_dbs));
    }

    // Admin security
    if (body.admin_username !== undefined) {
      const username = String(body.admin_username).trim();
      if (username.length < 1) {
        return new Response(
          JSON.stringify({ error: "admin_username cannot be empty" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      updates.push("admin_username = ?");
      values.push(username);
    }

    if (body.admin_password !== undefined) {
      const password = String(body.admin_password);
      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: "admin_password must be at least 6 characters" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const hashed = await hashPassword(password);
      updates.push("admin_password = ?");
      values.push(hashed);
    }

    // Schedule CRUD
    if (body.schedule) {
      const s = body.schedule;
      if (s.action === "create") {
        await pool.query(
          `INSERT INTO backup_schedules (type, days_of_week, days_of_month, time_of_day, enabled)
           VALUES (?, ?, ?, ?, ?)`,
          [
            s.type || "daily",
            s.days_of_week || null,
            s.days_of_month || null,
            s.time_of_day || "02:00",
            s.enabled !== undefined ? (s.enabled ? 1 : 0) : 1,
          ]
        );
      } else if (s.action === "update" && s.id) {
        const schedUpdates: string[] = [];
        const schedValues: unknown[] = [];
        if (s.type !== undefined) { schedUpdates.push("type = ?"); schedValues.push(s.type); }
        if (s.days_of_week !== undefined) { schedUpdates.push("days_of_week = ?"); schedValues.push(s.days_of_week); }
        if (s.days_of_month !== undefined) { schedUpdates.push("days_of_month = ?"); schedValues.push(s.days_of_month); }
        if (s.time_of_day !== undefined) { schedUpdates.push("time_of_day = ?"); schedValues.push(s.time_of_day); }
        if (s.enabled !== undefined) { schedUpdates.push("enabled = ?"); schedValues.push(s.enabled ? 1 : 0); }
        if (schedUpdates.length > 0) {
          schedValues.push(s.id);
          await pool.query(
            `UPDATE backup_schedules SET ${schedUpdates.join(", ")} WHERE id = ?`,
            schedValues
          );
        }
      } else if (s.action === "delete" && s.id) {
        await pool.query("DELETE FROM backup_schedules WHERE id = ?", [s.id]);
      }
    }

    // Apply general settings update
    if (updates.length > 0) {
      values.push(1); // WHERE id = 1
      await pool.query(
        `UPDATE backup_settings SET ${updates.join(", ")} WHERE id = ?`,
        values
      );
    }

    // Sync scheduler after any change
    await syncSchedules();

    return new Response(
      JSON.stringify({ success: true, message: "Settings updated" }),
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
