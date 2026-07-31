import { hash as bcryptHash, hashSync as bcryptHashSync } from "bcryptjs";
import { SALT_ROUNDS } from "../shared/constants.js";

/**
 * Melakukan hashing pada password plaintext menggunakan bcrypt.
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcryptHash(plainText, SALT_ROUNDS);
}

/**
 * Melakukan hashing sinkron pada password (hanya untuk seed awal).
 */
export function hashPasswordSync(plainText: string): string {
  return bcryptHashSync(plainText, SALT_ROUNDS);
}

/**
 * Memverifikasi apakah password plaintext cocok dengan hash bcrypt.
 */
export async function verifyPassword(
  plainText: string,
  hashed: string
): Promise<boolean> {
  if (!plainText || !hashed) return false;
  const { compare } = await import("bcryptjs");
  return compare(plainText, hashed);
}
