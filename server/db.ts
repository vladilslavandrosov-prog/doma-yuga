import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const connectionString =
  process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "POSTGRES_URL (или DATABASE_URL) не задан. Укажите полную строку подключения к PostgreSQL в переменных окружения."
  );
}

if (!/^postgres(ql)?:\/\//.test(connectionString)) {
  throw new Error(
    `Значение POSTGRES_URL/DATABASE_URL должно начинаться с postgresql:// — сейчас: "${connectionString}"`
  );
}

const pool = new pg.Pool({ connectionString });

export const db = drizzle(pool, { schema });
export { pool };
