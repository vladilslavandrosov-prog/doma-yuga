import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
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
} from "@shared/schema";

const uploadsDir = process.env.NODE_ENV === "production" ? "/data/uploads" : path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const uploadStorage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const uploadImage = multer({
  storage: uploadStorage,
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
  storage: uploadStorage,
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

const uploadDoc = multer({
  storage: uploadStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_DOC_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Поддерживаются PDF, Word, Excel"));
    }
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

/**
 * IDOR-защита: если в сессии есть клиент — он может обращаться
 * только к своим проектам. Администратор и неавторизованный (демо)
 * проходят без ограничений.
 */
async function requireProjectAccess(req: Request, res: Response, next: NextFunction) {
  // Нет сессии → публичный/демо-доступ
  if (!req.session.userId) return next();
  // Администратор → без ограничений
  if (req.session.role === "admin") return next();
  // Клиент → проверяем владельца
  const rawId = req.params.id ?? req.params.projectId;
  const projectId = parseInt(rawId);
  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/login", async (req, res) => {
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

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new passwords required" });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
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
    const id = parseInt(req.params.id);
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

  app.post("/api/admin/projects", requireAdmin, async (req, res) => {
    const parsed = insertProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const project = await storage.createProject(parsed.data);
    res.json(project);
  });

  app.patch("/api/admin/projects/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
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

  app.get("/api/client-projects", requireAuth, async (req, res) => {
    if (!req.session.clientId) {
      return res.json([]);
    }
    const projects = await storage.getProjectsByClientId(req.session.clientId);
    res.json(projects);
  });

  app.get("/api/projects", async (req, res) => {
    const projects = await storage.getAllProjects();
    res.json(projects);
  });

  app.get("/api/client/:uid", async (req, res) => {
    const client = await storage.getClientByUid(req.params.uid);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }
    res.json(client);
  });

  app.get("/api/client/:uid/projects", async (req, res) => {
    const client = await storage.getClientByUid(req.params.uid);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }
    const projects = await storage.getProjectsByClientId(client.id);
    res.json(projects);
  });

  app.get("/api/project/:id", requireProjectAccess, async (req, res) => {
    const project = await storage.getProjectById(parseInt(req.params.id));
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  });

  app.get("/api/project/:id/client", requireProjectAccess, async (req, res) => {
    const project = await storage.getProjectById(parseInt(req.params.id));
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    const client = await storage.getClientById(project.clientId);
    res.json(client ?? null);
  });

  app.get("/api/project/:id/estimates", requireProjectAccess, async (req, res) => {
    const projectId = parseInt(req.params.id);
    const estimates = await storage.getEstimatesByProjectId(projectId);
    const result = [];
    for (const est of estimates) {
      const items = await storage.getEstimateItemsByEstimateId(est.id);
      const itemIds = items.map(i => i.id);
      const photos = itemIds.length > 0 ? await storage.getPhotosByEstimateItemIds(itemIds) : [];
      const itemsWithPhotos = items.map(item => ({
        ...item,
        photos: photos.filter(p => p.estimateItemId === item.id),
      }));
      result.push({ ...est, items: itemsWithPhotos });
    }
    res.json(result);
  });

  app.get("/api/project/:id/payments", requireProjectAccess, async (req, res) => {
    const payments = await storage.getPaymentsByProjectId(parseInt(req.params.id));
    res.json(payments);
  });

  app.get("/api/project/:id/documents", requireProjectAccess, async (req, res) => {
    const documents = await storage.getDocumentsByProjectId(parseInt(req.params.id));
    res.json(documents);
  });

  app.get("/api/project/:id/photos", requireProjectAccess, async (req, res) => {
    const photos = await storage.getPhotosByProjectId(parseInt(req.params.id));
    res.json(photos);
  });

  app.get("/api/project/:id/videos", requireProjectAccess, async (req, res) => {
    const videos = await storage.getVideosByProjectId(parseInt(req.params.id));
    res.json(videos);
  });

  app.get("/api/project/:id/non-working-days", requireProjectAccess, async (req, res) => {
    const days = await storage.getNonWorkingDaysByProjectId(parseInt(req.params.id));
    res.json(days);
  });

  app.get("/api/project/:id/messages", requireProjectAccess, async (req, res) => {
    const messages = await storage.getMessagesByProjectId(parseInt(req.params.id));
    res.json(messages);
  });

  app.post("/api/project/:id/messages", requireAuth, requireProjectAccess, async (req, res) => {
    const projectId = parseInt(req.params.id);
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
    const projectId = parseInt(req.params.id);
    const senderToMark = req.session.role === "admin" ? "client" : "admin";
    await storage.markMessagesAsRead(projectId, senderToMark);
    res.json({ ok: true });
  });

  app.get("/api/project/:id/unread", requireProjectAccess, async (req, res) => {
    const projectId = parseInt(req.params.id);
    const unreadSender = req.session.role === "admin" ? "client" : "admin";
    const count = await storage.getUnreadCount(projectId, unreadSender);
    res.json({ count });
  });

  app.get("/api/dashboard/project/:id", requireProjectAccess, async (req, res) => {
    const projectId = parseInt(req.params.id);
    const project = await storage.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    const client = await storage.getClientById(project.clientId);
    const estimates = await storage.getEstimatesByProjectId(project.id);
    let totalItems = 0;
    let completedItems = 0;
    let totalEstimateSum = 0;
    for (const est of estimates) {
      const items = await storage.getEstimateItemsByEstimateId(est.id);
      totalItems += items.length;
      completedItems += items.filter(i => i.status === "completed").length;
      totalEstimateSum += items.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0);
    }
    const payments = await storage.getPaymentsByProjectId(project.id);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const unreadSender = req.session.role === "admin" ? "client" : "admin";
    const unreadCount = await storage.getUnreadCount(project.id, unreadSender);

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
    });
  });

  app.post("/api/project/:id/ai-timeline", requireProjectAccess, async (req, res) => {
    const projectId = parseInt(req.params.id);
    const project = await storage.getProjectById(projectId);
    if (!project) return res.status(404).json({ error: "Not found" });

    const estimates = await storage.getEstimatesByProjectId(projectId);
    const allItems: any[] = [];
    for (const est of estimates) {
      const items = await storage.getEstimateItemsByEstimateId(est.id);
      items.forEach(i => allItems.push({ ...i, category: est.title }));
    }

    const completed = allItems.filter(i => i.status === "completed").length;
    const inProgress = allItems.filter(i => i.status === "in_progress").length;
    const planned = allItems.filter(i => i.status === "planned").length;

    const groups: Record<string, { total: number; completed: number; inProgress: number }> = {};
    for (const item of allItems) {
      const g = item.workGroup ?? item.category ?? "Прочее";
      if (!groups[g]) groups[g] = { total: 0, completed: 0, inProgress: 0 };
      groups[g].total++;
      if (item.status === "completed") groups[g].completed++;
      if (item.status === "in_progress") groups[g].inProgress++;
    }

    const groupsSummary = Object.entries(groups)
      .map(([name, g]) => `  - ${name}: выполнено ${g.completed}/${g.total}${g.inProgress > 0 ? `, в работе ${g.inProgress}` : ""}`)
      .join("\n");

    const prompt = `Ты — эксперт по строительству в России. Проанализируй прогресс строительного проекта и дай прогноз сроков завершения.

Проект: "${project.name}"
Адрес: ${project.address}
Дата начала: ${project.startDate}
Статус: ${project.status}

Прогресс работ:
- Всего позиций: ${allItems.length}
- Выполнено: ${completed} (${allItems.length > 0 ? Math.round(completed / allItems.length * 100) : 0}%)
- В работе: ${inProgress}
- Запланировано: ${planned}

По группам работ:
${groupsSummary || "  - данные не указаны"}

Дай краткий анализ (3-5 абзацев на русском языке):
1. Оценка текущего темпа строительства
2. Прогноз даты завершения (укажи конкретный месяц и год)
3. Риски и узкие места
4. Рекомендации для ускорения

Пиши конкретно, без лишних вводных слов.`;

    try {
      const response = await fetch("https://text.pollinations.ai/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai",
          messages: [{ role: "user", content: prompt }],
          stream: false,
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) throw new Error(`AI status ${response.status}`);
      const data = await response.json() as any;
      const text: string = data?.choices?.[0]?.message?.content ?? "";
      if (!text) throw new Error("Empty response");
      res.json({ analysis: text.trim() });
    } catch (err) {
      console.error("AI timeline error:", err);
      res.status(503).json({ error: "Сервис AI временно недоступен. Попробуйте позже." });
    }
  });

  app.get("/api/dashboard/:uid", async (req, res) => {
    const client = await storage.getClientByUid(req.params.uid);
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
    for (const est of estimates) {
      const items = await storage.getEstimateItemsByEstimateId(est.id);
      totalItems += items.length;
      completedItems += items.filter(i => i.status === "completed").length;
      totalEstimateSum += items.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0);
    }
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
    res.json(item);
  });

  app.patch("/api/admin/estimate-items/:id", requireAdmin, async (req, res) => {
    const allowed = ["estimateId", "name", "date", "quantity", "unit", "unitPrice", "totalPrice", "status", "workGroup"];
    const filtered: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) filtered[key] = req.body[key];
    }
    const item = await storage.updateEstimateItem(parseInt(req.params.id), filtered);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.json(item);
  });

  app.delete("/api/admin/estimate-items/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
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

  app.post("/api/admin/estimate-item-photos/upload", requireAdmin, uploadImage.single("photo"), async (req, res) => {
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
    const url = `/uploads/${req.file.filename}`;
    const photo = await storage.createEstimateItemPhoto({ estimateItemId, url });
    res.json(photo);
  });

  app.delete("/api/admin/estimate-item-photos/:id", requireAdmin, async (req, res) => {
    const url = await storage.deleteEstimateItemPhoto(parseInt(req.params.id));
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
    res.json(payment);
  });

  app.delete("/api/admin/payments/:id", requireAdmin, async (req, res) => {
    const ok = await storage.deletePayment(parseInt(req.params.id));
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
    const url = `/uploads/${req.file.filename}`;
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

  app.delete("/api/admin/documents/:id", requireAdmin, async (req, res) => {
    const url = await storage.deleteDocument(parseInt(req.params.id));
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
    const url = `/uploads/${req.file.filename}`;
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

  app.delete("/api/admin/photos/:id", requireAdmin, async (req, res) => {
    const url = await storage.deletePhoto(parseInt(req.params.id));
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
    const url = `/uploads/${req.file.filename}`;
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

  app.delete("/api/admin/videos/:id", requireAdmin, async (req, res) => {
    const url = await storage.deleteVideo(parseInt(req.params.id));
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
    const ok = await storage.deleteNonWorkingDay(parseInt(req.params.id));
    if (!ok) {
      return res.status(404).json({ error: "Non-working day not found" });
    }
    res.json({ ok: true });
  });

  app.get("/api/gallery", async (_req, res) => {
    const photos = await storage.getAllGalleryPhotos();
    res.json(photos);
  });

  app.post("/api/admin/gallery/upload", requireAdmin, uploadImage.single("photo"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    const caption = req.body.caption || null;
    const category = req.body.category || "Общее";
    const photo = await storage.createGalleryPhoto({ url, caption, category });
    res.json(photo);
  });

  app.delete("/api/admin/gallery/:id", requireAdmin, async (req, res) => {
    const url = await storage.deleteGalleryPhoto(parseInt(req.params.id));
    if (!url) {
      return res.status(404).json({ error: "Gallery photo not found" });
    }
    deleteUploadedFile(url);
    res.json({ ok: true });
  });

  app.get("/api/project/:id/day-comments", requireProjectAccess, async (req, res) => {
    const comments = await storage.getDayCommentsByProjectId(parseInt(req.params.id));
    res.json(comments);
  });

  app.post("/api/project/:projectId/day-comments", requireAuth, requireProjectAccess, async (req, res) => {
    const projectId = parseInt(req.params.projectId);
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
    const id = parseInt(req.params.id);
    const projectId = parseInt(req.params.projectId);
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
    const ok = await storage.deleteDayComment(parseInt(req.params.id));
    if (!ok) {
      return res.status(404).json({ error: "Comment not found" });
    }
    res.json({ ok: true });
  });

  app.post("/api/leads", async (req, res) => {
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

  app.get("/api/admin/leads", requireAdmin, async (_req, res) => {
    const all = await storage.getLeads();
    res.json(all);
  });

  const LEAD_STATUSES = ["new", "called", "working", "done", "declined"];
  app.patch("/api/admin/leads/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
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

  // ── Ландшафтный дизайн ───────────────────────────────────────
  app.get("/api/project/:id/landscape-files", requireProjectAccess, async (req, res) => {
    const files = await storage.getLandscapeFilesByProjectId(parseInt(req.params.id));
    res.json(files);
  });

  app.post("/api/admin/landscape-files/upload", requireAdmin, uploadDoc.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    const file = await storage.createLandscapeFile({
      projectId: parseInt(req.body.projectId),
      url,
      name: req.body.name || req.file.originalname,
      type: req.body.type || "egrn",
      createdAt: new Date().toISOString(),
    });
    res.json(file);
  });

  app.delete("/api/admin/landscape-files/:id", requireAdmin, async (req, res) => {
    const url = await storage.deleteLandscapeFile(parseInt(req.params.id));
    if (url) deleteUploadedFile(url);
    res.json({ ok: true });
  });

  app.get("/api/project/:id/landscape-designs", requireProjectAccess, async (req, res) => {
    const designs = await storage.getLandscapeDesignsByProjectId(parseInt(req.params.id));
    res.json(designs);
  });

  app.post("/api/admin/landscape-designs", requireAdmin, async (req, res) => {
    const design = await storage.createLandscapeDesign({
      projectId: parseInt(req.body.projectId),
      questionnaire: JSON.stringify(req.body.questionnaire),
      generatedImageUrl: req.body.generatedImageUrl || null,
      status: req.body.status || "pending",
      createdAt: new Date().toISOString(),
    });
    res.json(design);
  });

  app.post("/api/admin/landscape-designs/generate", requireAdmin, async (req, res) => {
    const { projectId, questionnaire, prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt required" });

    try {
      const encoded = encodeURIComponent(prompt);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encoded}?width=800&height=600&nologo=true&seed=${Date.now()}`;

      const imgRes = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(60000) });
      if (!imgRes.ok) throw new Error("Pollinations error");

      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const filename = `landscape-${Date.now()}.jpg`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, buffer);
      const localUrl = `/uploads/${filename}`;

      const design = await storage.createLandscapeDesign({
        projectId: parseInt(projectId),
        questionnaire: JSON.stringify(questionnaire),
        generatedImageUrl: localUrl,
        status: "done",
        createdAt: new Date().toISOString(),
      });
      res.json(design);
    } catch {
      res.status(503).json({ error: "Не удалось сгенерировать изображение. Попробуйте ещё раз." });
    }
  });

  app.patch("/api/admin/landscape-designs/:id", requireAdmin, async (req, res) => {
    const design = await storage.updateLandscapeDesign(parseInt(req.params.id), req.body);
    if (!design) return res.status(404).json({ error: "Not found" });
    res.json(design);
  });

  app.delete("/api/admin/landscape-designs/:id", requireAdmin, async (req, res) => {
    await storage.deleteLandscapeDesign(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ── План дома ─────────────────────────────────────────────────
  app.get("/api/project/:id/house-plan", requireProjectAccess, async (req, res) => {
    const plan = await storage.getHousePlanByProjectId(parseInt(req.params.id));
    res.json(plan ?? null);
  });

  app.put("/api/admin/house-plan", requireAdmin, async (req, res) => {
    const plan = await storage.upsertHousePlan({
      projectId: parseInt(req.body.projectId),
      cadastralNumber: req.body.cadastralNumber || null,
      communicationsNotes: req.body.communicationsNotes || null,
      communicationsGeojson: req.body.communicationsGeojson ?? null,
      updatedAt: new Date().toISOString(),
    });
    res.json(plan);
  });

  app.put("/api/admin/house-plan/geojson", requireAdmin, async (req, res) => {
    const projectId = parseInt(req.body.projectId);
    const existing = await storage.getHousePlanByProjectId(projectId);
    const plan = await storage.upsertHousePlan({
      projectId,
      cadastralNumber: existing?.cadastralNumber ?? null,
      communicationsNotes: existing?.communicationsNotes ?? null,
      communicationsGeojson: req.body.communicationsGeojson ?? null,
      updatedAt: new Date().toISOString(),
    });
    res.json(plan);
  });

  app.get("/api/project/:id/house-plan-files", requireProjectAccess, async (req, res) => {
    const files = await storage.getHousePlanFilesByProjectId(parseInt(req.params.id));
    res.json(files);
  });

  app.post("/api/admin/house-plan-files/upload", requireAdmin, uploadDoc.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    const file = await storage.createHousePlanFile({
      projectId: parseInt(req.body.projectId),
      url,
      name: req.body.name || req.file.originalname,
      type: req.body.type || "cadastral",
      createdAt: new Date().toISOString(),
    });
    res.json(file);
  });

  app.delete("/api/admin/house-plan-files/:id", requireAdmin, async (req, res) => {
    const url = await storage.deleteHousePlanFile(parseInt(req.params.id));
    if (url) deleteUploadedFile(url);
    res.json({ ok: true });
  });

  return httpServer;
}
