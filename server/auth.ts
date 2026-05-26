import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePassword(supplied: string, stored: string): Promise<boolean> {
  const dotIndex = stored.indexOf(".");
  if (dotIndex === -1) {
    // plain-text legacy — прямое сравнение для существующих записей до миграции
    return supplied === stored;
  }
  const hash = stored.slice(0, dotIndex);
  const salt = stored.slice(dotIndex + 1);
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hash, "hex"), buf);
}
