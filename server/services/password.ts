import { hash, compare } from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Melakukan hashing pada password plaintext menggunakan bcrypt.
 */
export async function hashPassword(plainText: string): Promise<string> {
  return hash(plainText, SALT_ROUNDS);
}

/**
 * Memverifikasi apakah password plaintext cocok dengan hash bcrypt.
 */
export async function verifyPassword(
  plainText: string,
  hashed: string
): Promise<boolean> {
  if (!plainText || !hashed) return false;
  return compare(plainText, hashed);
}
