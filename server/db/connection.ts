import mysql from "mysql2/promise";
import { getEnv } from "../env.js";

const env = getEnv();

// Pool utama terikat ke database backup_automation
export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: "backup_automation",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Pool root tanpa database spesifik (digunakan untuk query lintas DB & init)
export const rootPool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
