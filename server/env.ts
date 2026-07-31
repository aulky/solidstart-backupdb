import { z } from "zod/v4";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Membaca file .env dari root direktori kerja dan memasukkannya ke process.env
 * jika variabel tersebut belum terdefinisi di lingkungan OS.
 */
function loadEnvFile(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!(key in process.env)) {
          process.env[key] = val;
        }
      }
    }
  } catch {
    // Abaikan jika error membaca file
  }
}

const envSchema = z.object({
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().min(1, "DB_USER is required in .env"),
  DB_PASSWORD: z.string().default(""),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long in .env"),
  BACKUP_DIR: z.string().default("./backups"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Validasi & cache environment variables.
 * Membaca .env lalu menvalidasi variabel wajib secara ketat (fail-fast).
 */
export function getEnv(): Env {
  if (_env) return _env;

  // Load file .env jika ada
  loadEnvFile();

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Environment validation failed:\n${formatted}\n\nPlease check your .env file.`
    );
  }

  _env = result.data;
  return _env;
}
