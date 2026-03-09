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
  type NonWorkingDay, type InsertNonWorkingDay,
  type EstimateItemPhoto, type InsertEstimateItemPhoto,
  type GalleryPhoto, type InsertGalleryPhoto,
} from "@shared/schema";

export interface IStorage {
  getClientByUid(uid: string): Promise<Client | undefined>;
  getClientById(id: number): Promise<Client | undefined>;
  getAllProjects(): Promise<Project[]>;
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
  getAllClients(): Promise<Client[]>;
  updateClient(id: number, data: Partial<InsertClient>): Promise<Client | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: number, password: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getNonWorkingDaysByProjectId(projectId: number): Promise<NonWorkingDay[]>;
  createNonWorkingDay(day: InsertNonWorkingDay): Promise<NonWorkingDay>;
  deleteNonWorkingDay(id: number): Promise<boolean>;
  getPhotosByEstimateItemId(estimateItemId: number): Promise<EstimateItemPhoto[]>;
  getPhotosByEstimateItemIds(ids: number[]): Promise<EstimateItemPhoto[]>;
  createEstimateItemPhoto(photo: InsertEstimateItemPhoto): Promise<EstimateItemPhoto>;
  deleteEstimateItemPhoto(id: number): Promise<boolean>;
  getAllGalleryPhotos(): Promise<GalleryPhoto[]>;
  createGalleryPhoto(photo: InsertGalleryPhoto): Promise<GalleryPhoto>;
  deleteGalleryPhoto(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private clients: Map<number, Client> = new Map();
  private projects: Map<number, Project> = new Map();
  private estimates: Map<number, Estimate> = new Map();
  private estimateItems: Map<number, EstimateItem> = new Map();
  private payments: Map<number, Payment> = new Map();
  private documents: Map<number, Document> = new Map();
  private photos: Map<number, Photo> = new Map();
  private estimateItemPhotos: Map<number, EstimateItemPhoto> = new Map();
  private videos: Map<number, Video> = new Map();
  private messages: Map<number, Message> = new Map();
  private users: Map<number, User> = new Map();
  private nonWorkingDays: Map<number, NonWorkingDay> = new Map();
  private galleryPhotosMap: Map<number, GalleryPhoto> = new Map();
  private nextId = 100;

  constructor() {
    this.seedData();
  }

  private seedData() {
    const client1: Client = { id: 1, name: "Иванов Сергей Петрович", phone: "+7 (918) 123-45-67", email: "ivanov@mail.ru", uid: "demo-uid-123" };
    const client2: Client = { id: 2, name: "Петров Алексей Николаевич", phone: "+7 (918) 987-65-43", email: "petrov@mail.ru", uid: "client-uid-456" };
    this.clients.set(1, client1);
    this.clients.set(2, client2);

    const project1: Project = { id: 1, name: "Демо", address: "г. Краснодар, ул. Демонстрационная, 1", startDate: "2026-01-07", status: "active", clientId: 1 };
    const project2: Project = { id: 2, name: "Атамана Матвеева", address: "Борисовка, ул. Ад. Матвеева, 15", startDate: "2026-01-07", status: "active", clientId: 2 };
    const project3: Project = { id: 3, name: "Коттедж на Южной", address: "г. Краснодар, ул. Южная, 22", startDate: "2026-02-15", status: "active", clientId: 2 };
    this.projects.set(1, project1);
    this.projects.set(2, project2);
    this.projects.set(3, project3);

    const est1: Estimate = { id: 1, projectId: 1, category: "works", title: "Ландшафтные работы" };
    const est2: Estimate = { id: 2, projectId: 1, category: "materials", title: "Строительные материалы" };
    const est3: Estimate = { id: 3, projectId: 2, category: "works", title: "Ландшафтные работы" };
    const est4: Estimate = { id: 4, projectId: 2, category: "materials", title: "Строительные материалы" };
    const est5: Estimate = { id: 5, projectId: 1, category: "transport", title: "Транспортные расходы" };
    const est6: Estimate = { id: 6, projectId: 2, category: "transport", title: "Транспортные расходы" };
    this.estimates.set(1, est1);
    this.estimates.set(2, est2);
    this.estimates.set(3, est3);
    this.estimates.set(4, est4);
    this.estimates.set(5, est5);
    this.estimates.set(6, est6);

    const items: EstimateItem[] = [
      { id: 1, estimateId: 1, date: "2026-01-10", name: "Планировка территории", quantity: "450", unit: "м²", unitPrice: "120", totalPrice: "54000", status: "completed", workGroup: "Земляные работы" },
      { id: 2, estimateId: 1, date: "2026-01-12", name: "Выемка грунта под фундамент", quantity: "85", unit: "м³", unitPrice: "850", totalPrice: "72250", status: "completed", workGroup: "Земляные работы" },
      { id: 3, estimateId: 1, date: "2026-01-15", name: "Устройство песчаной подушки", quantity: "45", unit: "м³", unitPrice: "600", totalPrice: "27000", status: "completed", workGroup: "Земляные работы" },
      { id: 4, estimateId: 1, date: "2026-01-20", name: "Заливка фундамента", quantity: "38", unit: "м³", unitPrice: "4500", totalPrice: "171000", status: "in_progress", workGroup: "Фундамент" },
      { id: 5, estimateId: 1, date: "2026-01-25", name: "Гидроизоляция фундамента", quantity: "120", unit: "м²", unitPrice: "350", totalPrice: "42000", status: "in_progress", workGroup: "Фундамент" },
      { id: 6, estimateId: 1, date: "2026-02-01", name: "Кладка стен первого этажа", quantity: "180", unit: "м²", unitPrice: "2200", totalPrice: "396000", status: "planned", workGroup: "Стены и перекрытия" },
      { id: 7, estimateId: 1, date: "2026-02-10", name: "Кладка стен второго этажа", quantity: "160", unit: "м²", unitPrice: "2200", totalPrice: "352000", status: "planned", workGroup: "Стены и перекрытия" },
      { id: 8, estimateId: 1, date: "2026-02-20", name: "Монтаж кровли", quantity: "210", unit: "м²", unitPrice: "1800", totalPrice: "378000", status: "planned", workGroup: "Кровля" },
      { id: 9, estimateId: 1, date: "2026-03-01", name: "Установка окон", quantity: "14", unit: "шт", unitPrice: "18000", totalPrice: "252000", status: "planned", workGroup: "Окна и двери" },
      { id: 10, estimateId: 1, date: "2026-03-10", name: "Штукатурка фасада", quantity: "340", unit: "м²", unitPrice: "650", totalPrice: "221000", status: "planned", workGroup: "Отделка" },
    ];
    items.forEach(item => this.estimateItems.set(item.id, item));

    const matItems: EstimateItem[] = [
      { id: 11, estimateId: 2, date: "2026-01-08", name: "Бетон М300", quantity: "85", unit: "м³", unitPrice: "5200", totalPrice: "442000", status: "completed", workGroup: "Бетонные материалы" },
      { id: 12, estimateId: 2, date: "2026-01-08", name: "Арматура А500 d12", quantity: "3200", unit: "кг", unitPrice: "75", totalPrice: "240000", status: "completed", workGroup: "Бетонные материалы" },
      { id: 13, estimateId: 2, date: "2026-01-20", name: "Кирпич керамический", quantity: "28000", unit: "шт", unitPrice: "18", totalPrice: "504000", status: "in_progress", workGroup: "Кладочные материалы" },
      { id: 14, estimateId: 2, date: "2026-02-01", name: "Утеплитель минвата 100мм", quantity: "320", unit: "м²", unitPrice: "420", totalPrice: "134400", status: "planned", workGroup: "Утепление" },
      { id: 15, estimateId: 2, date: "2026-02-15", name: "Металлочерепица", quantity: "230", unit: "м²", unitPrice: "850", totalPrice: "195500", status: "planned", workGroup: "Кровельные материалы" },
    ];
    matItems.forEach(item => this.estimateItems.set(item.id, item));

    const transportItems: EstimateItem[] = [
      { id: 31, estimateId: 5, date: "2026-01-10", name: "Доставка песка", quantity: "3", unit: "рейс", unitPrice: "8000", totalPrice: "24000", status: "completed", workGroup: "Доставка сыпучих" },
      { id: 32, estimateId: 5, date: "2026-01-10", name: "Доставка щебня", quantity: "2", unit: "рейс", unitPrice: "9000", totalPrice: "18000", status: "completed", workGroup: "Доставка сыпучих" },
      { id: 33, estimateId: 5, date: "2026-01-12", name: "Вывоз грунта", quantity: "5", unit: "рейс", unitPrice: "7500", totalPrice: "37500", status: "completed", workGroup: "Вывоз отходов" },
      { id: 34, estimateId: 5, date: "2026-01-15", name: "Доставка бетона (миксер)", quantity: "4", unit: "рейс", unitPrice: "12000", totalPrice: "48000", status: "completed", workGroup: "Доставка бетона" },
      { id: 35, estimateId: 5, date: "2026-01-20", name: "Аренда автокрана", quantity: "1", unit: "смена", unitPrice: "25000", totalPrice: "25000", status: "in_progress", workGroup: "Спецтехника" },
      { id: 36, estimateId: 5, date: "2026-02-01", name: "Доставка кирпича", quantity: "4", unit: "рейс", unitPrice: "11000", totalPrice: "44000", status: "planned", workGroup: "Доставка материалов" },
      { id: 37, estimateId: 5, date: "2026-02-15", name: "Доставка металлочерепицы", quantity: "2", unit: "рейс", unitPrice: "15000", totalPrice: "30000", status: "planned", workGroup: "Доставка материалов" },
    ];
    transportItems.forEach(item => this.estimateItems.set(item.id, item));

    const items2: EstimateItem[] = [
      { id: 16, estimateId: 3, date: "2026-01-10", name: "Планировка территории", quantity: "450", unit: "м²", unitPrice: "120", totalPrice: "54000", status: "completed", workGroup: "Земляные работы" },
      { id: 17, estimateId: 3, date: "2026-01-12", name: "Выемка грунта под фундамент", quantity: "85", unit: "м³", unitPrice: "850", totalPrice: "72250", status: "completed", workGroup: "Земляные работы" },
      { id: 18, estimateId: 3, date: "2026-01-15", name: "Устройство песчаной подушки", quantity: "45", unit: "м³", unitPrice: "600", totalPrice: "27000", status: "completed", workGroup: "Земляные работы" },
      { id: 19, estimateId: 3, date: "2026-01-20", name: "Заливка фундамента", quantity: "38", unit: "м³", unitPrice: "4500", totalPrice: "171000", status: "in_progress", workGroup: "Фундамент" },
      { id: 20, estimateId: 3, date: "2026-01-25", name: "Гидроизоляция фундамента", quantity: "120", unit: "м²", unitPrice: "350", totalPrice: "42000", status: "in_progress", workGroup: "Фундамент" },
      { id: 21, estimateId: 3, date: "2026-02-01", name: "Кладка стен первого этажа", quantity: "180", unit: "м²", unitPrice: "2200", totalPrice: "396000", status: "planned", workGroup: "Стены и перекрытия" },
      { id: 22, estimateId: 3, date: "2026-02-10", name: "Кладка стен второго этажа", quantity: "160", unit: "м²", unitPrice: "2200", totalPrice: "352000", status: "planned", workGroup: "Стены и перекрытия" },
      { id: 23, estimateId: 3, date: "2026-02-20", name: "Монтаж кровли", quantity: "210", unit: "м²", unitPrice: "1800", totalPrice: "378000", status: "planned", workGroup: "Кровля" },
      { id: 24, estimateId: 3, date: "2026-03-01", name: "Установка окон", quantity: "14", unit: "шт", unitPrice: "18000", totalPrice: "252000", status: "planned", workGroup: "Окна и двери" },
      { id: 25, estimateId: 3, date: "2026-03-10", name: "Штукатурка фасада", quantity: "340", unit: "м²", unitPrice: "650", totalPrice: "221000", status: "planned", workGroup: "Отделка" },
    ];
    items2.forEach(item => this.estimateItems.set(item.id, item));

    const matItems2: EstimateItem[] = [
      { id: 26, estimateId: 4, date: "2026-01-08", name: "Бетон М300", quantity: "85", unit: "м³", unitPrice: "5200", totalPrice: "442000", status: "completed", workGroup: "Бетонные материалы" },
      { id: 27, estimateId: 4, date: "2026-01-08", name: "Арматура А500 d12", quantity: "3200", unit: "кг", unitPrice: "75", totalPrice: "240000", status: "completed", workGroup: "Бетонные материалы" },
      { id: 28, estimateId: 4, date: "2026-01-20", name: "Кирпич керамический", quantity: "28000", unit: "шт", unitPrice: "18", totalPrice: "504000", status: "in_progress", workGroup: "Кладочные материалы" },
      { id: 29, estimateId: 4, date: "2026-02-01", name: "Утеплитель минвата 100мм", quantity: "320", unit: "м²", unitPrice: "420", totalPrice: "134400", status: "planned", workGroup: "Утепление" },
      { id: 30, estimateId: 4, date: "2026-02-15", name: "Металлочерепица", quantity: "230", unit: "м²", unitPrice: "850", totalPrice: "195500", status: "planned", workGroup: "Кровельные материалы" },
    ];
    matItems2.forEach(item => this.estimateItems.set(item.id, item));

    const transportItems2: EstimateItem[] = [
      { id: 38, estimateId: 6, date: "2026-01-10", name: "Доставка песка", quantity: "3", unit: "рейс", unitPrice: "8000", totalPrice: "24000", status: "completed", workGroup: "Доставка сыпучих" },
      { id: 39, estimateId: 6, date: "2026-01-10", name: "Доставка щебня", quantity: "2", unit: "рейс", unitPrice: "9000", totalPrice: "18000", status: "completed", workGroup: "Доставка сыпучих" },
      { id: 40, estimateId: 6, date: "2026-01-12", name: "Вывоз грунта", quantity: "5", unit: "рейс", unitPrice: "7500", totalPrice: "37500", status: "completed", workGroup: "Вывоз отходов" },
      { id: 41, estimateId: 6, date: "2026-01-15", name: "Доставка бетона (миксер)", quantity: "4", unit: "рейс", unitPrice: "12000", totalPrice: "48000", status: "completed", workGroup: "Доставка бетона" },
      { id: 42, estimateId: 6, date: "2026-01-20", name: "Аренда автокрана", quantity: "1", unit: "смена", unitPrice: "25000", totalPrice: "25000", status: "in_progress", workGroup: "Спецтехника" },
      { id: 43, estimateId: 6, date: "2026-02-01", name: "Доставка кирпича", quantity: "4", unit: "рейс", unitPrice: "11000", totalPrice: "44000", status: "planned", workGroup: "Доставка материалов" },
      { id: 44, estimateId: 6, date: "2026-02-15", name: "Доставка металлочерепицы", quantity: "2", unit: "рейс", unitPrice: "15000", totalPrice: "30000", status: "planned", workGroup: "Доставка материалов" },
    ];
    transportItems2.forEach(item => this.estimateItems.set(item.id, item));

    const paymentList: Payment[] = [
      { id: 1, projectId: 1, amount: "500000", date: "2026-01-05", description: "Аванс на начало работ" },
      { id: 2, projectId: 1, amount: "350000", date: "2026-01-20", description: "Оплата фундаментных работ" },
      { id: 3, projectId: 1, amount: "200000", date: "2026-02-01", description: "Оплата материалов (кирпич)" },
      { id: 4, projectId: 2, amount: "500000", date: "2026-01-05", description: "Аванс на начало работ" },
      { id: 5, projectId: 2, amount: "350000", date: "2026-01-20", description: "Оплата фундаментных работ" },
      { id: 6, projectId: 2, amount: "200000", date: "2026-02-01", description: "Оплата материалов (кирпич)" },
    ];
    paymentList.forEach(p => this.payments.set(p.id, p));

    const docList: Document[] = [
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
    ];
    docList.forEach(d => this.documents.set(d.id, d));

    const photoList: Photo[] = [
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
    ];
    photoList.forEach(p => this.photos.set(p.id, p));

    const videoList: Video[] = [
      { id: 1, projectId: 1, url: "/uploads/construction_house_demo.mp4", title: "Обзор строительной площадки", description: "Общий вид объекта с высоты — этап фундаментных работ", date: "2026-01-20" },
      { id: 2, projectId: 2, url: "/uploads/construction_house_demo.mp4", title: "Обзор строительной площадки", description: "Общий вид объекта с высоты — этап фундаментных работ", date: "2026-01-20" },
    ];
    videoList.forEach(v => this.videos.set(v.id, v));

    const nonWorkDays: NonWorkingDay[] = [
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
    ];
    nonWorkDays.forEach(d => this.nonWorkingDays.set(d.id, d));

    const msgList: Message[] = [
      { id: 1, projectId: 1, sender: "admin", text: "Здравствуйте! Работы по фундаменту начаты по графику.", createdAt: "2026-01-10T09:00:00", isRead: true },
      { id: 2, projectId: 1, sender: "client", text: "Отлично, спасибо за информацию!", createdAt: "2026-01-10T10:30:00", isRead: true },
      { id: 3, projectId: 1, sender: "admin", text: "Заливка фундамента завершена на 60%. Фото прилагаем.", createdAt: "2026-01-22T14:00:00", isRead: true },
      { id: 4, projectId: 1, sender: "admin", text: "Напоминаем об оплате следующего этапа — кладка стен.", createdAt: "2026-02-01T11:00:00", isRead: false },
      { id: 5, projectId: 2, sender: "admin", text: "Здравствуйте! Работы по фундаменту начаты по графику.", createdAt: "2026-01-10T09:00:00", isRead: true },
      { id: 6, projectId: 2, sender: "client", text: "Отлично, спасибо за информацию!", createdAt: "2026-01-10T10:30:00", isRead: true },
      { id: 7, projectId: 2, sender: "admin", text: "Заливка фундамента завершена на 60%. Фото прилагаем.", createdAt: "2026-01-22T14:00:00", isRead: true },
      { id: 8, projectId: 2, sender: "admin", text: "Напоминаем об оплате следующего этапа — кладка стен.", createdAt: "2026-02-01T11:00:00", isRead: false },
    ];
    msgList.forEach(m => this.messages.set(m.id, m));

    const userList: User[] = [
      { id: 1, username: "admin", password: "admin123", role: "admin", clientId: null },
      { id: 2, username: "client", password: "client123", role: "client", clientId: 1 },
      { id: 3, username: "petrov", password: "petrov123", role: "client", clientId: 2 },
    ];
    userList.forEach(u => this.users.set(u.id, u));
  }

  async getClientByUid(uid: string): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(c => c.uid === uid);
  }

  async getClientById(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
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

  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async updateClient(id: number, data: Partial<InsertClient>): Promise<Client | undefined> {
    const existing = this.clients.get(id);
    if (!existing) return undefined;
    const updated: Client = { ...existing, ...data };
    this.clients.set(id, updated);
    return updated;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.nextId++;
    const u: User = { id, username: user.username, password: user.password, role: user.role ?? "client", clientId: user.clientId ?? null };
    this.users.set(id, u);
    return u;
  }

  async updateUserPassword(id: number, password: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    user.password = password;
    this.users.set(id, user);
    return true;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getNonWorkingDaysByProjectId(projectId: number): Promise<NonWorkingDay[]> {
    return Array.from(this.nonWorkingDays.values()).filter(d => d.projectId === projectId);
  }

  async createNonWorkingDay(day: InsertNonWorkingDay): Promise<NonWorkingDay> {
    const id = this.nextId++;
    const d: NonWorkingDay = { id, projectId: day.projectId, date: day.date, reason: day.reason };
    this.nonWorkingDays.set(id, d);
    return d;
  }

  async deleteNonWorkingDay(id: number): Promise<boolean> {
    return this.nonWorkingDays.delete(id);
  }

  async getPhotosByEstimateItemId(estimateItemId: number): Promise<EstimateItemPhoto[]> {
    return Array.from(this.estimateItemPhotos.values()).filter(p => p.estimateItemId === estimateItemId);
  }

  async getPhotosByEstimateItemIds(ids: number[]): Promise<EstimateItemPhoto[]> {
    const idSet = new Set(ids);
    return Array.from(this.estimateItemPhotos.values()).filter(p => idSet.has(p.estimateItemId));
  }

  async createEstimateItemPhoto(photo: InsertEstimateItemPhoto): Promise<EstimateItemPhoto> {
    const id = this.nextId++;
    const p: EstimateItemPhoto = { id, estimateItemId: photo.estimateItemId, url: photo.url };
    this.estimateItemPhotos.set(id, p);
    return p;
  }

  async deleteEstimateItemPhoto(id: number): Promise<boolean> {
    return this.estimateItemPhotos.delete(id);
  }

  async getAllGalleryPhotos(): Promise<GalleryPhoto[]> {
    return Array.from(this.galleryPhotosMap.values());
  }

  async createGalleryPhoto(photo: InsertGalleryPhoto): Promise<GalleryPhoto> {
    const id = this.nextId++;
    const p: GalleryPhoto = { id, url: photo.url, caption: photo.caption ?? null, category: photo.category ?? "Общее" };
    this.galleryPhotosMap.set(id, p);
    return p;
  }

  async deleteGalleryPhoto(id: number): Promise<boolean> {
    return this.galleryPhotosMap.delete(id);
  }
}

import { DatabaseStorage } from "./dbStorage";

export const storage: IStorage = new DatabaseStorage();
