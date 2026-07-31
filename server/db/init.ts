import { hashSync } from "bcryptjs";
import { rootPool, pool } from "./connection.js";

const SALT_ROUNDS = 10;

export const SYSTEM_DBS = [
  "information_schema",
  "mysql",
  "performance_schema",
  "sys",
] as const;

/**
 * Inisialisasi database backup_automation dan seluruh tabel yang diperlukan.
 * Bersifat idempoten: aman dipanggil berulang tanpa efek samping.
 */
export async function initDatabase(): Promise<void> {
  // Buat database jika belum ada
  await rootPool.query(
    "CREATE DATABASE IF NOT EXISTS `backup_automation` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  );

  // Tabel backup_settings (singleton id=1)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS backup_settings (
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

  // Tabel backup_schedules
  await pool.query(`
    CREATE TABLE IF NOT EXISTS backup_schedules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('daily','weekly','monthly') NOT NULL,
      days_of_week VARCHAR(64) NULL,
      days_of_month VARCHAR(64) NULL,
      time_of_day VARCHAR(5) NOT NULL DEFAULT '02:00',
      enabled TINYINT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Tabel backup_logs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS backup_logs (
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

  // Seed baris singleton settings dengan password default yang sudah di-hash
  const defaultPasswordHash = hashSync("admin123", SALT_ROUNDS);
  await pool.query(
    `INSERT IGNORE INTO backup_settings (id, admin_password) VALUES (1, ?)`,
    [defaultPasswordHash]
  );
}
