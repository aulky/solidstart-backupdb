import { hashPasswordSync } from "../services/password.js";
import { rootPool } from "./connection.js";

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Inisialisasi database backup_automation dan seluruh tabel yang diperlukan.
 * Bersifat idempoten & thread-safe: hanya berjalan sekali saat startup.
 */
export async function initDatabase(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // 1. Buat database jika belum ada (menggunakan rootPool)
    await rootPool.query(
      "CREATE DATABASE IF NOT EXISTS `backup_automation` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );

    // 2. Buat tabel backup_settings via rootPool dengan prefix DB
    await rootPool.query(`
      CREATE TABLE IF NOT EXISTS backup_automation.backup_settings (
        id INT PRIMARY KEY DEFAULT 1,
        retention_limit INT NOT NULL DEFAULT 10,
        backup_dir VARCHAR(512) NOT NULL DEFAULT './backups',
        backup_all TINYINT NOT NULL DEFAULT 1,
        selected_dbs TEXT NULL,
        last_run_success DATETIME NULL,
        last_run_fail DATETIME NULL,
        admin_username VARCHAR(128) NOT NULL DEFAULT 'admin',
        admin_password VARCHAR(255) NOT NULL,
        CONSTRAINT chk_singleton CHECK (id = 1)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. Buat tabel backup_schedules
    await rootPool.query(`
      CREATE TABLE IF NOT EXISTS backup_automation.backup_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('daily','weekly','monthly') NOT NULL,
        days_of_week VARCHAR(64) NULL,
        days_of_month VARCHAR(64) NULL,
        time_of_day VARCHAR(5) NOT NULL DEFAULT '02:00',
        enabled TINYINT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 4. Buat tabel backup_logs
    await rootPool.query(`
      CREATE TABLE IF NOT EXISTS backup_automation.backup_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        db_name VARCHAR(128) NOT NULL,
        executed_at DATETIME NOT NULL,
        type ENUM('scheduled','manual','retention') NOT NULL,
        status ENUM('success','failed') NOT NULL,
        file_size BIGINT NOT NULL DEFAULT 0,
        error_message TEXT NULL,
        folder_name VARCHAR(256) NOT NULL,
        INDEX idx_executed_at (executed_at DESC),
        INDEX idx_folder (folder_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 5. Seed baris singleton settings dengan password default yang sudah di-hash
    const defaultPasswordHash = hashPasswordSync("admin123");
    await rootPool.query(
      `INSERT IGNORE INTO backup_automation.backup_settings (id, admin_password) VALUES (1, ?)`,
      [defaultPasswordHash]
    );

    isInitialized = true;
  })();

  try {
    await initPromise;
  } catch (err) {
    initPromise = null; // Reset promise agar bisa dicoba lagi jika gagal
    throw err;
  }
}
