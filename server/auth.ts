import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password with bcrypt.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a stored value.
 * Supports both bcrypt hashes and legacy plaintext passwords
 * (for transparent migration: returns true on match, caller
 *  is expected to upgrade the stored hash afterwards).
 */
export async function verifyPassword(
  plaintext: string,
  stored: string,
): Promise<boolean> {
  if (stored.startsWith("$2")) {
    // bcrypt hash
    return bcrypt.compare(plaintext, stored);
  }
  // Legacy plaintext — direct comparison, will be upgraded on next login
  return plaintext === stored;
}

/**
 * Returns true when the stored value is already a bcrypt hash.
 */
export function isHashedPassword(stored: string): boolean {
  return stored.startsWith("$2");
}
