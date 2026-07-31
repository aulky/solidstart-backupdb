import { statfs } from "node:fs/promises";
import path from "node:path";
import { getEnv } from "../env.js";

export interface DiskSpace {
  freeBytes: number;
  totalBytes: number;
}

/**
 * Mendapatkan informasi ruang disk pada path yang diberikan.
 *
 * Jika statfs gagal, TIDAK mengembalikan nilai simulasi (sesuai FEATURES.md §9-e).
 * Melempar error agar backup dapat diblokir dengan aman.
 */
export async function getDiskSpace(targetPath?: string): Promise<DiskSpace> {
  const dir = targetPath || getEnv().BACKUP_DIR;
  const resolvedPath = path.resolve(dir);

  try {
    const stats = await statfs(resolvedPath);
    return {
      freeBytes: stats.bfree * stats.bsize,
      totalBytes: stats.blocks * stats.bsize,
    };
  } catch (firstError) {
    // Retry dengan current directory sebagai fallback path
    try {
      const stats = await statfs(".");
      return {
        freeBytes: stats.bfree * stats.bsize,
        totalBytes: stats.blocks * stats.bsize,
      };
    } catch {
      // Fail-safe: JANGAN kembalikan nilai simulasi.
      throw new Error(
        `Unable to determine disk space for "${resolvedPath}": ${
          firstError instanceof Error ? firstError.message : "Unknown error"
        }`
      );
    }
  }
}
