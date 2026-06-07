import { db } from "./db";
import { users, projects, clients } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seed() {
  const existing = await db.select().from(users);
  if (existing.length > 0) return;

  await db.insert(users).values([
    { id: 1, username: "admin", password: await hashPassword("admin123"), role: "admin" },
    { id: 2, username: "client1", password: await hashPassword("client123"), role: "client" },
    { id: 3, username: "client2", password: await hashPassword("client123"), role: "client" },
  ]);

  await db.insert(clients).values([
    { id: 1, userId: 2, name: "Иванов Иван", phone: "+7 900 000 0001", email: "ivan@example.com" },
    { id: 2, userId: 3, name: "Петров Пётр", phone: "+7 900 000 0002", email: "petr@example.com" },
  ]);

  await db.insert(projects).values([
    { id: 1, name: "Демо", address: "г. Новороссийск, ул. Клеверная, 23", startDate: "2026-01-07", status: "active", clientId: 1 },
    { id: 2, name: "Атамана Матвеева", address: "Борисовка, ул. Ад. Матвеева, 15", startDate: "2026-01-07", status: "active", clientId: 2 },
    { id: 3, name: "Коттедж на Южной", address: "г. Краснодар, ул. Южная, 22", startDate: "2026-02-15", status: "active", clientId: 2 },
  ]);
}
