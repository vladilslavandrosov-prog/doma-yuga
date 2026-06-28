import { Pool } from "pg";
import bcrypt from "bcryptjs";

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("POSTGRES_URL or DATABASE_URL must be set");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

interface DemoClient {
  name: string;
  username: string;
  password: string;
  projectName: string;
  address: string;
}

const DEMO_CLIENTS: DemoClient[] = [
  {
    name: "Демо заказчик",
    username: "demo",
    password: "demo12345",
    projectName: "Демо-объект — коттедж 150м²",
    address: "г. Краснодар, ул. Демонстрационная, 1",
  },
];

const REMOVED_DEMO_USERNAMES = ["matveev"];

async function removeDemoClient(username: string) {
  const client = await pool.query("SELECT id FROM clients WHERE uid = $1", [`demo-${username}`]);
  if (client.rows.length === 0) return;
  const clientId = client.rows[0].id;

  await pool.query("DELETE FROM users WHERE username = $1", [username]);

  const projects = await pool.query("SELECT id FROM projects WHERE client_id = $1", [clientId]);
  for (const p of projects.rows) {
    const estimates = await pool.query("SELECT id FROM estimates WHERE project_id = $1", [p.id]);
    for (const e of estimates.rows) {
      await pool.query("DELETE FROM estimate_items WHERE estimate_id = $1", [e.id]);
    }
    await pool.query("DELETE FROM estimates WHERE project_id = $1", [p.id]);
    await pool.query("DELETE FROM payments WHERE project_id = $1", [p.id]);
    await pool.query("DELETE FROM messages WHERE project_id = $1", [p.id]);
    await pool.query("DELETE FROM projects WHERE id = $1", [p.id]);
  }
  await pool.query("DELETE FROM client_reminders WHERE client_id = $1", [clientId]);
  await pool.query("DELETE FROM clients WHERE id = $1", [clientId]);
  console.log(`✓ демо-клиент «${username}» и его объект удалены`);
}

const WORK_ITEMS = [
  { name: "Разработка котлована", unit: "м3", quantity: "120", unitPrice: "450", status: "completed", workGroup: "Земляные работы" },
  { name: "Устройство фундамента", unit: "м3", quantity: "35", unitPrice: "8500", status: "completed", workGroup: "Фундамент" },
  { name: "Кирпичная кладка стен", unit: "м2", quantity: "210", unitPrice: "2200", status: "in_progress", workGroup: "Стены" },
  { name: "Монтаж кровли", unit: "м2", quantity: "180", unitPrice: "1800", status: "planned", workGroup: "Кровля" },
];

async function upsertClient(c: DemoClient): Promise<number> {
  const existingClient = await pool.query("SELECT id FROM clients WHERE uid = $1", [`demo-${c.username}`]);
  let clientId: number;
  if (existingClient.rows.length > 0) {
    clientId = existingClient.rows[0].id;
    await pool.query("UPDATE clients SET name = $1 WHERE id = $2", [c.name, clientId]);
    console.log(`= клиент с uid demo-${c.username} обновлён до «${c.name}» (id ${clientId})`);
  } else {
    const inserted = await pool.query(
      "INSERT INTO clients (name, phone, email, uid) VALUES ($1, $2, $3, $4) RETURNING id",
      [c.name, "+7 (900) 000-00-00", null, `demo-${c.username}`],
    );
    clientId = inserted.rows[0].id;
    console.log(`✓ создан клиент «${c.name}» (id ${clientId})`);
  }

  const existingUser = await pool.query("SELECT id FROM users WHERE username = $1", [c.username]);
  if (existingUser.rows.length === 0) {
    const hashed = await bcrypt.hash(c.password, 12);
    await pool.query(
      "INSERT INTO users (username, password, role, client_id) VALUES ($1, $2, 'client', $3)",
      [c.username, hashed, clientId],
    );
    console.log(`✓ создан аккаунт «${c.username}» / «${c.password}»`);
  } else {
    console.log(`= аккаунт «${c.username}» уже существует`);
  }

  const existingProject = await pool.query(
    "SELECT id, name FROM projects WHERE client_id = $1 ORDER BY id LIMIT 1",
    [clientId],
  );
  let projectId: number;
  if (existingProject.rows.length > 0) {
    projectId = existingProject.rows[0].id;
    if (existingProject.rows[0].name !== c.projectName) {
      await pool.query("UPDATE projects SET name = $1, address = $2 WHERE id = $3", [c.projectName, c.address, projectId]);
      console.log(`= объект (id ${projectId}) переименован в «${c.projectName}»`);
    } else {
      console.log(`= объект «${c.projectName}» уже существует (id ${projectId})`);
    }
    return clientId;
  }
  const insertedProject = await pool.query(
    "INSERT INTO projects (name, address, start_date, status, client_id) VALUES ($1, $2, $3, 'active', $4) RETURNING id",
    [c.projectName, c.address, new Date().toISOString().slice(0, 10), clientId],
  );
  projectId = insertedProject.rows[0].id;
  console.log(`✓ создан объект «${c.projectName}» (id ${projectId})`);

  const estimateInsert = await pool.query(
    "INSERT INTO estimates (project_id, category, title) VALUES ($1, $2, $3) RETURNING id",
    [projectId, "works", "Работы"],
  );
  const estimateId = estimateInsert.rows[0].id;

  const today = new Date();
  for (let i = 0; i < WORK_ITEMS.length; i++) {
    const item = WORK_ITEMS[i];
    const date = new Date(today);
    date.setDate(date.getDate() - (WORK_ITEMS.length - i) * 5);
    const totalPrice = (parseFloat(item.quantity) * parseFloat(item.unitPrice)).toFixed(2);
    await pool.query(
      `INSERT INTO estimate_items (estimate_id, date, name, quantity, unit, unit_price, total_price, status, work_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [estimateId, date.toISOString().slice(0, 10), item.name, item.quantity, item.unit, item.unitPrice, totalPrice, item.status, item.workGroup],
    );
  }
  console.log(`✓ добавлено ${WORK_ITEMS.length} позиций сметы для «${c.projectName}»`);
  return clientId;
}

async function seedMockReminders(clientIds: number[]) {
  const flag = await pool.query("SELECT value FROM app_settings WHERE key = $1", ["demo_reminders_seeded"]);
  if (flag.rows.length > 0) {
    console.log("= мок-напоминания уже были созданы ранее, пропускаю");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const mockReminders = [
    { clientId: clientIds[0], text: "Срочно позвонить — уточнить дату следующей оплаты", dueDate: today, priority: "urgent" },
    { clientId: clientIds[0], text: "Согласовать допработы по фундаменту", dueDate: today, priority: "urgent" },
  ];

  for (const r of mockReminders) {
    if (!r.clientId) continue;
    await pool.query(
      "INSERT INTO client_reminders (client_id, text, due_date, priority, status, created_at) VALUES ($1, $2, $3, $4, 'pending', $5)",
      [r.clientId, r.text, r.dueDate, r.priority, new Date().toISOString()],
    );
  }
  console.log(`✓ создано ${mockReminders.length} мок-напоминаний (горящие)`);

  await pool.query(
    "INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
    ["demo_reminders_seeded", "true"],
  );
}

async function seedMoreMockReminders(clientIds: number[]) {
  const flag = await pool.query("SELECT value FROM app_settings WHERE key = $1", ["demo_reminders_seeded_v2"]);
  if (flag.rows.length > 0) {
    console.log("= вторая партия мок-напоминаний уже была создана ранее, пропускаю");
    return;
  }

  const today = new Date();
  const addDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const mockReminders = [
    { clientId: clientIds[0], text: "Передать клиенту обновлённую смету после допработ", dueDate: addDays(-1), priority: "urgent" },
    { clientId: clientIds[0], text: "Подписать акт скрытых работ по фундаменту", dueDate: addDays(0), priority: "urgent" },
    { clientId: clientIds[0], text: "Заказать кирпич на следующий этап", dueDate: addDays(1), priority: "normal" },
    { clientId: clientIds[0], text: "Уточнить у клиента цвет фасадной плитки", dueDate: addDays(3), priority: "normal" },
    { clientId: clientIds[0], text: "Согласовать график поставки кровельных материалов", dueDate: addDays(5), priority: "normal" },
    { clientId: clientIds[0], text: "Напомнить клиенту про фотоотчёт за месяц", dueDate: addDays(7), priority: "low" },
    { clientId: clientIds[0], text: "Проверить остатки расходных материалов на складе", dueDate: addDays(10), priority: "low" },
    { clientId: clientIds[0], text: "Обновить договор подряда — добавить доп. соглашение", dueDate: null, priority: "low" },
  ];

  let inserted = 0;
  for (const r of mockReminders) {
    if (!r.clientId) continue;
    await pool.query(
      "INSERT INTO client_reminders (client_id, text, due_date, priority, status, created_at) VALUES ($1, $2, $3, $4, 'pending', $5)",
      [r.clientId, r.text, r.dueDate, r.priority, new Date().toISOString()],
    );
    inserted++;
  }
  console.log(`✓ создано ${inserted} мок-напоминаний (вторая партия)`);

  await pool.query(
    "INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
    ["demo_reminders_seeded_v2", "true"],
  );
}

async function main() {
  await pool.query("SELECT 1");
  console.log("✓ соединение с БД установлено");

  for (const username of REMOVED_DEMO_USERNAMES) {
    await removeDemoClient(username);
  }

  const clientIds: number[] = [];
  for (const client of DEMO_CLIENTS) {
    clientIds.push(await upsertClient(client));
  }

  await seedMockReminders(clientIds);
  await seedMoreMockReminders(clientIds);

  await pool.end();
  console.log("✓ демо-данные готовы");
}

main().catch((err) => {
  console.error("Ошибка заливки демо-данных:", err);
  process.exit(1);
});
