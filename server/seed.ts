import { db } from "./db";
import {
  clients, projects, estimates, estimateItems, payments,
  documents, photos, videos, messages, users, nonWorkingDays,
} from "@shared/schema";

export async function seedDatabase() {
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database...");

  await db.insert(clients).values([
    { id: 1, name: "Иванов Сергей Петрович", phone: "+7 (918) 123-45-67", email: "ivanov@mail.ru", uid: "demo-uid-123" },
    { id: 2, name: "Петров Алексей Николаевич", phone: "+7 (918) 987-65-43", email: "petrov@mail.ru", uid: "client-uid-456" },
  ]);

  await db.insert(projects).values([
    { id: 1, name: "Демо", address: "г. Краснодар, ул. Демонстрационная, 1", startDate: "2026-01-07", status: "active", clientId: 1 },
    { id: 2, name: "Атамана Матвеева", address: "Борисовка, ул. Ад. Матвеева, 15", startDate: "2026-01-07", status: "active", clientId: 2 },
    { id: 3, name: "Коттедж на Южной", address: "г. Краснодар, ул. Южная, 22", startDate: "2026-02-15", status: "active", clientId: 2 },
  ]);

  await db.insert(estimates).values([
    { id: 1, projectId: 1, category: "works", title: "Ландшафтные работы" },
    { id: 2, projectId: 1, category: "materials", title: "Строительные материалы" },
    { id: 3, projectId: 2, category: "works", title: "Ландшафтные работы" },
    { id: 4, projectId: 2, category: "materials", title: "Строительные материалы" },
    { id: 5, projectId: 1, category: "transport", title: "Транспортные расходы" },
    { id: 6, projectId: 2, category: "transport", title: "Транспортные расходы" },
  ]);

  await db.insert(estimateItems).values([
    { id: 1, estimateId: 1, date: "2026-01-10", name: "Планировка территории", quantity: "450", unit: "м²", unitPrice: "120", totalPrice: "54000", status: "completed" },
    { id: 2, estimateId: 1, date: "2026-01-12", name: "Выемка грунта под фундамент", quantity: "85", unit: "м³", unitPrice: "850", totalPrice: "72250", status: "completed" },
    { id: 3, estimateId: 1, date: "2026-01-15", name: "Устройство песчаной подушки", quantity: "45", unit: "м³", unitPrice: "600", totalPrice: "27000", status: "completed" },
    { id: 4, estimateId: 1, date: "2026-01-20", name: "Заливка фундамента", quantity: "38", unit: "м³", unitPrice: "4500", totalPrice: "171000", status: "in_progress" },
    { id: 5, estimateId: 1, date: "2026-01-25", name: "Гидроизоляция фундамента", quantity: "120", unit: "м²", unitPrice: "350", totalPrice: "42000", status: "in_progress" },
    { id: 6, estimateId: 1, date: "2026-02-01", name: "Кладка стен первого этажа", quantity: "180", unit: "м²", unitPrice: "2200", totalPrice: "396000", status: "planned" },
    { id: 7, estimateId: 1, date: "2026-02-10", name: "Кладка стен второго этажа", quantity: "160", unit: "м²", unitPrice: "2200", totalPrice: "352000", status: "planned" },
    { id: 8, estimateId: 1, date: "2026-02-20", name: "Монтаж кровли", quantity: "210", unit: "м²", unitPrice: "1800", totalPrice: "378000", status: "planned" },
    { id: 9, estimateId: 1, date: "2026-03-01", name: "Установка окон", quantity: "14", unit: "шт", unitPrice: "18000", totalPrice: "252000", status: "planned" },
    { id: 10, estimateId: 1, date: "2026-03-10", name: "Штукатурка фасада", quantity: "340", unit: "м²", unitPrice: "650", totalPrice: "221000", status: "planned" },
    { id: 11, estimateId: 2, date: "2026-01-08", name: "Бетон М300", quantity: "85", unit: "м³", unitPrice: "5200", totalPrice: "442000", status: "completed" },
    { id: 12, estimateId: 2, date: "2026-01-08", name: "Арматура А500 d12", quantity: "3200", unit: "кг", unitPrice: "75", totalPrice: "240000", status: "completed" },
    { id: 13, estimateId: 2, date: "2026-01-20", name: "Кирпич керамический", quantity: "28000", unit: "шт", unitPrice: "18", totalPrice: "504000", status: "in_progress" },
    { id: 14, estimateId: 2, date: "2026-02-01", name: "Утеплитель минвата 100мм", quantity: "320", unit: "м²", unitPrice: "420", totalPrice: "134400", status: "planned" },
    { id: 15, estimateId: 2, date: "2026-02-15", name: "Металлочерепица", quantity: "230", unit: "м²", unitPrice: "850", totalPrice: "195500", status: "planned" },
    { id: 16, estimateId: 3, date: "2026-01-10", name: "Планировка территории", quantity: "450", unit: "м²", unitPrice: "120", totalPrice: "54000", status: "completed" },
    { id: 17, estimateId: 3, date: "2026-01-12", name: "Выемка грунта под фундамент", quantity: "85", unit: "м³", unitPrice: "850", totalPrice: "72250", status: "completed" },
    { id: 18, estimateId: 3, date: "2026-01-15", name: "Устройство песчаной подушки", quantity: "45", unit: "м³", unitPrice: "600", totalPrice: "27000", status: "completed" },
    { id: 19, estimateId: 3, date: "2026-01-20", name: "Заливка фундамента", quantity: "38", unit: "м³", unitPrice: "4500", totalPrice: "171000", status: "in_progress" },
    { id: 20, estimateId: 3, date: "2026-01-25", name: "Гидроизоляция фундамента", quantity: "120", unit: "м²", unitPrice: "350", totalPrice: "42000", status: "in_progress" },
    { id: 21, estimateId: 3, date: "2026-02-01", name: "Кладка стен первого этажа", quantity: "180", unit: "м²", unitPrice: "2200", totalPrice: "396000", status: "planned" },
    { id: 22, estimateId: 3, date: "2026-02-10", name: "Кладка стен второго этажа", quantity: "160", unit: "м²", unitPrice: "2200", totalPrice: "352000", status: "planned" },
    { id: 23, estimateId: 3, date: "2026-02-20", name: "Монтаж кровли", quantity: "210", unit: "м²", unitPrice: "1800", totalPrice: "378000", status: "planned" },
    { id: 24, estimateId: 3, date: "2026-03-01", name: "Установка окон", quantity: "14", unit: "шт", unitPrice: "18000", totalPrice: "252000", status: "planned" },
    { id: 25, estimateId: 3, date: "2026-03-10", name: "Штукатурка фасада", quantity: "340", unit: "м²", unitPrice: "650", totalPrice: "221000", status: "planned" },
    { id: 26, estimateId: 4, date: "2026-01-08", name: "Бетон М300", quantity: "85", unit: "м³", unitPrice: "5200", totalPrice: "442000", status: "completed" },
    { id: 27, estimateId: 4, date: "2026-01-08", name: "Арматура А500 d12", quantity: "3200", unit: "кг", unitPrice: "75", totalPrice: "240000", status: "completed" },
    { id: 28, estimateId: 4, date: "2026-01-20", name: "Кирпич керамический", quantity: "28000", unit: "шт", unitPrice: "18", totalPrice: "504000", status: "in_progress" },
    { id: 29, estimateId: 4, date: "2026-02-01", name: "Утеплитель минвата 100мм", quantity: "320", unit: "м²", unitPrice: "420", totalPrice: "134400", status: "planned" },
    { id: 30, estimateId: 4, date: "2026-02-15", name: "Металлочерепица", quantity: "230", unit: "м²", unitPrice: "850", totalPrice: "195500", status: "planned" },
    { id: 31, estimateId: 5, date: "2026-01-10", name: "Доставка песка", quantity: "3", unit: "рейс", unitPrice: "8000", totalPrice: "24000", status: "completed" },
    { id: 32, estimateId: 5, date: "2026-01-10", name: "Доставка щебня", quantity: "2", unit: "рейс", unitPrice: "9000", totalPrice: "18000", status: "completed" },
    { id: 33, estimateId: 5, date: "2026-01-12", name: "Вывоз грунта", quantity: "5", unit: "рейс", unitPrice: "7500", totalPrice: "37500", status: "completed" },
    { id: 34, estimateId: 5, date: "2026-01-15", name: "Доставка бетона (миксер)", quantity: "4", unit: "рейс", unitPrice: "12000", totalPrice: "48000", status: "completed" },
    { id: 35, estimateId: 5, date: "2026-01-20", name: "Аренда автокрана", quantity: "1", unit: "смена", unitPrice: "25000", totalPrice: "25000", status: "in_progress" },
    { id: 36, estimateId: 5, date: "2026-02-01", name: "Доставка кирпича", quantity: "4", unit: "рейс", unitPrice: "11000", totalPrice: "44000", status: "planned" },
    { id: 37, estimateId: 5, date: "2026-02-15", name: "Доставка металлочерепицы", quantity: "2", unit: "рейс", unitPrice: "15000", totalPrice: "30000", status: "planned" },
    { id: 38, estimateId: 6, date: "2026-01-10", name: "Доставка песка", quantity: "3", unit: "рейс", unitPrice: "8000", totalPrice: "24000", status: "completed" },
    { id: 39, estimateId: 6, date: "2026-01-10", name: "Доставка щебня", quantity: "2", unit: "рейс", unitPrice: "9000", totalPrice: "18000", status: "completed" },
    { id: 40, estimateId: 6, date: "2026-01-12", name: "Вывоз грунта", quantity: "5", unit: "рейс", unitPrice: "7500", totalPrice: "37500", status: "completed" },
    { id: 41, estimateId: 6, date: "2026-01-15", name: "Доставка бетона (миксер)", quantity: "4", unit: "рейс", unitPrice: "12000", totalPrice: "48000", status: "completed" },
    { id: 42, estimateId: 6, date: "2026-01-20", name: "Аренда автокрана", quantity: "1", unit: "смена", unitPrice: "25000", totalPrice: "25000", status: "in_progress" },
    { id: 43, estimateId: 6, date: "2026-02-01", name: "Доставка кирпича", quantity: "4", unit: "рейс", unitPrice: "11000", totalPrice: "44000", status: "planned" },
    { id: 44, estimateId: 6, date: "2026-02-15", name: "Доставка металлочерепицы", quantity: "2", unit: "рейс", unitPrice: "15000", totalPrice: "30000", status: "planned" },
  ]);

  await db.insert(payments).values([
    { id: 1, projectId: 1, amount: "500000", date: "2026-01-05", description: "Аванс на начало работ" },
    { id: 2, projectId: 1, amount: "350000", date: "2026-01-20", description: "Оплата фундаментных работ" },
    { id: 3, projectId: 1, amount: "200000", date: "2026-02-01", description: "Оплата материалов (кирпич)" },
    { id: 4, projectId: 2, amount: "500000", date: "2026-01-05", description: "Аванс на начало работ" },
    { id: 5, projectId: 2, amount: "350000", date: "2026-01-20", description: "Оплата фундаментных работ" },
    { id: 6, projectId: 2, amount: "200000", date: "2026-02-01", description: "Оплата материалов (кирпич)" },
  ]);

  await db.insert(documents).values([
    { id: 1, projectId: 1, name: "Договор подряда №127", url: "/docs/contract.pdf", type: "contract" },
    { id: 2, projectId: 1, name: "Проектная документация", url: "/docs/project.pdf", type: "project" },
    { id: 3, projectId: 1, name: "Смета на фундаментные работы", url: "/docs/estimate-fund.pdf", type: "estimate" },
    { id: 4, projectId: 1, name: "Акт выполненных работ №1", url: "/docs/act-1.pdf", type: "act" },
    { id: 5, projectId: 1, name: "Разрешение на строительство", url: "/docs/permit.pdf", type: "permit" },
    { id: 6, projectId: 2, name: "Договор подряда №128", url: "/docs/contract-2.pdf", type: "contract" },
    { id: 7, projectId: 2, name: "Проектная документация", url: "/docs/project-2.pdf", type: "project" },
    { id: 8, projectId: 2, name: "Смета на фундаментные работы", url: "/docs/estimate-fund-2.pdf", type: "estimate" },
    { id: 9, projectId: 2, name: "Акт выполненных работ №1", url: "/docs/act-2.pdf", type: "act" },
    { id: 10, projectId: 2, name: "Разрешение на строительство", url: "/docs/permit-2.pdf", type: "permit" },
  ]);

  await db.insert(photos).values([
    { id: 1, projectId: 1, url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800", caption: "Подготовка площадки", date: "2026-01-10" },
    { id: 2, projectId: 1, url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800", caption: "Земляные работы", date: "2026-01-12" },
    { id: 3, projectId: 1, url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800", caption: "Армирование фундамента", date: "2026-01-15" },
    { id: 4, projectId: 1, url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800", caption: "Заливка бетона", date: "2026-01-20" },
    { id: 5, projectId: 1, url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800", caption: "Фундамент готов", date: "2026-01-25" },
    { id: 6, projectId: 1, url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800", caption: "Начало кладки стен", date: "2026-02-01" },
    { id: 7, projectId: 2, url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800", caption: "Подготовка площадки", date: "2026-01-10" },
    { id: 8, projectId: 2, url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800", caption: "Земляные работы", date: "2026-01-12" },
    { id: 9, projectId: 2, url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800", caption: "Армирование фундамента", date: "2026-01-15" },
    { id: 10, projectId: 2, url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800", caption: "Заливка бетона", date: "2026-01-20" },
    { id: 11, projectId: 2, url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800", caption: "Фундамент готов", date: "2026-01-25" },
    { id: 12, projectId: 2, url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800", caption: "Начало кладки стен", date: "2026-02-01" },
  ]);

  await db.insert(videos).values([
    { id: 1, projectId: 1, url: "/uploads/construction_house_demo.mp4", title: "Обзор строительной площадки", description: "Общий вид объекта с высоты — этап фундаментных работ", date: "2026-01-20" },
    { id: 2, projectId: 2, url: "/uploads/construction_house_demo.mp4", title: "Обзор строительной площадки", description: "Общий вид объекта с высоты — этап фундаментных работ", date: "2026-01-20" },
  ]);

  await db.insert(nonWorkingDays).values([
    { id: 1, projectId: 1, date: "2026-01-11", reason: "Воскресенье" },
    { id: 2, projectId: 1, date: "2026-01-13", reason: "Ожидание поставки арматуры" },
    { id: 3, projectId: 1, date: "2026-01-14", reason: "Дождь, невозможно проводить земляные работы" },
    { id: 4, projectId: 1, date: "2026-01-16", reason: "Технологический перерыв — усадка грунта" },
    { id: 5, projectId: 1, date: "2026-01-17", reason: "Суббота" },
    { id: 6, projectId: 1, date: "2026-01-18", reason: "Воскресенье" },
    { id: 7, projectId: 1, date: "2026-01-19", reason: "Ожидание бетона с завода" },
    { id: 8, projectId: 1, date: "2026-01-21", reason: "Набор прочности бетона" },
    { id: 9, projectId: 1, date: "2026-01-22", reason: "Набор прочности бетона" },
    { id: 10, projectId: 1, date: "2026-01-23", reason: "Набор прочности бетона" },
    { id: 11, projectId: 1, date: "2026-01-24", reason: "Суббота" },
    { id: 12, projectId: 2, date: "2026-01-11", reason: "Воскресенье" },
    { id: 13, projectId: 2, date: "2026-01-13", reason: "Ожидание поставки материалов" },
    { id: 14, projectId: 2, date: "2026-01-14", reason: "Сильный ветер, опасные условия" },
    { id: 15, projectId: 2, date: "2026-01-16", reason: "Технологический перерыв" },
    { id: 16, projectId: 2, date: "2026-01-17", reason: "Суббота" },
    { id: 17, projectId: 2, date: "2026-01-18", reason: "Воскресенье" },
    { id: 18, projectId: 2, date: "2026-01-19", reason: "Ожидание бетона" },
  ]);

  await db.insert(messages).values([
    { id: 1, projectId: 1, sender: "admin", text: "Здравствуйте! Работы по фундаменту начаты по графику.", createdAt: "2026-01-10T09:00:00", isRead: true },
    { id: 2, projectId: 1, sender: "client", text: "Отлично, спасибо за информацию!", createdAt: "2026-01-10T10:30:00", isRead: true },
    { id: 3, projectId: 1, sender: "admin", text: "Заливка фундамента завершена на 60%. Фото прилагаем.", createdAt: "2026-01-22T14:00:00", isRead: true },
    { id: 4, projectId: 1, sender: "admin", text: "Напоминаем об оплате следующего этапа — кладка стен.", createdAt: "2026-02-01T11:00:00", isRead: false },
    { id: 5, projectId: 2, sender: "admin", text: "Здравствуйте! Работы по фундаменту начаты по графику.", createdAt: "2026-01-10T09:00:00", isRead: true },
    { id: 6, projectId: 2, sender: "client", text: "Отлично, спасибо за информацию!", createdAt: "2026-01-10T10:30:00", isRead: true },
    { id: 7, projectId: 2, sender: "admin", text: "Заливка фундамента завершена на 60%. Фото прилагаем.", createdAt: "2026-01-22T14:00:00", isRead: true },
    { id: 8, projectId: 2, sender: "admin", text: "Напоминаем об оплате следующего этапа — кладка стен.", createdAt: "2026-02-01T11:00:00", isRead: false },
  ]);

  await db.insert(users).values([
    { id: 1, username: "admin", password: "admin123", role: "admin", clientId: null },
    { id: 2, username: "client", password: "client123", role: "client", clientId: 1 },
    { id: 3, username: "petrov", password: "petrov123", role: "client", clientId: 2 },
  ]);

  const { sql } = await import("drizzle-orm");
  const sequences = [
    { table: "clients", seq: "clients_id_seq" },
    { table: "projects", seq: "projects_id_seq" },
    { table: "estimates", seq: "estimates_id_seq" },
    { table: "estimate_items", seq: "estimate_items_id_seq" },
    { table: "payments", seq: "payments_id_seq" },
    { table: "documents", seq: "documents_id_seq" },
    { table: "photos", seq: "photos_id_seq" },
    { table: "videos", seq: "videos_id_seq" },
    { table: "users", seq: "users_id_seq" },
    { table: "non_working_days", seq: "non_working_days_id_seq" },
    { table: "estimate_item_photos", seq: "estimate_item_photos_id_seq" },
    { table: "messages", seq: "messages_id_seq" },
  ];
  for (const { table, seq } of sequences) {
    await db.execute(sql.raw(`SELECT setval('${seq}', COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`));
  }

  console.log("Database seeded successfully!");
}
