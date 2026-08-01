/**
 * Validasi nama database/tabel agar aman digunakan dalam query MySQL.
 * Mengizinkan huruf, angka, spasi, underscore, strip, dan titik (1-128 karakter).
 * Melarang backtick, null byte, dan karakter berbahaya untuk mencegah SQL injection.
 */
export function isValidIdentifier(name: string): boolean {
  return (
    typeof name === "string" &&
    name.trim().length > 0 &&
    name.length <= 128 &&
    /^[a-zA-Z0-9_\-\s\.]+$/.test(name) &&
    !name.includes("`") &&
    !name.includes("\0")
  );
}

/**
 * Sanitasi nama identifier — hapus backtick dan validasi.
 * Mengembalikan nama bersih atau null jika invalid.
 */
export function sanitizeIdentifier(name: string | undefined): string | null {
  if (!name) return null;
  const clean = name.replace(/`/g, "").trim();
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
