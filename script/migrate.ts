import { Pool } from "pg";

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("POSTGRES_URL or DATABASE_URL must be set");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

async function main() {
  await pool.query("SELECT 1");
  console.log("✓ соединение с БД установлено");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      services TEXT NOT NULL,
      object_type TEXT,
      area INTEGER,
      budget TEXT,
      timeline TEXT,
      city TEXT,
      description TEXT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      contact_methods TEXT NOT NULL,
      call_times TEXT,
      source TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      notes TEXT,
      created_at TEXT NOT NULL
    )
  `);
  console.log("✓ таблица leads готова");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS work_groups (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )
  `);
  console.log("✓ таблица work_groups готова");

  const backfill = await pool.query(`
    INSERT INTO work_groups (name)
    SELECT DISTINCT work_group FROM estimate_items
    WHERE work_group IS NOT NULL AND trim(work_group) <> ''
    ON CONFLICT (name) DO NOTHING
  `);
  if (backfill.rowCount) {
    console.log(`✓ перенесено ${backfill.rowCount} групп работ из существующих смет`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_reminders (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      due_date TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    )
  `);
  console.log("✓ таблица client_reminders готова");

  await pool.query(`ALTER TABLE client_reminders ADD COLUMN IF NOT EXISTS resolution_note TEXT`);
  await pool.query(`ALTER TABLE client_reminders ADD COLUMN IF NOT EXISTS resolution_quality TEXT`);
  await pool.query(`ALTER TABLE client_reminders ADD COLUMN IF NOT EXISTS notified_at TEXT`);
  await pool.query(`ALTER TABLE client_reminders ADD COLUMN IF NOT EXISTS project_id INTEGER`);
  await pool.query(`ALTER TABLE client_reminders ADD COLUMN IF NOT EXISTS assigned_to_user_id INTEGER`);
  await pool.query(`ALTER TABLE client_reminders ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'none'`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT`);
  console.log("✓ колонки resolution_note/resolution_quality/notified_at/project_id/assigned_to_user_id/recurrence готовы");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reminder_history (
      id SERIAL PRIMARY KEY,
      reminder_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      user_id INTEGER,
      created_at TEXT NOT NULL
    )
  `);
  console.log("✓ таблица reminder_history готова");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  console.log("✓ таблица app_settings готова");

  await pool.end();
}

main().catch((err) => {
  console.error("Ошибка миграции:", err);
  process.exit(1);
});
