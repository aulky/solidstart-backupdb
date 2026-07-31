import mysql from "mysql2/promise";

function getEnv(key: string, defaultValue: string = ""): string {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
}

const DB_HOST = getEnv("DB_HOST", "localhost");
const DB_PORT = parseInt(getEnv("DB_PORT", "3306"), 10);
const DB_USER = getEnv("DB_USER", "root");
const DB_PASSWORD = getEnv("DB_PASSWORD", "");
const DB_NAME = "backup_automation";

// Pool utama terikat ke database backup_automation
export const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Pool root tanpa database spesifik (digunakan untuk query lintas DB & init)
export const rootPool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
