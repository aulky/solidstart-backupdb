import { initDatabase } from "../db/init.js";
import { syncSchedules } from "../services/scheduler.js";

/**
 * Server Bootstrap Plugin (Nitro Lifecycle)
 *
 * Urutan:
 * 1. Validasi env (dilakukan oleh getEnv() saat module pertama di-import)
 * 2. Inisialisasi database (CREATE DATABASE/TABLE IF NOT EXISTS + seed)
 * 3. Sinkronisasi scheduler (membaca backup_schedules, register cron tasks)
 */
export default async function bootstrap() {
  try {
    console.log("[Bootstrap] Initializing database...");
    await initDatabase();
    console.log("[Bootstrap] Database initialized successfully.");

    console.log("[Bootstrap] Syncing backup schedules...");
    await syncSchedules();
    console.log("[Bootstrap] Scheduler synced successfully.");

    console.log("[Bootstrap] BackupDB server is ready.");
  } catch (error) {
    console.error("[Bootstrap] FATAL: Server initialization failed:", error);
    // Don't crash the server — allow health checks to fail gracefully
    // In production, this should trigger an alert
  }
}
