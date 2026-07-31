import cron, { type ScheduledTask } from "node-cron";
import { pool } from "../db/connection.js";
import { runBackup } from "./backup.js";
import type { RowDataPacket } from "mysql2/promise";

interface ScheduleRow extends RowDataPacket {
  id: number;
  type: "daily" | "weekly" | "monthly";
  days_of_week: string | null;
  days_of_month: string | null;
  time_of_day: string;
  enabled: number;
}

// Active in-memory cron tasks map — FEATURES.md §3
const activeTasks = new Map<number, ScheduledTask>();

/**
 * Membangun ekspresi cron dari schedule row.
 * Daily:   mm hh * * *
 * Weekly:  mm hh * * dow
 * Monthly: mm hh dom * *
 */
export function buildCronExpression(
  type: "daily" | "weekly" | "monthly",
  timeOfDay: string,
  opts?: { daysOfWeek?: string | null; daysOfMonth?: string | null }
): string | null {
  const [hhStr, mmStr] = timeOfDay.split(":");
  const hh = parseInt(hhStr || "0", 10);
  const mm = parseInt(mmStr || "0", 10);

  if (isNaN(hh) || isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return null;
  }

  switch (type) {
    case "daily":
      return `${mm} ${hh} * * *`;
    case "weekly": {
      const dow = opts?.daysOfWeek || "1"; // Default Monday
      return `${mm} ${hh} * * ${dow}`;
    }
    case "monthly": {
      const dom = opts?.daysOfMonth || "1"; // Default 1st of month
      return `${mm} ${hh} ${dom} * *`;
    }
    default:
      return null;
  }
}

/**
 * Menghentikan semua task cron aktif dan menyinkronkan ulang seluruh task
 * dari tabel backup_schedules di database.
 */
export async function syncSchedules(): Promise<void> {
  // Stop and clear all existing tasks
  for (const [id, task] of activeTasks) {
    task.stop();
    activeTasks.delete(id);
  }

  try {
    const [rows] = await pool.query<ScheduleRow[]>(
      "SELECT * FROM backup_schedules WHERE enabled = 1"
    );

    for (const row of rows) {
      const expr = buildCronExpression(row.type, row.time_of_day, {
        daysOfWeek: row.days_of_week,
        daysOfMonth: row.days_of_month,
      });

      if (!expr || !cron.validate(expr)) {
        console.warn(
          `[Scheduler] Invalid cron expression for schedule ID ${row.id}: ${expr}`
        );
        continue;
      }

      const task = cron.schedule(expr, async () => {
        console.log(
          `[Scheduler] Triggering scheduled backup for schedule ID ${row.id}`
        );
        try {
          await runBackup("scheduled");
        } catch (err) {
          console.error(
            `[Scheduler] Error running scheduled backup (ID ${row.id}):`,
            err
          );
        }
      });

      activeTasks.set(row.id, task);
    }
  } catch (err) {
    console.error("[Scheduler] Failed to sync schedules from database:", err);
  }
}
