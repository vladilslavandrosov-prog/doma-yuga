import {
  type Client, type InsertClient,
  type Project, type InsertProject,
  type Estimate, type InsertEstimate,
  type EstimateItem, type InsertEstimateItem,
  type Payment, type InsertPayment,
  type Document, type InsertDocument,
  type Photo, type InsertPhoto,
  type Video, type InsertVideo,
  type Message, type InsertMessage,
  type User, type InsertUser,
} from "@shared/schema";

export interface IStorage {
  getClientByUid(uid: string): Promise<Client | undefined>;
  getProjectsByClientId(clientId: number): Promise<Project[]>;
  getProjectById(id: number): Promise<Project | undefined>;
  getEstimatesByProjectId(projectId: number): Promise<Estimate[]>;
  getEstimateItemsByEstimateId(estimateId: number): Promise<EstimateItem[]>;
  getPaymentsByProjectId(projectId: number): Promise<Payment[]>;
  getDocumentsByProjectId(projectId: number): Promise<Document[]>;
  getPhotosByProjectId(projectId: number): Promise<Photo[]>;
  getMessagesByProjectId(projectId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(projectId: number, sender: string): Promise<void>;
  getUnreadCount(projectId: number, sender: string): Promise<number>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createEstimate(est: InsertEstimate): Promise<Estimate>;
  createEstimateItem(item: InsertEstimateItem): Promise<EstimateItem>;
  updateEstimateItem(id: number, data: Partial<InsertEstimateItem>): Promise<EstimateItem | undefined>;
  deleteEstimateItem(id: number): Promise<boolean>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  deletePayment(id: number): Promise<boolean>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<boolean>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  deletePhoto(id: number): Promise<boolean>;
  getVideosByProjectId(projectId: number): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  deleteVideo(id: number): Promise<boolean>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined>;
  createClient(client: InsertClient): Promise<Client>;
}

export class MemStorage implements IStorage {
  private clients: Map<number, Client> = new Map();
  private projects: Map<number, Project> = new Map();
  private estimates: Map<number, Estimate> = new Map();
  private estimateItems: Map<number, EstimateItem> = new Map();
  private payments: Map<number, Payment> = new Map();
  private documents: Map<number, Document> = new Map();
  private photos: Map<number, Photo> = new Map();
  private videos: Map<number, Video> = new Map();
  private messages: Map<number, Message> = new Map();
  private users: Map<number, User> = new Map();
  private nextId = 100;

  constructor() {
    this.seedData();
  }

  private seedData() {
    const client: Client = { id: 1, name: "Иванов Сергей Петрович", phone: "+7 (918) 123-45-67", email: "ivanov@mail.ru", uid: "demo-uid-123" };
    this.clients.set(1, client);

    const project: Project = { id: 1, name: "Жилой дом", address: "Борисовка, ул. Ад. Матвеева, 15", startDate: "2026-01-07", status: "active", clientId: 1 };
    this.projects.set(1, project);

    const est1: Estimate = { id: 1, projectId: 1, category: "works", title: "Ландшафтные работы" };
    const est2: Estimate = { id: 2, projectId: 1, category: "materials", title: "Строительные материалы" };
    this.estimates.set(1, est1);
    this.estimates.set(2, est2);

    const items: EstimateItem[] = [
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
    ];
    items.forEach(item => this.estimateItems.set(item.id, item));

    const matItems: EstimateItem[] = [
      { id: 11, estimateId: 2, date: "2026-01-08", name: "Бетон М300", quantity: "85", unit: "м³", unitPrice: "5200", totalPrice: "442000", status: "completed" },
      { id: 12, estimateId: 2, date: "2026-01-08", name: "Арматура А500 d12", quantity: "3200", unit: "кг", unitPrice: "75", totalPrice: "240000", status: "completed" },
      { id: 13, estimateId: 2, date: "2026-01-20", name: "Кирпич керамический", quantity: "28000", unit: "шт", unitPrice: "18", totalPrice: "504000", status: "in_progress" },
      { id: 14, estimateId: 2, date: "2026-02-01", name: "Утеплитель минвата 100мм", quantity: "320", unit: "м²", unitPrice: "420", totalPrice: "134400", status: "planned" },
      { id: 15, estimateId: 2, date: "2026-02-15", name: "Металлочерепица", quantity: "230", unit: "м²", unitPrice: "850", totalPrice: "195500", status: "planned" },
    ];
    matItems.forEach(item => this.estimateItems.set(item.id, item));

    const paymentList: Payment[] = [
      { id: 1, projectId: 1, amount: "500000", date: "2026-01-05", description: "Аванс на начало работ" },
      { id: 2, projectId: 1, amount: "350000", date: "2026-01-20", description: "Оплата фундаментных работ" },
      { id: 3, projectId: 1, amount: "200000", date: "2026-02-01", description: "Оплата материалов (кирпич)" },
    ];
    paymentList.forEach(p => this.payments.set(p.id, p));

    const docList: Document[] = [
      { id: 1, projectId: 1, name: "Договор подряда №127", url: "/docs/contract.pdf", type: "contract" },
      { id: 2, projectId: 1, name: "Проектная документация", url: "/docs/project.pdf", type: "project" },
      { id: 3, projectId: 1, name: "Смета на фундаментные работы", url: "/docs/estimate-fund.pdf", type: "estimate" },
      { id: 4, projectId: 1, name: "Акт выполненных работ №1", url: "/docs/act-1.pdf", type: "act" },
      { id: 5, projectId: 1, name: "Разрешение на строительство", url: "/docs/permit.pdf", type: "permit" },
    ];
    docList.forEach(d => this.documents.set(d.id, d));

    const photoList: Photo[] = [
      { id: 1, projectId: 1, url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800", caption: "Подготовка площадки", date: "2026-01-10" },
      { id: 2, projectId: 1, url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800", caption: "Земляные работы", date: "2026-01-12" },
      { id: 3, projectId: 1, url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800", caption: "Армирование фундамента", date: "2026-01-15" },
      { id: 4, projectId: 1, url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800", caption: "Заливка бетона", date: "2026-01-20" },
      { id: 5, projectId: 1, url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800", caption: "Фундамент готов", date: "2026-01-25" },
      { id: 6, projectId: 1, url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800", caption: "Начало кладки стен", date: "2026-02-01" },
    ];
    photoList.forEach(p => this.photos.set(p.id, p));

    const videoList: Video[] = [
      { id: 1, projectId: 1, url: "/uploads/construction_house_demo.mp4", title: "Обзор строительной площадки", description: "Общий вид объекта с высоты — этап фундаментных работ", date: "2026-01-20" },
    ];
    videoList.forEach(v => this.videos.set(v.id, v));

    const msgList: Message[] = [
      { id: 1, projectId: 1, sender: "admin", text: "Здравствуйте! Работы по фундаменту начаты по графику.", createdAt: "2026-01-10T09:00:00", isRead: true },
      { id: 2, projectId: 1, sender: "client", text: "Отлично, спасибо за информацию!", createdAt: "2026-01-10T10:30:00", isRead: true },
      { id: 3, projectId: 1, sender: "admin", text: "Заливка фундамента завершена на 60%. Фото прилагаем.", createdAt: "2026-01-22T14:00:00", isRead: true },
      { id: 4, projectId: 1, sender: "admin", text: "Напоминаем об оплате следующего этапа — кладка стен.", createdAt: "2026-02-01T11:00:00", isRead: false },
    ];
    msgList.forEach(m => this.messages.set(m.id, m));

    const userList: User[] = [
      { id: 1, username: "admin", password: "admin123", role: "admin", clientId: null },
      { id: 2, username: "client", password: "client123", role: "client", clientId: 1 },
    ];
    userList.forEach(u => this.users.set(u.id, u));
  }

  async getClientByUid(uid: string): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(c => c.uid === uid);
  }

  async getProjectsByClientId(clientId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(p => p.clientId === clientId);
  }

  async getProjectById(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getEstimatesByProjectId(projectId: number): Promise<Estimate[]> {
    return Array.from(this.estimates.values()).filter(e => e.projectId === projectId);
  }

  async getEstimateItemsByEstimateId(estimateId: number): Promise<EstimateItem[]> {
    return Array.from(this.estimateItems.values()).filter(i => i.estimateId === estimateId);
  }

  async getPaymentsByProjectId(projectId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(p => p.projectId === projectId);
  }

  async getDocumentsByProjectId(projectId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(d => d.projectId === projectId);
  }

  async getPhotosByProjectId(projectId: number): Promise<Photo[]> {
    return Array.from(this.photos.values()).filter(p => p.projectId === projectId);
  }

  async getMessagesByProjectId(projectId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(m => m.projectId === projectId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    const id = this.nextId++;
    const message: Message = { ...msg, id, isRead: msg.isRead ?? false };
    this.messages.set(id, message);
    return message;
  }

  async markMessagesAsRead(projectId: number, sender: string): Promise<void> {
    for (const msg of this.messages.values()) {
      if (msg.projectId === projectId && msg.sender === sender) {
        msg.isRead = true;
      }
    }
  }

  async getUnreadCount(projectId: number, sender: string): Promise<number> {
    return Array.from(this.messages.values()).filter(m => m.projectId === projectId && m.sender === sender && !m.isRead).length;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async createEstimate(est: InsertEstimate): Promise<Estimate> {
    const id = this.nextId++;
    const estimate: Estimate = { ...est, id };
    this.estimates.set(id, estimate);
    return estimate;
  }

  async createEstimateItem(item: InsertEstimateItem): Promise<EstimateItem> {
    const id = this.nextId++;
    const estimateItem: EstimateItem = { ...item, id, status: item.status ?? "planned" };
    this.estimateItems.set(id, estimateItem);
    return estimateItem;
  }

  async updateEstimateItem(id: number, data: Partial<InsertEstimateItem>): Promise<EstimateItem | undefined> {
    const existing = this.estimateItems.get(id);
    if (!existing) return undefined;
    const updated: EstimateItem = { ...existing, ...data };
    this.estimateItems.set(id, updated);
    return updated;
  }

  async deleteEstimateItem(id: number): Promise<boolean> {
    return this.estimateItems.delete(id);
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.nextId++;
    const p: Payment = { ...payment, id };
    this.payments.set(id, p);
    return p;
  }

  async deletePayment(id: number): Promise<boolean> {
    return this.payments.delete(id);
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const id = this.nextId++;
    const d: Document = { ...doc, id };
    this.documents.set(id, d);
    return d;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  async createPhoto(photo: InsertPhoto): Promise<Photo> {
    const id = this.nextId++;
    const p: Photo = { ...photo, id };
    this.photos.set(id, p);
    return p;
  }

  async deletePhoto(id: number): Promise<boolean> {
    return this.photos.delete(id);
  }

  async getVideosByProjectId(projectId: number): Promise<Video[]> {
    return Array.from(this.videos.values()).filter(v => v.projectId === projectId);
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const id = this.nextId++;
    const v: Video = { ...video, id, description: video.description ?? null };
    this.videos.set(id, v);
    return v;
  }

  async deleteVideo(id: number): Promise<boolean> {
    return this.videos.delete(id);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = this.nextId++;
    const p: Project = { ...project, id, status: project.status ?? "active" };
    this.projects.set(id, p);
    return p;
  }

  async updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined> {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    const updated: Project = { ...existing, ...data };
    this.projects.set(id, updated);
    return updated;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const id = this.nextId++;
    const c: Client = { id, name: client.name, phone: client.phone ?? null, email: client.email ?? null, uid: client.uid };
    this.clients.set(id, c);
    return c;
  }
}

export const storage = new MemStorage();
