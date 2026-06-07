import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "../shared/schema";
import { sql } from "drizzle-orm";

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("POSTGRES_URL or DATABASE_URL must be set");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const db = drizzle(pool, { schema });

async function main() {
  console.log("Применение изменений схемы к БД...");

  const tables = [
    { name: "landscape_files", ddl: `
      CREATE TABLE IF NOT EXISTS landscape_files (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'egrn',
        created_at TEXT NOT NULL
      )` },
    { name: "landscape_designs", ddl: `
      CREATE TABLE IF NOT EXISTS landscape_designs (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        questionnaire TEXT NOT NULL,
        generated_image_url TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL
      )` },
    { name: "house_plan_files", ddl: `
      CREATE TABLE IF NOT EXISTS house_plan_files (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'cadastral',
        created_at TEXT NOT NULL
      )` },
    { name: "house_plans", ddl: `
      CREATE TABLE IF NOT EXISTS house_plans (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL UNIQUE,
        cadastral_number TEXT,
        communications_notes TEXT,
        updated_at TEXT NOT NULL
      )` },
  ];

  for (const table of tables) {
    await db.execute(sql.raw(table.ddl));
    console.log(`✓ ${table.name}`);
  }

  console.log("Готово! Все таблицы созданы/обновлены.");
  await pool.end();
}

main().catch((err) => {
  console.error("Ошибка миграции:", err);
  process.exit(1);
});
