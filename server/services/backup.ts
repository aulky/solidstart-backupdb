import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { pool, rootPool } from "../db/connection.js";
import { getDiskSpace } from "./disk.js";
import { getEnv } from "../env.js";
import { SYSTEM_DBS, FOLDER_REGEX } from "../shared/constants.js";
import type { RowDataPacket } from "mysql2/promise";

// --- Constants ---
const MIN_FREE_SPACE = 100 * 1024 * 1024; // 100 MB

// --- Concurrency Flag ---
let backupRunning = false;

export function isBackupRunning(): boolean {
  return backupRunning;
}

// --- Timestamp ---
export function formatTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

/**
 * Pure JS mirror of mysqldump using mysql2 connection queries & conn.escape().
 * Adopted directly from solid-automation-backupdb reference project for 100% precision.
 */
async function dumpDatabaseJS(dbName: string, outFilePath: string): Promise<number> {
  const env = getEnv();

  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: dbName,
    dateStrings: true,
  });

  try {
    let sqlContent = "";

    // SQL Header
    sqlContent += `-- JS MySQL Dump Mirror\n`;
    sqlContent += `-- Host: ${env.DB_HOST}    Database: ${dbName}\n`;
    sqlContent += `-- ------------------------------------------------------\n\n`;
    sqlContent += `/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;\n`;
    sqlContent += `/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;\n`;
    sqlContent += `/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;\n`;
    sqlContent += `/*!40101 SET NAMES utf8mb4 */;\n`;
    sqlContent += `/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;\n`;
    sqlContent += `/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;\n`;
    sqlContent += `/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;\n`;
    sqlContent += `/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;\n`;
    sqlContent += `SET AUTOCOMMIT = 0;\n`;
    sqlContent += `START TRANSACTION;\n\n`;

    // Fetch all BASE TABLES in database
    const [tablesRows] = await conn.query<RowDataPacket[]>("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
    const tables = tablesRows.map((row) => String(Object.values(row)[0]));

    for (const table of tables) {
      if (!table || table === "BASE TABLE") continue;

      sqlContent += `--\n`;
      sqlContent += `-- Table structure for table \`${table}\`\n`;
      sqlContent += `--\n\n`;
      sqlContent += `DROP TABLE IF EXISTS \`${table}\`;\n`;

      // Get Table DDL Structure
      const [createRows] = await conn.query<RowDataPacket[]>(`SHOW CREATE TABLE \`${table}\``);
      if (createRows && createRows[0]) {
        const createTableSql = (createRows[0]["Create Table"] || Object.values(createRows[0])[1]) as string;
        sqlContent += `${createTableSql};\n\n`;
      }

      // Get Table Data Dumps
      sqlContent += `--\n`;
      sqlContent += `-- Dumping data for table \`${table}\`\n`;
      sqlContent += `--\n\n`;
      sqlContent += `LOCK TABLES \`${table}\` WRITE;\n`;
      sqlContent += `/*!40000 ALTER TABLE \`${table}\` DISABLE KEYS */;\n`;

      // Stream rows in batches to handle large tables without hanging memory
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const [dataRows] = await conn.query<RowDataPacket[]>(
          `SELECT * FROM \`${table}\` LIMIT ? OFFSET ?`,
          [batchSize, offset]
        );
        const rows = dataRows as Array<Record<string, unknown>>;

        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        const insertPrefix = `INSERT INTO \`${table}\` VALUES `;
        let chunk: string[] = [];
        let chunkBytes = 0;

        for (const row of rows) {
          const values = Object.values(row)
            .map((val) => conn.escape(val))
            .join(",");
          const rowStr = `(${values})`;

          // Standard chunk limits (100 rows or 45KB per statement)
          if (chunk.length > 0 && (chunk.length >= 100 || chunkBytes + rowStr.length >= 45000)) {
            sqlContent += `${insertPrefix}${chunk.join(",\n")};\n`;
            chunk = [];
            chunkBytes = 0;
          }
          chunk.push(rowStr);
          chunkBytes += rowStr.length;
        }

        if (chunk.length > 0) {
          sqlContent += `${insertPrefix}${chunk.join(",\n")};\n`;
        }

        offset += rows.length;
        if (rows.length < batchSize) {
          hasMore = false;
        }
      }

      sqlContent += `/*!40000 ALTER TABLE \`${table}\` ENABLE KEYS */;\n`;
      sqlContent += `UNLOCK TABLES;\n\n`;
    }

    // SQL Footer
    sqlContent += `COMMIT;\n`;
    sqlContent += `/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;\n`;
    sqlContent += `/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;\n`;
    sqlContent += `/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;\n`;
    sqlContent += `/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;\n`;
    sqlContent += `/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;\n`;
    sqlContent += `/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;\n`;
    sqlContent += `/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;\n`;

    await writeFile(outFilePath, sqlContent, "utf8");
    const fileStat = await stat(outFilePath);
    return Number(fileStat.size);
  } finally {
    await conn.end();
  }
}

// --- Resolve Target Databases ---
export async function resolveTargetDatabases(
  overrideDbs?: string[]
): Promise<string[]> {
  if (overrideDbs && overrideDbs.length > 0) {
    return overrideDbs.filter((db) => !(SYSTEM_DBS as readonly string[]).includes(db));
  }

  const [settings] = await pool.query<RowDataPacket[]>(
    "SELECT backup_all, selected_dbs FROM backup_settings WHERE id = 1"
  );

  if (!settings || settings.length === 0) {
    throw new Error("Backup settings not initialized");
  }

  const row = settings[0];

  if (row.backup_all) {
    const [dbs] = await rootPool.query<RowDataPacket[]>("SHOW DATABASES");
    return dbs
      .map((d) => String(Object.values(d)[0]))
      .filter((db) => !(SYSTEM_DBS as readonly string[]).includes(db) && db !== "backup_automation");
  }

  if (row.selected_dbs) {
    try {
      const parsed = JSON.parse(row.selected_dbs as string) as string[];
      return parsed.filter((db) => !(SYSTEM_DBS as readonly string[]).includes(db));
    } catch {
      throw new Error("Invalid selected_dbs format in settings");
    }
  }

  return [];
}

// --- Run Backup ---
export async function runBackup(
  type: "manual" | "scheduled",
  overrideDbs?: string[]
): Promise<{ folderName: string; results: Array<{ db: string; status: string; size: number; error?: string }> }> {
  if (backupRunning) {
    throw new Error("Backup is already running");
  }

  backupRunning = true;
  const folderName = formatTimestamp();
  const results: Array<{ db: string; status: string; size: number; error?: string }> = [];

  try {
    const env = getEnv();
    const backupDir = path.resolve(env.BACKUP_DIR);
    const folderPath = path.join(backupDir, folderName);

    // Check disk space
    const disk = await getDiskSpace(backupDir);
    if (disk.freeBytes < MIN_FREE_SPACE) {
      throw new Error(
        `Insufficient disk space: ${Math.round(disk.freeBytes / 1024 / 1024)} MB free, need at least 100 MB`
      );
    }

    // Resolve target databases
    const targetDbs = await resolveTargetDatabases(overrideDbs);
    if (targetDbs.length === 0) {
      throw new Error("No databases selected for backup");
    }

    // Create backup folder
    await mkdir(folderPath, { recursive: true });

    // Dump each database
    for (const dbName of targetDbs) {
      const outputPath = path.join(folderPath, `${dbName}.sql`);
      try {
        const fileSize = await dumpDatabaseJS(dbName, outputPath);
        results.push({ db: dbName, status: "success", size: fileSize });

        await pool.query(
          `INSERT INTO backup_logs (db_name, executed_at, type, status, file_size, folder_name)
           VALUES (?, NOW(), ?, 'success', ?, ?)`,
          [dbName, type, fileSize, folderName]
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        results.push({ db: dbName, status: "failed", size: 0, error: errorMsg });

        await pool.query(
          `INSERT INTO backup_logs (db_name, executed_at, type, status, file_size, error_message, folder_name)
           VALUES (?, NOW(), ?, 'failed', 0, ?, ?)`,
          [dbName, type, errorMsg, folderName]
        );
      }
    }

    // Update last_run timestamp
    const hasFailure = results.some((r) => r.status === "failed");
    const hasSuccess = results.some((r) => r.status === "success");
    if (hasSuccess) {
      await pool.query(
        "UPDATE backup_settings SET last_run_success = NOW() WHERE id = 1"
      );
    }
    if (hasFailure) {
      await pool.query(
        "UPDATE backup_settings SET last_run_fail = NOW() WHERE id = 1"
      );
    }

    // Apply retention after successful backup
    const [settingsRows] = await pool.query<RowDataPacket[]>(
      "SELECT retention_limit, backup_dir FROM backup_settings WHERE id = 1"
    );
    if (settingsRows[0]) {
      await applyRetention(backupDir, settingsRows[0].retention_limit as number);
    }

    return { folderName, results };
  } finally {
    backupRunning = false;
  }
}

// --- Retention Engine (FIFO) ---
export async function applyRetention(
  backupDir: string,
  limit: number
): Promise<void> {
  const entries = await readdir(backupDir, { withFileTypes: true });

  const folders = entries
    .filter((e) => e.isDirectory() && FOLDER_REGEX.test(e.name))
    .map((e) => e.name)
    .sort();

  if (folders.length <= limit) return;

  const foldersToDelete = folders.slice(0, folders.length - limit);

  for (const folderName of foldersToDelete) {
    const folderPath = path.join(backupDir, folderName);
    await rm(folderPath, { recursive: true, force: true });

    await pool.query(
      `INSERT INTO backup_logs (db_name, executed_at, type, status, file_size, folder_name)
       VALUES ('_system', NOW(), 'retention', 'success', 0, ?)`,
      [folderName]
    );
  }
}
