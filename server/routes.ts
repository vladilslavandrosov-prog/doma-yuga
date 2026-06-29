import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { hashPassword, verifyPassword, isHashedPassword } from "./auth";
import {
  insertMessageSchema,
  insertEstimateItemSchema,
  insertPaymentSchema,
  insertDocumentSchema,
  insertPhotoSchema,
  insertVideoSchema,
  insertClientSchema,
  insertUserSchema,
  insertNonWorkingDaySchema,
  insertProjectSchema,
  insertGalleryPhotoSchema,
  insertDayCommentSchema,
  insertLeadSchema,
  insertWorkGroupSchema,
  insertClientReminderSchema,
  type ClientReminder,
} from "@shared/schema";

const uploadsDir = process.env.NODE_ENV === "production" ? "/data/uploads" : path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Автоматически переводит проект в "completed", когда все позиции смет выполнены,
// и возвращает обратно в "active", если позиция переоткрыта. Статус "paused" не трогаем —
// это осознанное решение администратора.
async function syncProjectStatusWithProgress(projectId: number): Promise<void> {
  const project = await storage.getProjectById(projectId);
  if (!project || project.status === "paused") return;

  const estimates = await storage.getEstimatesByProjectId(projectId);
  const items = await storage.getEstimateItemsByEstimateIds(estimates.map((e) => e.id));
  if (items.length === 0) return;

  const allCompleted = items.every((i) => i.status === "completed");
  if (allCompleted && project.status !== "completed") {
    await storage.updateProject(projectId, { status: "completed" });
    const { notifyProjectCompleted } = await import("./telegram");
    notifyProjectCompleted(project.name);
  } else if (!allCompleted && project.status === "completed") {
    await storage.updateProject(projectId, { status: "active" });
  }
}

// Раз в сутки шлёт в Telegram напоминание по активным проектам, где есть
// неоплаченный остаток — чтобы менеджер не упускал из виду долги клиентов.
export async function checkOverduePayments(): Promise<void> {
  const { notifyOverduePayment } = await import("./telegram");
  const projects = await storage.getAllProjects();
  for (const project of projects) {
    if (project.status !== "active") continue;
    const estimates = await storage.getEstimatesByProjectId(project.id);
    const items = await storage.getEstimateItemsByEstimateIds(estimates.map((e) => e.id));
    const totalEstimateSum = items.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0);
    const payments = await storage.getPaymentsByProjectId(project.id);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const remaining = totalEstimateSum - totalPaid;
    if (remaining > 0) {
      await notifyOverduePayment(project.name, remaining);
    }
  }
}

// Раз в сутки шлёт в Telegram напоминания по клиентам, срок которых наступил или прошёл
export async function checkDueReminders(): Promise<void> {
  const { notifyClientReminderDue } = await import("./telegram");
  const reminders = await storage.getAllClientReminders();
  const today = new Date().toISOString().slice(0, 10);
  for (const reminder of reminders) {
    if (reminder.status !== "pending") continue;
    if (!reminder.dueDate || reminder.dueDate > today) continue;
    if (reminder.notifiedAt) continue;
    const client = await storage.getClientById(reminder.clientId);
    if (!client) continue;
    await notifyClientReminderDue(client.name, reminder.text, reminder.priority);
    await storage.updateClientReminder(reminder.id, { notifiedAt: new Date().toISOString() });
  }
}

// Раз в сутки шлёт сводный дайджест по горящим и скоро наступающим напоминаниям
export async function sendDailyReminderDigest(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const lastSent = await storage.getSetting("reminders_digest_last_sent_date");
  if (lastSent === today) return;

  const { sendTelegramText } = await import("./telegram");
  const reminders = await storage.getAllClientReminders();
  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);
  const weekAheadStr = weekAhead.toISOString().slice(0, 10);

  const pending = reminders.filter((r) => r.status === "pending");
  const burning = pending.filter((r) => r.dueDate && r.dueDate <= today);
  const upcoming = pending.filter((r) => r.dueDate && r.dueDate > today && r.dueDate <= weekAheadStr);

  if (burning.length === 0 && upcoming.length === 0) {
    await storage.setSetting("reminders_digest_last_sent_date", today);
    return;
  }

  const lines = [`🔔 Ежедневная сводка по напоминаниям`, ``, `🔥 Горящих: ${burning.length}`, `📅 На неделю: ${upcoming.length}`];
  if (burning.length > 0) {
    lines.push(``, `Горящие:`);
    for (const r of burning.slice(0, 10)) {
      const client = await storage.getClientById(r.clientId);
      lines.push(`• ${client?.name ?? "?"}: ${r.text}`);
    }
  }
  await sendTelegramText(lines.join("\n"));
  await storage.setSetting("reminders_digest_last_sent_date", today);
}

// Возвращает путь к подпапке, создаёт если нет
function subDir(...parts: string[]): string {
  const dir = path.join(uploadsDir, ...parts);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Динамическое хранилище — папка определяется из req во время запроса
function dynamicStorage(getDest: (req: any) => string) {
  return multer.diskStorage({
    destination: (req, _file, cb) => cb(null, getDest(req)),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  });
}

const uploadItemPhoto = multer({
  storage: dynamicStorage((req) => {
    // estimate-item-photos: используем projectId если есть, иначе item-{id}
    const pid = req.body?.projectId || "misc";
    const itemId = req.body?.estimateItemId;
    const folder = itemId ? `item-${itemId}` : "general";
    return subDir("projects", String(pid), "work-photos", folder);
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Только изображения"));
  },
});

const uploadImage = multer({
  storage: dynamicStorage((req) => {
    const pid = req.body?.projectId || req.params?.id || "misc";
    return subDir("projects", String(pid), "work-photos");
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Только изображения"));
    }
  },
});

const uploadVideo = multer({
  storage: dynamicStorage((req) => {
    const pid = req.body?.projectId || req.params?.id || "misc";
    return subDir("projects", String(pid), "videos");
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Только видео"));
    }
  },
});

const ALLOWED_DOC_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

function docFilter(_req: any, file: any, cb: any) {
  if (ALLOWED_DOC_MIMES.has(file.mimetype) || file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Поддерживаются PDF, Word, Excel, изображения"));
  }
}

const uploadDoc = multer({
  storage: dynamicStorage((req) => {
    const pid = req.body?.projectId || req.params?.id || "misc";
    return subDir("projects", String(pid), "documents");
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: docFilter,
});

const uploadGallery = multer({
  storage: dynamicStorage(() => subDir("gallery")),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Только изображения"));
  },
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.session.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

function requireAdminOrStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.session.role !== "admin" && req.session.role !== "staff") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// Единственный проект, который показывается как публичная демо-витрина
// неавторизованным посетителям (см. CabinetHome в client/src/App.tsx).
const DEMO_PROJECT_ID = 1;

/**
 * IDOR-защита: если в сессии есть клиент — он может обращаться
 * только к своим проектам. Администратор и сотрудник — без ограничений
 * (доверенные роли компании). Неавторизованный посетитель видит только
 * выделенный демо-проект, остальные проекты для него — 403/404.
 */
async function requireProjectAccess(req: Request, res: Response, next: NextFunction) {
  const rawId = (req.params.id ?? req.params.projectId) as string;
  const projectId = parseInt(rawId);
  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  // Нет сессии → доступ только к демо-проекту
  if (!req.session.userId) {
    if (projectId !== DEMO_PROJECT_ID) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  }
  // Администратор и сотрудник → без ограничений
  if (req.session.role === "admin" || req.session.role === "staff") return next();
  // Клиент → проверяем владельца
  const project = await storage.getProjectById(projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (project.clientId !== req.session.clientId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

function deleteUploadedFile(url: string): void {
  if (!url.startsWith("/uploads/")) return;
  const filename = url.slice("/uploads/".length);
  const filePath = path.join(uploadsDir, filename);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error(`[uploads] Failed to delete file ${filePath}:`, err);
    }
  });
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₽";
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextRecurrenceDate(dueDate: string | null, recurrence: string): string | null {
  const base = dueDate ? new Date(dueDate) : new Date();
  if (recurrence === "weekly") base.setDate(base.getDate() + 7);
  else if (recurrence === "monthly") base.setMonth(base.getMonth() + 1);
  return base.toISOString().slice(0, 10);
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много попыток входа. Попробуйте позже." },
});

const leadsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много заявок. Попробуйте позже или позвоните нам." },
});

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много попыток. Попробуйте позже." },
});

const faqChatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много сообщений. Попробуйте позже или оставьте заявку." },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    // Transparent upgrade: если пароль ещё не захеширован — хешируем
    if (!isHashedPassword(user.password)) {
      const hashed = await hashPassword(password);
      await storage.updateUserPassword(user.id, hashed);
    }
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.clientId = user.clientId;
    res.json({ id: user.id, username: user.username, role: user.role, clientId: user.clientId });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    res.json({ id: user.id, username: user.username, role: user.role, clientId: user.clientId });
  });

  app.post("/api/auth/change-password", requireAuth, changePasswordLimiter, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new passwords required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    const user = await storage.getUserById(req.session.userId!);
    if (!user) {
      return res.status(401).json({ error: "Неверный текущий пароль" });
    }
    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Неверный текущий пароль" });
    }
    const hashed = await hashPassword(newPassword);
    await storage.updateUserPassword(user.id, hashed);
    res.json({ ok: true });
  });

  app.get("/api/admin/clients", requireAdmin, async (req, res) => {
    const clients = await storage.getAllClients();
    const users = await storage.getAllUsers();
    const projects = await storage.getAllProjects();
    const result = clients.map(client => {
      const user = users.find(u => u.clientId === client.id);
      const clientProjects = projects.filter(p => p.clientId === client.id);
      return {
        ...client,
        username: user?.username ?? null,
        hasAccount: !!user,
        projects: clientProjects.map(p => ({ id: p.id, name: p.name })),
      };
    });
    res.json(result);
  });

  app.post("/api/admin/clients", requireAdmin, async (req, res) => {
    const { name, phone, email, username, password, projectId } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: "Имя, логин и пароль обязательны" });
    }
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: "Пользователь с таким логином уже существует" });
    }
    const uid = `client-uid-${Date.now()}`;
    const client = await storage.createClient({ name, phone: phone || null, email: email || null, uid });
    const hashedPwd = await hashPassword(password);
    const user = await storage.createUser({ username, password: hashedPwd, role: "client", clientId: client.id });
    if (projectId) {
      const project = await storage.getProjectById(parseInt(projectId));
      if (project) {
        await storage.updateProject(project.id, { ...project, clientId: client.id });
      }
    }
    res.json({ client, userId: user.id });
  });

  app.patch("/api/admin/clients/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const { name, phone, email } = req.body;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone || null;
    if (email !== undefined) updateData.email = email || null;
    const updated = await storage.updateClient(id, updateData as any);
    if (!updated) {
      return res.status(404).json({ error: "Клиент не найден" });
    }
    res.json(updated);
  });

  app.delete("/api/admin/clients/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const projects = await storage.getProjectsByClientId(id);
    if (projects.length > 0) {
      return res.status(400).json({ error: "У клиента есть объекты — сначала отвяжите или удалите их" });
    }
    await storage.deleteUsersByClientId(id);
    await storage.deleteClientRemindersByClientId(id);
    const ok = await storage.deleteClient(id);
    if (!ok) {
      return res.status(404).json({ error: "Клиент не найден" });
    }
    res.status(204).end();
  });

  app.get("/api/admin/staff", requireAdmin, async (_req, res) => {
    const users = await storage.getAllUsers();
    const staff = users
      .filter((u) => u.role === "staff")
      .map((u) => ({ id: u.id, username: u.username, telegramChatId: u.telegramChatId }));
    res.json(staff);
  });

  app.post("/api/admin/staff", requireAdmin, async (req, res) => {
    const { username, password, telegramChatId } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Логин и пароль обязательны" });
    }
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: "Пользователь с таким логином уже существует" });
    }
    const hashedPwd = await hashPassword(password);
    const user = await storage.createUser({
      username,
      password: hashedPwd,
      role: "staff",
      clientId: null,
      telegramChatId: telegramChatId || null,
    });
    res.json({ id: user.id, username: user.username, telegramChatId: user.telegramChatId });
  });

  app.patch("/api/admin/staff/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const { telegramChatId, password } = req.body;
    const updateData: Record<string, unknown> = {};
    if (telegramChatId !== undefined) updateData.telegramChatId = telegramChatId || null;
    if (password) updateData.password = await hashPassword(password);
    const updated = await storage.updateUser(id, updateData as any);
    if (!updated || updated.role !== "staff") {
      return res.status(404).json({ error: "Сотрудник не найден" });
    }
    res.json({ id: updated.id, username: updated.username, telegramChatId: updated.telegramChatId });
  });

  app.delete("/api/admin/staff/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const users = await storage.getAllUsers();
    const target = users.find((u) => u.id === id && u.role === "staff");
    if (!target) {
      return res.status(404).json({ error: "Сотрудник не найден" });
    }
    await storage.nullifyReminderAssigneesByUserId(id);
    await storage.deleteUser(id);
    res.status(204).end();
  });

  app.get("/api/admin/clients/:id/reminders", requireAdmin, async (req, res) => {
    const clientId = parseInt(req.params.id as string);
    const reminders = await storage.getClientRemindersByClientId(clientId);
    res.json(reminders);
  });

  app.post("/api/admin/clients/:id/reminders", requireAdmin, async (req, res) => {
    const clientId = parseInt(req.params.id as string);
    const parsed = insertClientReminderSchema.safeParse({
      ...req.body,
      clientId,
      createdAt: new Date().toISOString(),
    });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const reminder = await storage.createClientReminder(parsed.data);
    await storage.addReminderHistory({
      reminderId: reminder.id,
      action: "created",
      details: reminder.text,
      userId: req.session.userId ?? null,
      createdAt: new Date().toISOString(),
    });
    if (reminder.priority === "urgent") {
      const { notifyClientReminderDue } = await import("./telegram");
      const client = await storage.getClientById(clientId);
      if (client) {
        const assignee = reminder.assignedToUserId ? await storage.getUserById(reminder.assignedToUserId) : undefined;
        await notifyClientReminderDue(client.name, reminder.text, reminder.priority, assignee?.telegramChatId);
        await storage.updateClientReminder(reminder.id, { notifiedAt: new Date().toISOString() });
      }
    }
    res.json(reminder);
  });

  app.get("/api/admin/projects/:id/reminders", requireAdminOrStaff, async (req, res) => {
    const projectId = parseInt(req.params.id as string);
    const reminders = await storage.getClientRemindersByProjectId(projectId);
    res.json(reminders);
  });

  app.post("/api/admin/projects/:id/reminders", requireAdminOrStaff, async (req, res) => {
    const projectId = parseInt(req.params.id as string);
    const project = await storage.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Объект не найден" });
    }
    const parsed = insertClientReminderSchema.safeParse({
      ...req.body,
      clientId: project.clientId,
      projectId,
      createdAt: new Date().toISOString(),
    });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const reminder = await storage.createClientReminder(parsed.data);
    await storage.addReminderHistory({
      reminderId: reminder.id,
      action: "created",
      details: reminder.text,
      userId: req.session.userId ?? null,
      createdAt: new Date().toISOString(),
    });
    if (reminder.priority === "urgent") {
      const { notifyClientReminderDue } = await import("./telegram");
      const client = await storage.getClientById(project.clientId);
      if (client) {
        const assignee = reminder.assignedToUserId ? await storage.getUserById(reminder.assignedToUserId) : undefined;
        await notifyClientReminderDue(client.name, reminder.text, reminder.priority, assignee?.telegramChatId);
        await storage.updateClientReminder(reminder.id, { notifiedAt: new Date().toISOString() });
      }
    }
    res.json(reminder);
  });

  app.patch("/api/admin/reminders/:id", requireAdminOrStaff, async (req, res) => {
    const isStaff = req.session.role === "staff";
    if (isStaff) {
      const existing = await storage.getClientReminderById(parseInt(req.params.id as string));
      if (!existing || existing.assignedToUserId !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }
    const allowed = isStaff
      ? ["dueDate", "status", "resolutionNote", "resolutionQuality"]
      : ["text", "dueDate", "priority", "status", "resolutionNote", "resolutionQuality", "projectId", "assignedToUserId", "recurrence"];
    const filtered: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) filtered[key] = req.body[key];
    }
    if (filtered.resolutionQuality !== undefined && filtered.resolutionQuality !== null && !["good", "bad"].includes(filtered.resolutionQuality)) {
      return res.status(400).json({ error: "Недопустимое значение resolutionQuality" });
    }
    if (filtered.recurrence !== undefined && !["none", "weekly", "monthly"].includes(filtered.recurrence)) {
      return res.status(400).json({ error: "Недопустимое значение recurrence" });
    }
    if (filtered.priority !== undefined && !["urgent", "normal", "low"].includes(filtered.priority)) {
      return res.status(400).json({ error: "Недопустимое значение priority" });
    }
    if (filtered.status !== undefined && !["pending", "done"].includes(filtered.status)) {
      return res.status(400).json({ error: "Недопустимое значение status" });
    }
    if (filtered.dueDate !== undefined || filtered.text !== undefined || filtered.priority !== undefined || filtered.status === "pending") {
      filtered.notifiedAt = null;
    }
    const reminderId = parseInt(req.params.id as string);
    const before = await storage.getClientReminderById(reminderId);
    if (!before) {
      return res.status(404).json({ error: "Напоминание не найдено" });
    }
    let reminder: ClientReminder | undefined;
    let isFreshResolve = false;
    if (filtered.status === "done") {
      reminder = await storage.resolveClientReminderIfPending(reminderId, filtered);
      if (!reminder) {
        // уже было закрыто параллельным запросом — отдаём текущее состояние, без повторных побочных эффектов
        return res.json(before);
      }
      isFreshResolve = true;
    } else {
      reminder = await storage.updateClientReminder(reminderId, filtered);
      if (!reminder) {
        return res.status(404).json({ error: "Напоминание не найдено" });
      }
    }
    const userId = req.session.userId ?? null;
    const now = new Date().toISOString();
    if (isFreshResolve) {
      await storage.addReminderHistory({
        reminderId: reminder.id,
        action: "resolved",
        details: reminder.resolutionQuality === "bad" ? "Плохо" : reminder.resolutionQuality === "good" ? "Хорошо" : null,
        userId,
        createdAt: now,
      });

      if (reminder.resolutionQuality === "bad") {
        const followUp = await storage.createClientReminder({
          clientId: reminder.clientId,
          projectId: reminder.projectId,
          text: `Доработать: ${reminder.text}`,
          dueDate: addDaysIso(3),
          priority: reminder.priority as "urgent" | "normal" | "low",
          status: "pending",
          createdAt: now,
          assignedToUserId: reminder.assignedToUserId,
          recurrence: "none",
        });
        await storage.addReminderHistory({
          reminderId: followUp.id,
          action: "created",
          details: `Автофоллоу-ап после «Плохо» по напоминанию #${reminder.id}`,
          userId,
          createdAt: now,
        });
      } else if (reminder.recurrence !== "none") {
        const nextDueDate = nextRecurrenceDate(reminder.dueDate, reminder.recurrence);
        const nextOccurrence = await storage.createClientReminder({
          clientId: reminder.clientId,
          projectId: reminder.projectId,
          text: reminder.text,
          dueDate: nextDueDate,
          priority: reminder.priority as "urgent" | "normal" | "low",
          status: "pending",
          createdAt: now,
          assignedToUserId: reminder.assignedToUserId,
          recurrence: reminder.recurrence as "none" | "weekly" | "monthly",
        });
        await storage.addReminderHistory({
          reminderId: nextOccurrence.id,
          action: "created",
          details: `Следующее повторение напоминания #${reminder.id}`,
          userId,
          createdAt: now,
        });
      }
    } else {
      const changedFields = Object.keys(filtered).filter((k) => k !== "notifiedAt");
      if (changedFields.length > 0) {
        await storage.addReminderHistory({
          reminderId: reminder.id,
          action: "updated",
          details: changedFields.join(", "),
          userId,
          createdAt: now,
        });
      }
    }
    if (filtered.assignedToUserId !== undefined && filtered.assignedToUserId !== null && reminder.status === "pending" && reminder.priority === "urgent") {
      const { notifyClientReminderDue } = await import("./telegram");
      const client = await storage.getClientById(reminder.clientId);
      const assignee = await storage.getUserById(filtered.assignedToUserId);
      if (client && assignee) {
        await notifyClientReminderDue(client.name, reminder.text, reminder.priority, assignee.telegramChatId);
      }
    }
    res.json(reminder);
  });

  app.get("/api/admin/reminders/:id/history", requireAdminOrStaff, async (req, res) => {
    const reminderId = parseInt(req.params.id as string);
    if (req.session.role === "staff") {
      const existing = await storage.getClientReminderById(reminderId);
      if (!existing || existing.assignedToUserId !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }
    const history = await storage.getReminderHistory(reminderId);
    const users = await storage.getAllUsers();
    const result = history
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((h) => ({ ...h, userName: users.find((u) => u.id === h.userId)?.username ?? null }));
    res.json(result);
  });

  app.delete("/api/admin/reminders/:id", requireAdmin, async (req, res) => {
    const ok = await storage.deleteClientReminder(parseInt(req.params.id as string));
    if (!ok) {
      return res.status(404).json({ error: "Напоминание не найдено" });
    }
    res.status(204).end();
  });

  app.post("/api/admin/projects", requireAdmin, async (req, res) => {
    const parsed = insertProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    try {
      const project = await storage.createProject(parsed.data);
      res.json(project);
    } catch (err) {
      console.error("Не удалось создать объект:", err);
      res.status(500).json({ error: "Не удалось создать объект" });
    }
  });

  app.patch("/api/admin/projects/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const { name, address, startDate, status, clientId } = req.body;
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (startDate !== undefined) updates.startDate = startDate;
    if (status !== undefined) updates.status = status;
    if (clientId !== undefined) updates.clientId = clientId;
    const updated = await storage.updateProject(id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(updated);
  });

  app.delete("/api/admin/projects/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const estimates = await storage.getEstimatesByProjectId(id);
    const estimateIds = estimates.map((e) => e.id);
    const estimateItems = await storage.getEstimateItemsByEstimateIds(estimateIds);
    const itemIds = estimateItems.map((i) => i.id);
    const itemPhotoUrls = await storage.deleteEstimateItemPhotosByEstimateItemIds(itemIds);
    await storage.deleteEstimateItemsByEstimateIds(estimateIds);
    await storage.deleteEstimatesByProjectId(id);

    await storage.deletePaymentsByProjectId(id);
    const documentUrls = await storage.deleteDocumentsByProjectId(id);
    const photoUrls = await storage.deletePhotosByProjectId(id);
    const videoUrls = await storage.deleteVideosByProjectId(id);
    await storage.deleteMessagesByProjectId(id);
    await storage.deleteNonWorkingDaysByProjectId(id);
    await storage.deleteDayCommentsByProjectId(id);

    const ok = await storage.deleteProject(id);
    if (!ok) {
      return res.status(404).json({ error: "Project not found" });
    }

    [...itemPhotoUrls, ...documentUrls, ...photoUrls, ...videoUrls].forEach(deleteUploadedFile);
    res.status(204).end();
  });

  app.get("/api/client-projects", requireAuth, async (req, res) => {
    if (!req.session.clientId) {
      return res.json([]);
    }
    const projects = await storage.getProjectsByClientId(req.session.clientId);
    res.json(projects);
  });

  app.get("/api/projects", requireAdmin, async (req, res) => {
    const projects = await storage.getAllProjects();
    res.json(projects);
  });

  app.get("/api/client/:uid", requireAdmin, async (req, res) => {
    const client = await storage.getClientByUid(req.params.uid as string);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }
    res.json(client);
  });

  app.get("/api/client/:uid/projects", requireAdmin, async (req, res) => {
    const client = await storage.getClientByUid(req.params.uid as string);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }
    const projects = await storage.getProjectsByClientId(client.id);
    res.json(projects);
  });

  app.get("/api/project/:id", requireProjectAccess, async (req, res) => {
    const project = await storage.getProjectById(parseInt(req.params.id as string));
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  });

  app.get("/api/project/:id/client", requireProjectAccess, async (req, res) => {
    const project = await storage.getProjectById(parseInt(req.params.id as string));
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    const client = await storage.getClientById(project.clientId);
    res.json(client ?? null);
  });

  app.get("/api/project/:id/estimates", requireProjectAccess, async (req, res) => {
    const projectId = parseInt(req.params.id as string);
    const estimates = await storage.getEstimatesByProjectId(projectId);
    const allItems = await storage.getEstimateItemsByEstimateIds(estimates.map(e => e.id));
    const itemIds = allItems.map(i => i.id);
    const photos = itemIds.length > 0 ? await storage.getPhotosByEstimateItemIds(itemIds) : [];
    const result = estimates.map(est => {
      const items = allItems.filter(i => i.estimateId === est.id);
      const itemsWithPhotos = items.map(item => ({
        ...item,
        photos: photos.filter(p => p.estimateItemId === item.id),
      }));
      return { ...est, items: itemsWithPhotos };
    });
    res.json(result);
  });

  app.get("/api/project/:id/payments", requireProjectAccess, async (req, res) => {
    const payments = await storage.getPaymentsByProjectId(parseInt(req.params.id as string));
    res.json(payments);
  });

  app.get("/api/project/:id/documents", requireProjectAccess, async (req, res) => {
    const documents = await storage.getDocumentsByProjectId(parseInt(req.params.id as string));
    res.json(documents);
  });

  app.get("/api/project/:id/photos", requireProjectAccess, async (req, res) => {
    const photos = await storage.getPhotosByProjectId(parseInt(req.params.id as string));
    res.json(photos);
  });

  app.get("/api/project/:id/videos", requireProjectAccess, async (req, res) => {
    const videos = await storage.getVideosByProjectId(parseInt(req.params.id as string));
    res.json(videos);
  });

  app.get("/api/project/:id/non-working-days", requireProjectAccess, async (req, res) => {
    const days = await storage.getNonWorkingDaysByProjectId(parseInt(req.params.id as string));
    res.json(days);
  });

  app.get("/api/project/:id/messages", requireProjectAccess, async (req, res) => {
    const messages = await storage.getMessagesByProjectId(parseInt(req.params.id as string));
    res.json(messages);
  });

  app.post("/api/project/:id/messages", requireAuth, requireProjectAccess, async (req, res) => {
    const projectId = parseInt(req.params.id as string);
    const sender = req.session.role === "admin" ? "admin" : "client";
    const parsed = insertMessageSchema.safeParse({
      ...req.body,
      projectId,
      sender,
    });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }
    const message = await storage.createMessage(parsed.data);

    if (sender === "client") {
      const { sendTelegramNotification } = await import("./telegram");
      const project = await storage.getProjectById(projectId);
      let clientName = "Клиент";
      if (project) {
        const client = await storage.getClientById(project.clientId);
        if (client) clientName = client.name;
      }
      sendTelegramNotification(
        project?.name ?? `Проект #${projectId}`,
        clientName,
        message.text,
      );
    }

    res.json(message);
  });

  app.post("/api/project/:id/messages/read", requireAuth, requireProjectAccess, async (req, res) => {
    const projectId = parseInt(req.params.id as string);
    const senderToMark = req.session.role === "admin" ? "client" : "admin";
    await storage.markMessagesAsRead(projectId, senderToMark);
    res.json({ ok: true });
  });

  app.get("/api/project/:id/unread", requireProjectAccess, async (req, res) => {
    const projectId = parseInt(req.params.id as string);
    const unreadSender = req.session.role === "admin" ? "client" : "admin";
    const count = await storage.getUnreadCount(projectId, unreadSender);
    res.json({ count });
  });

  app.get("/api/dashboard/project/:id", requireProjectAccess, async (req, res) => {
    const projectId = parseInt(req.params.id as string);
    const project = await storage.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    const client = await storage.getClientById(project.clientId);
    const estimates = await storage.getEstimatesByProjectId(project.id);
    let totalItems = 0;
    let completedItems = 0;
    let totalEstimateSum = 0;
    const allEstimateItems = await storage.getEstimateItemsByEstimateIds(estimates.map(e => e.id));
    totalItems = allEstimateItems.length;
    completedItems = allEstimateItems.filter(i => i.status === "completed").length;
    totalEstimateSum = allEstimateItems.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0);
    const payments = await storage.getPaymentsByProjectId(project.id);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const unreadSender = req.session.role === "admin" ? "client" : "admin";
    const unreadCount = await storage.getUnreadCount(project.id, unreadSender);

    const estimateTitleById = new Map(estimates.map(e => [e.id, e.title]));
    const groupTotals = new Map<string, { total: number; completed: number }>();
    for (const item of allEstimateItems) {
      const group = item.workGroup || estimateTitleById.get(item.estimateId) || "Без категории";
      const g = groupTotals.get(group) ?? { total: 0, completed: 0 };
      g.total += 1;
      if (item.status === "completed") g.completed += 1;
      groupTotals.set(group, g);
    }
    const workGroups = Array.from(groupTotals.entries()).map(([name, g]) => ({
      name,
      total: g.total,
      completed: g.completed,
      percentage: g.total > 0 ? Math.round((g.completed / g.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);

    const photos = await storage.getPhotosByProjectId(project.id);
    const messages = await storage.getMessagesByProjectId(project.id);

    type Activity = { type: "photo" | "payment" | "item" | "message"; date: string; title: string; subtitle?: string; url?: string };
    const activity: Activity[] = [
      ...photos.map(p => ({ type: "photo" as const, date: p.date, title: p.caption || "Новое фото", url: p.url })),
      ...payments.map(p => ({ type: "payment" as const, date: p.date, title: `Платёж ${formatMoney(parseFloat(p.amount))}`, subtitle: p.description })),
      ...allEstimateItems.filter(i => i.status === "completed").map(i => ({ type: "item" as const, date: i.date, title: i.name, subtitle: estimateTitleById.get(i.estimateId) })),
      ...messages.map(m => ({ type: "message" as const, date: m.createdAt, title: m.sender === "client" ? "Сообщение от клиента" : "Сообщение от компании", subtitle: m.text })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

    res.json({
      client: client ?? { id: 0, name: "Неизвестный", phone: null, email: null, uid: "" },
      project,
      progress: {
        total: totalItems,
        completed: completedItems,
        percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      },
      financial: {
        totalEstimate: totalEstimateSum,
        totalPaid,
        remaining: totalEstimateSum - totalPaid,
      },
      unreadMessages: unreadCount,
      workGroups,
      activity,
      heroPhoto: photos.length > 0 ? photos.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].url : null,
    });
  });

  app.post("/api/project/:id/ai-timeline", requireProjectAccess, async (req, res) => {
    const projectId = parseInt(req.params.id as string);
    const project = await storage.getProjectById(projectId);
    if (!project) return res.status(404).json({ error: "Not found" });

    const estimates = await storage.getEstimatesByProjectId(projectId);
    const estimateTitleById = new Map(estimates.map(e => [e.id, e.title]));
    const rawItems = await storage.getEstimateItemsByEstimateIds(estimates.map(e => e.id));
    const allItems: any[] = rawItems.map(i => ({ ...i, category: estimateTitleById.get(i.estimateId) }));

    const completed = allItems.filter(i => i.status === "completed").length;
    const inProgress = allItems.filter(i => i.status === "in_progress").length;
    const planned = allItems.filter(i => i.status === "planned").length;

    const groups: Record<string, { total: number; completed: number; inProgress: number; overdue: number }> = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const overdueItems: Array<{ name: string; group: string; days: number }> = [];
    let plannedByNow = 0;
    let completedByNow = 0;
    let slippageDaysTotal = 0;
    let maxPlannedDate: Date | null = null;

    for (const item of allItems) {
      const g = item.workGroup || item.category || "Без категории";
      if (!groups[g]) groups[g] = { total: 0, completed: 0, inProgress: 0, overdue: 0 };
      groups[g].total++;
      if (item.status === "completed") groups[g].completed++;
      if (item.status === "in_progress") groups[g].inProgress++;

      const itemDate = item.date ? new Date(item.date) : null;
      if (itemDate && !isNaN(itemDate.getTime())) {
        if (!maxPlannedDate || itemDate > maxPlannedDate) maxPlannedDate = itemDate;
        if (itemDate <= today) {
          plannedByNow++;
          if (item.status === "completed") {
            completedByNow++;
          } else {
            const daysLate = Math.round((today.getTime() - itemDate.getTime()) / 86400000);
            groups[g].overdue++;
            slippageDaysTotal += daysLate;
            overdueItems.push({ name: item.name, group: g, days: daysLate });
          }
        }
      }
    }

    const pct = allItems.length > 0 ? Math.round(completed / allItems.length * 100) : 0;
    const startDate = new Date(project.startDate);
    const daysElapsed = Math.max(1, Math.round((now.getTime() - startDate.getTime()) / 86400000));
    const weeksElapsed = daysElapsed / 7;
    const ratePerWeek = weeksElapsed > 0 && completed > 0 ? completed / weeksElapsed : 0;
    const remaining = planned + inProgress;

    // Расписание по факту: если по сметам расставлены даты работ, считаем не темп,
    // а реальное отставание от плановых дат (надёжнее линейной экстраполяции).
    const scheduleAdherence = plannedByNow > 0 ? completedByNow / plannedByNow : null;
    const avgSlippageDays = overdueItems.length > 0 ? Math.round(slippageDaysTotal / overdueItems.length) : 0;

    let estimatedEnd: Date | null = null;
    if (maxPlannedDate) {
      estimatedEnd = new Date(maxPlannedDate.getTime() + avgSlippageDays * 86400000);
    } else if (ratePerWeek > 0) {
      const weeksLeft = Math.ceil(remaining / ratePerWeek);
      estimatedEnd = new Date(now.getTime() + weeksLeft * 7 * 86400000);
    }

    const monthNames = ["январе","феврале","марте","апреле","мае","июне","июле","августе","сентябре","октябре","ноябре","декабре"];
    const endStr = estimatedEnd
      ? `${monthNames[estimatedEnd.getMonth()]} ${estimatedEnd.getFullYear()} г.`
      : "сроки определятся после начала активных работ";
    const activeGroups = Object.entries(groups).filter(([, g]) => g.inProgress > 0).map(([n, g]) => `${n} (${g.inProgress})`);
    const slowGroups  = Object.entries(groups).filter(([, g]) => g.overdue > 0).map(([n, g]) => `${n} (${g.overdue})`);
    const topOverdue = overdueItems.sort((a, b) => b.days - a.days).slice(0, 5);

    // Прогноз погоды через Open-Meteo (бесплатно, без API-ключа)
    let weather: any = null;
    try {
      // Геокодируем адрес
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(project.address)}&format=json&limit=1`,
        { headers: { "Accept-Language": "ru", "User-Agent": "doma-yuga/1.0" }, signal: AbortSignal.timeout(8000) }
      );
      const geoData = await geoRes.json();
      if (geoData[0]) {
        const lat = parseFloat(geoData[0].lat);
        const lon = parseFloat(geoData[0].lon);
        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto&forecast_days=14`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (wRes.ok) weather = await wRes.json();
      }
    } catch { /* погода необязательна */ }

    // Формируем структурированные данные погоды для фронтенда
    let weatherDays: Array<{date:string; tmax:number; tmin:number; precip:number; code:number}> = [];
    if (weather?.daily) {
      const d = weather.daily;
      for (let i = 0; i < (d.time?.length ?? 0); i++) {
        weatherDays.push({
          date: d.time[i],
          tmax: Math.round(d.temperature_2m_max[i]),
          tmin: Math.round(d.temperature_2m_min[i]),
          precip: Math.round(d.precipitation_sum[i] * 10) / 10,
          code: d.weathercode[i],
        });
      }
    }

    // Текстовый анализ влияния погоды
    const rainDays   = weatherDays.filter(d => d.precip > 5).length;
    const frostDays  = weatherDays.filter(d => d.tmin < 0).length;
    const heavyRain  = weatherDays.filter(d => d.precip > 15);
    const weatherImpact = rainDays > 4
      ? `⚠ В ближайшие 2 недели ожидается ${rainDays} дождливых дней — возможны задержки наружных работ.`
      : frostDays > 3
      ? `⚠ Ожидается ${frostDays} дней с отрицательной температурой — ограничения на бетонные и штукатурные работы.`
      : `✓ Погодные условия благоприятны для строительства.`;

    let analysis = `**Текущий прогресс**\n`;
    analysis += `По проекту "${project.name}" выполнено ${completed} из ${allItems.length} позиций (${pct}%). `;
    analysis += `С начала работ (${project.startDate}) прошло ${daysElapsed} дней. `;
    if (scheduleAdherence != null) {
      analysis += `По плановому графику к этому моменту должно быть готово ${plannedByNow} позиций — фактически выполнено ${completedByNow} (${Math.round(scheduleAdherence * 100)}% графика).\n\n`;
    } else {
      analysis += ratePerWeek > 0 ? `Средний темп: ${ratePerWeek.toFixed(1)} позиций/неделю.\n\n` : `Активные работы ещё не начаты.\n\n`;
    }

    analysis += `**Прогноз завершения**\n`;
    if (remaining === 0) {
      analysis += `Все работы выполнены — проект завершён.\n\n`;
    } else {
      if (avgSlippageDays > 3) {
        analysis += `С учётом текущего отставания (в среднем на ${avgSlippageDays} дн.) проект завершится ориентировочно в ${endStr} — позже первоначального плана. `;
      } else {
        analysis += `При сохранении графика оставшиеся ${remaining} позиций будут выполнены ориентировочно в ${endStr}. `;
      }
      analysis += activeGroups.length > 0 ? `Сейчас в работе: ${activeGroups.join(", ")}.\n\n` : `Активных работ сейчас нет.\n\n`;
    }

    const groupsBreakdown = Object.entries(groups).map(([name, g]) => ({
      name,
      completed: g.completed,
      total: g.total,
      inProgress: g.inProgress,
      percentage: g.total > 0 ? Math.round(g.completed / g.total * 100) : 0,
    }));

    if (slowGroups.length > 0) {
      analysis += `\n**⚠ Отстают от графика**\n${slowGroups.join(", ")} — отстают от плановых дат.`;
      if (topOverdue.length > 0) {
        analysis += ` Сильнее всего просрочены: ${topOverdue.map(o => `«${o.name}» (${o.days} дн.)`).join(", ")}.`;
      }
      analysis += ` Рекомендуется усилить бригаду на этих участках.`;
    } else if (pct >= 80) {
      analysis += `\n**Итог**\nПроект близится к завершению. Финальный этап — контроль качества и сдача работ.`;
    } else if (pct >= 40) {
      analysis += `\n**Рекомендация**\nГрафик соблюдается. Для ускорения можно вести несколько групп работ параллельно.`;
    } else {
      analysis += `\n**Рекомендация**\nРаботы на начальном этапе и идут по графику. Важно придерживаться сроков с первых недель.`;
    }

    if (weatherDays.length > 0) {
      analysis += `\n\n**Погода на объекте**\n${weatherImpact}`;
      if (heavyRain.length > 0) {
        analysis += `\nОсобое внимание: сильные осадки (>${15}мм) ожидаются ${heavyRain.map(d => new Date(d.date).toLocaleDateString("ru-RU", {day:"numeric",month:"short"})).join(", ")}.`;
      }
    }

    res.json({ analysis, weather: weatherDays, groups: groupsBreakdown });
  });

  app.get("/api/dashboard/:uid", requireAdmin, async (req, res) => {
    const client = await storage.getClientByUid(req.params.uid as string);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }
    const projects = await storage.getProjectsByClientId(client.id);
    if (projects.length === 0) {
      return res.status(404).json({ error: "No projects found" });
    }
    const project = projects[0];
    const estimates = await storage.getEstimatesByProjectId(project.id);
    let totalItems = 0;
    let completedItems = 0;
    let totalEstimateSum = 0;
    const allEstimateItems = await storage.getEstimateItemsByEstimateIds(estimates.map(e => e.id));
    totalItems = allEstimateItems.length;
    completedItems = allEstimateItems.filter(i => i.status === "completed").length;
    totalEstimateSum = allEstimateItems.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0);
    const payments = await storage.getPaymentsByProjectId(project.id);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const unreadSender = req.session.role === "admin" ? "client" : "admin";
    const unreadCount = await storage.getUnreadCount(project.id, unreadSender);

    res.json({
      client,
      project,
      progress: {
        total: totalItems,
        completed: completedItems,
        percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      },
      financial: {
        totalEstimate: totalEstimateSum,
        totalPaid,
        remaining: totalEstimateSum - totalPaid,
      },
      unreadMessages: unreadCount,
    });
  });

  app.post("/api/admin/estimates", requireAdmin, async (req, res) => {
    const { projectId, category, title } = req.body;
    if (!projectId || !category || !title) {
      return res.status(400).json({ error: "projectId, category, title required" });
    }
    const estimate = await storage.createEstimate({ projectId, category, title });
    res.json(estimate);
  });

  app.post("/api/admin/estimate-items", requireAdmin, async (req, res) => {
    const parsed = insertEstimateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }
    const item = await storage.createEstimateItem(parsed.data);

    if (req.body.notifyClient) {
      const estimate = await storage.getEstimateById(item.estimateId);
      if (estimate) {
        const project = await storage.getProjectById(estimate.projectId);
        if (project) {
          await storage.createMessage({
            projectId: project.id,
            sender: "admin",
            text: `Добавлена дополнительная работа: «${item.name}» (${item.quantity} ${item.unit}, ${item.totalPrice} ₽). Это вне основной сметы.`,
            createdAt: new Date().toISOString(),
          });
          const { notifyExtraWork } = await import("./telegram");
          await notifyExtraWork(project.name, item.name, item.totalPrice);
        }
      }
    }

    res.json(item);
  });

  app.patch("/api/admin/estimate-items/:id", requireAdmin, async (req, res) => {
    const allowed = ["estimateId", "name", "date", "quantity", "unit", "unitPrice", "totalPrice", "status", "workGroup"];
    const filtered: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) filtered[key] = req.body[key];
    }
    const item = await storage.updateEstimateItem(parseInt(req.params.id as string), filtered);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }
    if (filtered.status !== undefined) {
      const estimate = await storage.getEstimateById(item.estimateId);
      if (estimate) await syncProjectStatusWithProgress(estimate.projectId);
    }
    res.json(item);
  });

  app.delete("/api/admin/estimate-items/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const photos = await storage.getPhotosByEstimateItemId(id);
    for (const photo of photos) {
      const url = await storage.deleteEstimateItemPhoto(photo.id);
      if (url) deleteUploadedFile(url);
    }
    const ok = await storage.deleteEstimateItem(id);
    if (!ok) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.json({ ok: true });
  });

  app.post("/api/admin/estimate-item-photos/upload", requireAdmin, uploadItemPhoto.single("photo"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const estimateItemId = parseInt(req.body.estimateItemId);
    if (!estimateItemId || isNaN(estimateItemId)) {
      return res.status(400).json({ error: "estimateItemId required" });
    }
    const existing = await storage.updateEstimateItem(estimateItemId, {});
    if (!existing) {
      return res.status(404).json({ error: "Estimate item not found" });
    }
    const url = "/uploads/" + path.relative(uploadsDir, req.file.path).replace(/\\/g, "/");
    const photo = await storage.createEstimateItemPhoto({ estimateItemId, url });
    const estimate = await storage.getEstimateById(existing.estimateId);
    if (estimate) {
      const project = await storage.getProjectById(estimate.projectId);
      if (project) {
        const { notifyNewPhoto } = await import("./telegram");
        notifyNewPhoto(project.name, existing.name);
      }
    }
    res.json(photo);
  });

  app.delete("/api/admin/estimate-item-photos/:id", requireAdmin, async (req, res) => {
    const url = await storage.deleteEstimateItemPhoto(parseInt(req.params.id as string));
    if (!url) {
      return res.status(404).json({ error: "Photo not found" });
    }
    deleteUploadedFile(url);
    res.json({ ok: true });
  });

  app.post("/api/admin/payments", requireAdmin, async (req, res) => {
    const parsed = insertPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }
    const payment = await storage.createPayment(parsed.data);
    const project = await storage.getProjectById(payment.projectId);
    if (project) {
      const { notifyPaymentReceived } = await import("./telegram");
      notifyPaymentReceived(project.name, Number(payment.amount));
    }
    res.json(payment);
  });

  app.patch("/api/admin/payments/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const parsed = insertPaymentSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const payment = await storage.updatePayment(id, parsed.data);
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.json(payment);
  });

  app.delete("/api/admin/payments/:id", requireAdmin, async (req, res) => {
    const ok = await storage.deletePayment(parseInt(req.params.id as string));
    if (!ok) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.json({ ok: true });
  });

  // Загрузка файла (PDF / Word / Excel)
  app.post("/api/admin/documents/upload", requireAdmin, uploadDoc.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Файл не загружен" });
    }
    const { projectId, name, type } = req.body;
    if (!projectId || !name || !type) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: "projectId, name и type обязательны" });
    }
    const url = "/uploads/" + path.relative(uploadsDir, req.file.path).replace(/\\/g, "/");
    const doc = await storage.createDocument({
      projectId: parseInt(projectId),
      name: name.trim(),
      url,
      type,
    });
    res.json(doc);
  });

  // Добавление документа по ссылке (обратная совместимость)
  app.post("/api/admin/documents", requireAdmin, async (req, res) => {
    const parsed = insertDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }
    const doc = await storage.createDocument(parsed.data);
    res.json(doc);
  });

  app.patch("/api/admin/documents/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const parsed = insertDocumentSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const doc = await storage.updateDocument(id, parsed.data);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(doc);
  });

  app.delete("/api/admin/documents/:id", requireAdmin, async (req, res) => {
    const url = await storage.deleteDocument(parseInt(req.params.id as string));
    if (!url) {
      return res.status(404).json({ error: "Document not found" });
    }
    deleteUploadedFile(url);
    res.json({ ok: true });
  });

  app.post("/api/admin/photos/upload", requireAdmin, uploadImage.single("photo"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const url = "/uploads/" + path.relative(uploadsDir, req.file.path).replace(/\\/g, "/");
    const parsed = insertPhotoSchema.safeParse({
      projectId: parseInt(req.body.projectId),
      url,
      caption: req.body.caption || "",
      date: req.body.date || new Date().toISOString().slice(0, 10),
    });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }
    const photo = await storage.createPhoto(parsed.data);
    res.json(photo);
  });

  app.post("/api/admin/photos", requireAdmin, async (req, res) => {
    const parsed = insertPhotoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }
    const photo = await storage.createPhoto(parsed.data);
    res.json(photo);
  });

  app.patch("/api/admin/photos/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const parsed = insertPhotoSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const photo = await storage.updatePhoto(id, parsed.data);
    if (!photo) {
      return res.status(404).json({ error: "Photo not found" });
    }
    res.json(photo);
  });

  app.delete("/api/admin/photos/:id", requireAdmin, async (req, res) => {
    const url = await storage.deletePhoto(parseInt(req.params.id as string));
    if (!url) {
      return res.status(404).json({ error: "Photo not found" });
    }
    deleteUploadedFile(url);
    res.json({ ok: true });
  });

  app.post("/api/admin/videos/upload", requireAdmin, uploadVideo.single("video"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const url = "/uploads/" + path.relative(uploadsDir, req.file.path).replace(/\\/g, "/");
    const parsed = insertVideoSchema.safeParse({
      projectId: parseInt(req.body.projectId),
      url,
      title: req.body.title || "",
      description: req.body.description || "",
      date: req.body.date || new Date().toISOString().slice(0, 10),
    });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }
    const video = await storage.createVideo(parsed.data);
    res.json(video);
  });

  app.post("/api/admin/videos", requireAdmin, async (req, res) => {
    const parsed = insertVideoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }
    const video = await storage.createVideo(parsed.data);
    res.json(video);
  });

  app.patch("/api/admin/videos/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const parsed = insertVideoSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const video = await storage.updateVideo(id, parsed.data);
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }
    res.json(video);
  });

  app.delete("/api/admin/videos/:id", requireAdmin, async (req, res) => {
    const url = await storage.deleteVideo(parseInt(req.params.id as string));
    if (!url) {
      return res.status(404).json({ error: "Video not found" });
    }
    deleteUploadedFile(url);
    res.json({ ok: true });
  });

  app.post("/api/admin/non-working-days", requireAdmin, async (req, res) => {
    const parsed = insertNonWorkingDaySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const day = await storage.createNonWorkingDay(parsed.data);
    res.json(day);
  });

  app.delete("/api/admin/non-working-days/:id", requireAdmin, async (req, res) => {
    const ok = await storage.deleteNonWorkingDay(parseInt(req.params.id as string));
    if (!ok) {
      return res.status(404).json({ error: "Non-working day not found" });
    }
    res.json({ ok: true });
  });

  app.get("/api/gallery", async (_req, res) => {
    const photos = await storage.getAllGalleryPhotos();
    res.json(photos);
  });

  app.post("/api/admin/gallery/upload", requireAdmin, uploadGallery.single("photo"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const url = "/uploads/" + path.relative(uploadsDir, req.file.path).replace(/\\/g, "/");
    const caption = req.body.caption || null;
    const category = req.body.category || "Общее";
    const photo = await storage.createGalleryPhoto({ url, caption, category });
    res.json(photo);
  });

  app.delete("/api/admin/gallery/:id", requireAdmin, async (req, res) => {
    const url = await storage.deleteGalleryPhoto(parseInt(req.params.id as string));
    if (!url) {
      return res.status(404).json({ error: "Gallery photo not found" });
    }
    deleteUploadedFile(url);
    res.json({ ok: true });
  });

  app.get("/api/project/:id/day-comments", requireProjectAccess, async (req, res) => {
    const comments = await storage.getDayCommentsByProjectId(parseInt(req.params.id as string));
    res.json(comments);
  });

  app.post("/api/project/:projectId/day-comments", requireAuth, requireProjectAccess, async (req, res) => {
    const projectId = parseInt(req.params.projectId as string);
    const { date, text } = req.body;
    if (!date || !text?.trim()) {
      return res.status(400).json({ error: "date and text required" });
    }
    const project = await storage.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    const sender = req.session.role === "admin" ? "admin" : "client";
    const comment = await storage.createDayComment({
      projectId,
      date,
      text: text.trim(),
      sender,
      createdAt: new Date().toISOString(),
    });

    if (sender === "client") {
      const { sendTelegramNotification } = await import("./telegram");
      let clientName = "Клиент";
      const client = await storage.getClientById(project.clientId);
      if (client) clientName = client.name;
      const appUrl = process.env.REPLIT_DEPLOYMENT_URL
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
        : `https://${process.env.REPLIT_DEV_DOMAIN}`;
      const link = `${appUrl}/cabinet/project/${projectId}?tab=work`;
      sendTelegramNotification(
        project.name,
        clientName,
        `📅 ${comment.date}\n${comment.text}\n\n🔗 ${link}`,
      );
    }

    res.json(comment);
  });

  app.patch("/api/project/:projectId/day-comments/:id", requireAuth, requireProjectAccess, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const projectId = parseInt(req.params.projectId as string);
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ error: "text required" });
    }
    const updated = await storage.updateDayComment(id, { text: text.trim() });
    if (!updated) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (req.session.role !== "admin") {
      const { sendTelegramNotification } = await import("./telegram");
      const project = await storage.getProjectById(projectId);
      let clientName = "Клиент";
      if (project) {
        const client = await storage.getClientById(project.clientId);
        if (client) clientName = client.name;
      }
      const appUrl = process.env.REPLIT_DEPLOYMENT_URL
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
        : `https://${process.env.REPLIT_DEV_DOMAIN}`;
      const link = `${appUrl}/cabinet/project/${projectId}?tab=work`;
      sendTelegramNotification(
        project?.name ?? `Проект #${projectId}`,
        clientName,
        `📅 ${updated.date} (изменено)\n${updated.text}\n\n🔗 ${link}`,
      );
    }

    res.json(updated);
  });

  app.delete("/api/project/:projectId/day-comments/:id", requireAuth, requireProjectAccess, async (req, res) => {
    const ok = await storage.deleteDayComment(parseInt(req.params.id as string));
    if (!ok) {
      return res.status(404).json({ error: "Comment not found" });
    }
    res.json({ ok: true });
  });

  app.post("/api/leads", leadsLimiter, async (req, res) => {
    try {
      const data = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(data);

      try {
        const { sendTelegramNotification } = await import("./telegram");
        let services = data.services;
        try { services = JSON.parse(data.services).join(", "); } catch {}
        const parts = [
          `📋 Услуги: ${services}`,
          data.objectType ? `🏠 Объект: ${data.objectType}` : null,
          data.area ? `📐 Площадь: ${data.area} м²` : null,
          data.budget ? `💰 Бюджет: ${data.budget}` : null,
          data.timeline ? `⏱ Сроки: ${data.timeline}` : null,
          data.city ? `📍 Город: ${data.city}` : null,
          data.description ? `📝 ${data.description}` : null,
          `📞 ${data.phone}`,
          data.email ? `✉️ ${data.email}` : null,
        ].filter(Boolean).join("\n");
        sendTelegramNotification("Новая заявка с сайта", data.name, parts);
      } catch (err) {
        console.error("lead telegram error:", err);
      }

      return res.status(201).json({ ok: true, id: lead.id });
    } catch (e) {
      console.error("create lead error:", e);
      return res.status(400).json({ error: "Не удалось сохранить заявку" });
    }
  });

  app.get("/api/faq-chat/status", async (_req, res) => {
    const { isFaqBotConfigured } = await import("./faqBot");
    res.json({ available: isFaqBotConfigured() });
  });

  app.post("/api/faq-chat", faqChatLimiter, async (req, res) => {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
      return res.status(400).json({ error: "Некорректный запрос" });
    }
    const history = messages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (history.length === 0) {
      return res.status(400).json({ error: "Некорректный запрос" });
    }
    const userMessages = history.filter((m) => m.role === "user");
    if (userMessages.length === 1) {
      const notificationsEnabled = await storage.getSetting("faqTelegramNotificationsEnabled");
      if (notificationsEnabled !== "false") {
        const { sendTelegramText } = await import("./telegram");
        sendTelegramText(`🤖 Вопрос в FAQ-чате на сайте\n\n${userMessages[0].content}`).catch(() => {});
      }
    }
    try {
      const { askFaqBot } = await import("./faqBot");
      const reply = await askFaqBot(history);
      res.json({ reply });
    } catch (err) {
      console.error("faq-chat error:", err);
      res.status(503).json({ error: "Бот временно недоступен. Оставьте заявку, и менеджер ответит вам." });
    }
  });

  app.get("/api/admin/dashboard-summary", requireAdmin, async (_req, res) => {
    const projects = await storage.getAllProjects();
    let activeCount = 0;
    let overdueCount = 0;
    let overdueTotal = 0;
    let completedCount = 0;

    for (const project of projects) {
      if (project.status === "completed") completedCount++;
      if (project.status !== "active") continue;
      activeCount++;

      const estimates = await storage.getEstimatesByProjectId(project.id);
      const items = await storage.getEstimateItemsByEstimateIds(estimates.map((e) => e.id));
      const totalEstimateSum = items.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0);
      const payments = await storage.getPaymentsByProjectId(project.id);
      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const remaining = totalEstimateSum - totalPaid;
      if (remaining > 0) {
        overdueCount++;
        overdueTotal += remaining;
      }
    }

    res.json({ activeCount, overdueCount, overdueTotal, completedCount, totalCount: projects.length });
  });

  app.get("/api/admin/projects-debt", requireAdmin, async (_req, res) => {
    const projects = await storage.getAllProjects();
    const debtByProjectId: Record<number, number> = {};

    for (const project of projects) {
      if (project.status !== "active") continue;
      const estimates = await storage.getEstimatesByProjectId(project.id);
      const items = await storage.getEstimateItemsByEstimateIds(estimates.map((e) => e.id));
      const totalEstimateSum = items.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0);
      const payments = await storage.getPaymentsByProjectId(project.id);
      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const remaining = totalEstimateSum - totalPaid;
      if (remaining > 0) {
        debtByProjectId[project.id] = remaining;
      }
    }

    res.json(debtByProjectId);
  });

  app.get("/api/admin/reminders-summary", requireAdminOrStaff, async (req, res) => {
    const isStaffOnly = req.session.role === "staff";
    let reminders = await storage.getAllClientReminders();
    if (isStaffOnly) {
      reminders = reminders.filter((r) => r.assignedToUserId === req.session.userId);
    }
    const clients = await storage.getAllClients();
    const clientById = new Map(clients.map((c) => [c.id, c]));
    const projects = await storage.getAllProjects();
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const users = await storage.getAllUsers();
    const userById = new Map(users.map((u) => [u.id, u]));
    const today = new Date().toISOString().slice(0, 10);
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().slice(0, 10);

    const enrich = (r: ClientReminder) => ({
      ...r,
      clientName: clientById.get(r.clientId)?.name ?? "—",
      projectName: r.projectId != null ? projectById.get(r.projectId)?.name ?? null : null,
      assignedToName: r.assignedToUserId != null ? userById.get(r.assignedToUserId)?.username ?? null : null,
    });

    const pending = reminders.filter((r) => r.status === "pending");
    const burning = pending
      .filter((r) => r.priority === "urgent" || (r.dueDate && r.dueDate <= today))
      .map(enrich)
      .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
    const upcoming = pending
      .filter((r) => !burning.some((b) => b.id === r.id) && r.dueDate && r.dueDate > today && r.dueDate <= in7DaysStr)
      .map(enrich)
      .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));

    res.json({ burning, upcoming });
  });

  app.get("/api/admin/reminders", requireAdminOrStaff, async (req, res) => {
    let reminders = await storage.getAllClientReminders();
    if (req.session.role === "staff") {
      reminders = reminders.filter((r) => r.assignedToUserId === req.session.userId);
    }
    const clients = await storage.getAllClients();
    const clientById = new Map(clients.map((c) => [c.id, c]));
    const projects = await storage.getAllProjects();
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const users = await storage.getAllUsers();
    const userById = new Map(users.map((u) => [u.id, u]));
    const result = reminders
      .map((r) => ({
        ...r,
        clientName: clientById.get(r.clientId)?.name ?? "—",
        projectName: r.projectId != null ? projectById.get(r.projectId)?.name ?? null : null,
        assignedToName: r.assignedToUserId != null ? userById.get(r.assignedToUserId)?.username ?? null : null,
      }))
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
        return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      });
    res.json(result);
  });

  app.get("/api/admin/settings/faq-telegram-notifications", requireAdmin, async (_req, res) => {
    const value = await storage.getSetting("faqTelegramNotificationsEnabled");
    res.json({ enabled: value !== "false" });
  });

  app.put("/api/admin/settings/faq-telegram-notifications", requireAdmin, async (req, res) => {
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ error: "enabled must be a boolean" });
    }
    await storage.setSetting("faqTelegramNotificationsEnabled", enabled ? "true" : "false");
    res.json({ enabled });
  });

  app.get("/api/admin/leads", requireAdmin, async (_req, res) => {
    const all = await storage.getLeads();
    res.json(all);
  });

  const LEAD_STATUSES = ["new", "called", "working", "done", "declined"];
  app.patch("/api/admin/leads/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const update: { status?: string; notes?: string } = {};
    if (typeof req.body.status === "string") {
      if (!LEAD_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      update.status = req.body.status;
    }
    if (typeof req.body.notes === "string") {
      update.notes = req.body.notes;
    }
    const lead = await storage.updateLead(id, update);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.json(lead);
  });

  app.delete("/api/admin/leads/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const ok = await storage.deleteLead(id);
    if (!ok) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.status(204).end();
  });

  app.get("/api/work-groups", async (_req, res) => {
    const groups = await storage.getWorkGroups();
    res.json(groups);
  });

  app.post("/api/admin/work-groups", requireAdmin, async (req, res) => {
    const parsed = insertWorkGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    try {
      const group = await storage.createWorkGroup(parsed.data);
      res.status(201).json(group);
    } catch (err) {
      console.error("create work group error:", err);
      res.status(400).json({ error: "Такая группа уже существует" });
    }
  });

  app.patch("/api/admin/work-groups/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const parsed = insertWorkGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    try {
      const group = await storage.updateWorkGroup(id, parsed.data);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      res.json(group);
    } catch (err) {
      console.error("update work group error:", err);
      res.status(400).json({ error: "Такая группа уже существует" });
    }
  });

  app.delete("/api/admin/work-groups/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const ok = await storage.deleteWorkGroup(id);
    if (!ok) {
      return res.status(404).json({ error: "Group not found" });
    }
    res.status(204).end();
  });

  return httpServer;
}
