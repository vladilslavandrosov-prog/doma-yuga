import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

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
    // Скачиваем демо-изображение с Pollinations.ai
    let demoImageUrl: string | null = null;
    try {
      const uploadsDir = path.resolve("uploads");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const demoPrompt = encodeURIComponent(
        "modern minimalist landscape design, cottage garden, gazebo, tile paths, conifer trees, hydrangeas, lawn, soft lighting, aerial view, photorealistic"
      );
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${demoPrompt}?width=800&height=600&nologo=true&seed=42`;
      console.log("Скачиваю демо-изображение ландшафта...");
      const imgRes = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(60000) });
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const filename = `landscape-demo-${Date.now()}.jpg`;
        fs.writeFileSync(path.join(uploadsDir, filename), buffer);
        demoImageUrl = `/uploads/${filename}`;
        console.log(`✓ демо-изображение сохранено: ${demoImageUrl}`);
      }
    } catch (e) {
      console.log("⚠ не удалось скачать демо-изображение, дизайн будет без картинки");
    }

    await db.execute(sql`
      INSERT INTO landscape_designs (project_id, questionnaire, generated_image_url, status, created_at)
      VALUES (
        1,
        '{"style":"modern minimalist","area":"600","plants":"Газон, хвойные деревья, гортензии","features":"Беседка, дорожки из плитки, освещение","colors":"Зелёный, серый, белый","budget":"moderate","wishes":"Детская площадка в углу участка"}',
        ${demoImageUrl},
        'done',
        '2026-01-15T10:00:00'
      )
    `);
    console.log("✓ тестовый ландшафтный дизайн добавлен");
  } else {
    // Если дизайн есть, но без изображения — скачать и обновить
    const designWithoutImage = await db.execute(sql`SELECT id FROM landscape_designs WHERE project_id = 1 AND generated_image_url IS NULL LIMIT 1`);
    if (designWithoutImage.rows.length > 0) {
      try {
        const uploadsDir = path.resolve("uploads");
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const demoPrompt = encodeURIComponent(
          "modern minimalist landscape design, cottage garden, gazebo, tile paths, conifer trees, hydrangeas, lawn, soft lighting, aerial view, photorealistic"
        );
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${demoPrompt}?width=800&height=600&nologo=true&seed=42`;
        console.log("Скачиваю демо-изображение для существующего дизайна...");
        const imgRes = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(60000) });
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const filename = `landscape-demo-${Date.now()}.jpg`;
          fs.writeFileSync(path.join(uploadsDir, filename), buffer);
          const demoImageUrl = `/uploads/${filename}`;
          const designId = (designWithoutImage.rows[0] as any).id;
          await db.execute(sql`UPDATE landscape_designs SET generated_image_url = ${demoImageUrl}, status = 'done' WHERE id = ${designId}`);
          console.log(`✓ обновлено демо-изображение: ${demoImageUrl}`);
        }
      } catch (e) {
        console.log("⚠ не удалось обновить демо-изображение");
      }
    }
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
