/**
 * Validasi nama database/tabel agar hanya mengandung karakter aman.
 * Mencegah SQL injection via template literal backtick quoting.
 */
export function isValidIdentifier(name: string): boolean {
  return /^[a-zA-Z0-9_\-]+$/.test(name) && name.length > 0 && name.length <= 128;
}

/**
 * Sanitasi nama identifier — hapus backtick dan validasi.
 * Mengembalikan nama bersih atau null jika invalid.
 */
export function sanitizeIdentifier(name: string | undefined): string | null {
  if (!name) return null;
  const clean = name.replace(/`/g, "");
  return isValidIdentifier(clean) ? clean : null;
}

/** Daftar database sistem yang dikecualikan dari backup & explorer */
export const SYSTEM_DBS = [
  "information_schema",
  "mysql",
  "performance_schema",
  "sys",
] as const;

/** Regex nama folder backup timestamp */
export const FOLDER_REGEX = /^\d{4}-\d{2}-\d{2}_\d{6}$/;

/** Konstanta bcrypt */
export const SALT_ROUNDS = 10;
