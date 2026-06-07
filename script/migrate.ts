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

  // Тестовые данные для демо (только если ещё нет ни одного дизайна для проекта 1)
  const existingDesigns = await db.execute(sql`SELECT id FROM landscape_designs WHERE project_id = 1 LIMIT 1`);
  if (existingDesigns.rows.length === 0) {
    await db.execute(sql`
      INSERT INTO landscape_designs (project_id, questionnaire, generated_image_url, status, created_at)
      VALUES (
        1,
        '{"style":"modern minimalist","area":"600","plants":"Газон, хвойные деревья, гортензии","features":"Беседка, дорожки из плитки, освещение","colors":"Зелёный, серый, белый","budget":"moderate","wishes":"Детская площадка в углу участка"}',
        'https://image.pollinations.ai/prompt/modern%20minimalist%20landscape%20design%20Russian%20residential%20garden%2C%20lawn%2C%20conifer%20trees%2C%20hydrangeas%2C%20gazebo%2C%20stone%20path%2C%20outdoor%20lighting%2C%20green%20grey%20white%20palette%2C%20photorealistic%2C%20aerial%20bird%20eye%20view%2C%20high%20quality?width=800&height=600&nologo=true&seed=42',
        'done',
        '2026-01-15T10:00:00'
      )
    `);
    console.log("✓ тестовый ландшафтный дизайн добавлен");
  }

  const existingPlan = await db.execute(sql`SELECT id FROM house_plans WHERE project_id = 1 LIMIT 1`);
  if (existingPlan.rows.length === 0) {
    await db.execute(sql`
      INSERT INTO house_plans (project_id, cadastral_number, communications_notes, updated_at)
      VALUES (
        1,
        '23:43:0141003:123',
        'Газ — от ул. Демонстрационной
Вода — централизованное водоснабжение
Электричество — 15 кВт, однофазное
Канализация — централизованная',
        '2026-01-15T10:00:00'
      )
    `);
    console.log("✓ тестовый план дома добавлен");
  }

  console.log("Готово! Все таблицы созданы/обновлены.");
  await pool.end();
}

main().catch((err) => {
  console.error("Ошибка миграции:", err);
  process.exit(1);
});
