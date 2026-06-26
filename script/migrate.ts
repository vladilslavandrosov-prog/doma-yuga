import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("POSTGRES_URL or DATABASE_URL must be set");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const db = drizzle(pool, { schema });

async function main() {
  console.log("Применение изменений схемы к БД...");

  // Обновить адрес демо-проекта
  await db.execute(sql`UPDATE projects SET address = 'г. Новороссийск, ул. Клеверная, 23' WHERE id = 1`);
  console.log("✓ адрес демо-проекта обновлён");

  // Обновить пароль admin
  const newHash = await bcrypt.hash("admin1q2w3e", 10);
  await db.execute(sql`UPDATE users SET password = ${newHash} WHERE username = 'admin'`);
  console.log("✓ пароль admin обновлён");

  console.log("Готово! Все таблицы созданы/обновлены.");
  await pool.end();
}

main().catch((err) => {
  console.error("Ошибка миграции:", err);
  process.exit(1);
});
