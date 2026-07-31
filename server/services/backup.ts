import { mkdir, writeFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pool, rootPool } from "../db/connection.js";
import { getDiskSpace } from "./disk.js";
import { getEnv } from "../env.js";
import { SYSTEM_DBS, FOLDER_REGEX } from "../shared/constants.js";
import type { RowDataPacket } from "mysql2/promise";

// --- Constants ---
const MIN_FREE_SPACE = 100 * 1024 * 1024; // 100 MB
const BATCH_SIZE = 1000;
const FLUSH_ROW_COUNT = 100;
const FLUSH_BYTE_LIMIT = 45000;

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

// --- Escape SQL value ---
function escapeValue(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  if (typeof val === "bigint") return String(val);
  if (typeof val === "boolean") return val ? "1" : "0";
  if (Buffer.isBuffer(val)) {
    return `X'${val.toString("hex")}'`;
  }
  if (val instanceof Date) {
    return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
  }
  const str = String(val);
  return `'${str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\x00/g, "\\0").replace(/\x1a/g, "\\Z")}'`;
}

// --- Core Dump ---
interface TableRow extends RowDataPacket {
  [key: string]: unknown;
}

async function dumpDatabaseJS(
  dbName: string,
  outputPath: string
): Promise<number> {
  const conn = await rootPool.getConnection();
  try {
    await conn.query(`USE \`${dbName.replace(/`/g, "")}\``);

    // Enumerate base tables only (skip views) — FEATURES.md §3
    const [tables] = await conn.query<RowDataPacket[]>(
      "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'"
    );
    const tableKey = `Tables_in_${dbName}`;

    let sql = `-- BackupDB dump of \`${dbName}\`\n`;
    sql += `-- Generated at ${new Date().toISOString()}\n`;
    sql += `SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const tableRow of tables) {
      const tableName = String(tableRow[tableKey] || Object.values(tableRow)[0]);
      const safeTable = tableName.replace(/`/g, "");

      // DROP + CREATE
      sql += `DROP TABLE IF EXISTS \`${safeTable}\`;\n`;
      const [createResult] = await conn.query<RowDataPacket[]>(
        `SHOW CREATE TABLE \`${safeTable}\``
      );
      if (createResult[0]) {
        const createStmt =
          createResult[0]["Create Table"] || Object.values(createResult[0])[1];
        sql += `${createStmt};\n\n`;
      }

      // INSERT batching
      const [rows] = await conn.query<TableRow[]>(
        `SELECT * FROM \`${safeTable}\``
      );
      if (rows.length === 0) {
        sql += `-- Table \`${safeTable}\` is empty\n\n`;
        continue;
      }

      const columns = Object.keys(rows[0]).filter((k) => k !== "constructor");
      let buffer = "";
      let rowCount = 0;

      for (let i = 0; i < rows.length; i++) {
        if (i % BATCH_SIZE === 0) {
          if (i > 0) {
            buffer += ";\n";
          }
          buffer += `INSERT INTO \`${safeTable}\` (\`${columns.join("`, `")}\`) VALUES\n`;
        } else {
          buffer += ",\n";
        }

        const values = columns.map((col) => escapeValue(rows[i][col]));
        buffer += `(${values.join(", ")})`;
        rowCount++;

        // Flush per FLUSH_ROW_COUNT rows or FLUSH_BYTE_LIMIT bytes
        if (
          rowCount >= FLUSH_ROW_COUNT ||
          buffer.length >= FLUSH_BYTE_LIMIT
        ) {
          sql += buffer;
          buffer = "";
          rowCount = 0;
        }
      }

      if (buffer.length > 0) {
        sql += buffer;
      }
      sql += ";\n\n";
    }

    sql += "SET FOREIGN_KEY_CHECKS = 1;\n";

    await writeFile(outputPath, sql, "utf-8");
    const fileStat = await stat(outputPath);
    return Number(fileStat.size);
  } finally {
    conn.release();
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

  // Only consider directories matching timestamp pattern
  const folders = entries
    .filter((e) => e.isDirectory() && FOLDER_REGEX.test(e.name))
    .map((e) => e.name)
    .sort(); // Lexicographic sort = chronological for YYYY-MM-DD_HHmmss

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
