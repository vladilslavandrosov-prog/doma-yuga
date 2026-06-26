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
  await pool.end();
}

main().catch((err) => {
  console.error("Ошибка миграции:", err);
  process.exit(1);
});
