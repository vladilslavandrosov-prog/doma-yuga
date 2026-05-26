import { eq, and, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  clients, projects, estimates, estimateItems, payments,
  documents, photos, videos, messages, users, nonWorkingDays,
  estimateItemPhotos, galleryPhotos, dayComments,
} from "@shared/schema";
import type {
  Client, InsertClient,
  Project, InsertProject,
  Estimate, InsertEstimate,
  EstimateItem, InsertEstimateItem,
  Payment, InsertPayment,
  Document, InsertDocument,
  Photo, InsertPhoto,
  Video, InsertVideo,
  Message, InsertMessage,
  User, InsertUser,
  NonWorkingDay, InsertNonWorkingDay,
  EstimateItemPhoto, InsertEstimateItemPhoto,
  GalleryPhoto, InsertGalleryPhoto,
  DayComment, InsertDayComment,
} from "@shared/schema";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  async getClientByUid(uid: string): Promise<Client | undefined> {
    const [row] = await db.select().from(clients).where(eq(clients.uid, uid));
    return row;
  }

  async getClientById(id: number): Promise<Client | undefined> {
    const [row] = await db.select().from(clients).where(eq(clients.id, id));
    return row;
  }

  async getAllProjects(): Promise<Project[]> {
    return db.select().from(projects);
  }

  async getProjectsByClientId(clientId: number): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.clientId, clientId));
  }

  async getProjectById(id: number): Promise<Project | undefined> {
    const [row] = await db.select().from(projects).where(eq(projects.id, id));
    return row;
  }

  async getEstimatesByProjectId(projectId: number): Promise<Estimate[]> {
    return db.select().from(estimates).where(eq(estimates.projectId, projectId));
  }

  async getEstimateItemsByEstimateId(estimateId: number): Promise<EstimateItem[]> {
    return db.select().from(estimateItems).where(eq(estimateItems.estimateId, estimateId));
  }

  async getPaymentsByProjectId(projectId: number): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.projectId, projectId));
  }

  async getDocumentsByProjectId(projectId: number): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.projectId, projectId));
  }

  async getPhotosByProjectId(projectId: number): Promise<Photo[]> {
    return db.select().from(photos).where(eq(photos.projectId, projectId));
  }

  async getMessagesByProjectId(projectId: number): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.projectId, projectId));
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    const [row] = await db.insert(messages).values({ ...msg, isRead: msg.isRead ?? false }).returning();
    return row;
  }

  async markMessagesAsRead(projectId: number, sender: string): Promise<void> {
    await db.update(messages).set({ isRead: true }).where(
      and(eq(messages.projectId, projectId), eq(messages.sender, sender))
    );
  }

  async getUnreadCount(projectId: number, sender: string): Promise<number> {
    const rows = await db.select().from(messages).where(
      and(eq(messages.projectId, projectId), eq(messages.sender, sender), eq(messages.isRead, false))
    );
    return rows.length;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.username, username));
    return row;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.id, id));
    return row;
  }

  async createEstimate(est: InsertEstimate): Promise<Estimate> {
    const [row] = await db.insert(estimates).values(est).returning();
    return row;
  }

  async createEstimateItem(item: InsertEstimateItem): Promise<EstimateItem> {
    const [row] = await db.insert(estimateItems).values({ ...item, status: item.status ?? "planned" }).returning();
    return row;
  }

  async updateEstimateItem(id: number, data: Partial<InsertEstimateItem>): Promise<EstimateItem | undefined> {
    if (Object.keys(data).length === 0) {
      const [row] = await db.select().from(estimateItems).where(eq(estimateItems.id, id));
      return row;
    }
    const [row] = await db.update(estimateItems).set(data).where(eq(estimateItems.id, id)).returning();
    return row;
  }

  async deleteEstimateItem(id: number): Promise<boolean> {
    const result = await db.delete(estimateItems).where(eq(estimateItems.id, id)).returning();
    return result.length > 0;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [row] = await db.insert(payments).values(payment).returning();
    return row;
  }

  async deletePayment(id: number): Promise<boolean> {
    const result = await db.delete(payments).where(eq(payments.id, id)).returning();
    return result.length > 0;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [row] = await db.insert(documents).values(doc).returning();
    return row;
  }

  async deleteDocument(id: number): Promise<string | undefined> {
    const [row] = await db.delete(documents).where(eq(documents.id, id)).returning();
    return row?.url;
  }

  async createPhoto(photo: InsertPhoto): Promise<Photo> {
    const [row] = await db.insert(photos).values(photo).returning();
    return row;
  }

  async deletePhoto(id: number): Promise<string | undefined> {
    const [row] = await db.delete(photos).where(eq(photos.id, id)).returning();
    return row?.url;
  }

  async getVideosByProjectId(projectId: number): Promise<Video[]> {
    return db.select().from(videos).where(eq(videos.projectId, projectId));
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const [row] = await db.insert(videos).values(video).returning();
    return row;
  }

  async deleteVideo(id: number): Promise<string | undefined> {
    const [row] = await db.delete(videos).where(eq(videos.id, id)).returning();
    return row?.url;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [row] = await db.insert(projects).values(project).returning();
    return row;
  }

  async updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined> {
    const [row] = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return row;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [row] = await db.insert(clients).values(client).returning();
    return row;
  }

  async getAllClients(): Promise<Client[]> {
    return db.select().from(clients);
  }

  async updateClient(id: number, data: Partial<InsertClient>): Promise<Client | undefined> {
    const [row] = await db.update(clients).set(data).where(eq(clients.id, id)).returning();
    return row;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [row] = await db.insert(users).values(user).returning();
    return row;
  }

  async updateUserPassword(id: number, password: string): Promise<boolean> {
    const result = await db.update(users).set({ password }).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getNonWorkingDaysByProjectId(projectId: number): Promise<NonWorkingDay[]> {
    return db.select().from(nonWorkingDays).where(eq(nonWorkingDays.projectId, projectId));
  }

  async createNonWorkingDay(day: InsertNonWorkingDay): Promise<NonWorkingDay> {
    const [row] = await db.insert(nonWorkingDays).values(day).returning();
    return row;
  }

  async deleteNonWorkingDay(id: number): Promise<boolean> {
    const result = await db.delete(nonWorkingDays).where(eq(nonWorkingDays.id, id)).returning();
    return result.length > 0;
  }

  async getPhotosByEstimateItemId(estimateItemId: number): Promise<EstimateItemPhoto[]> {
    return db.select().from(estimateItemPhotos).where(eq(estimateItemPhotos.estimateItemId, estimateItemId));
  }

  async getPhotosByEstimateItemIds(ids: number[]): Promise<EstimateItemPhoto[]> {
    if (ids.length === 0) return [];
    return db.select().from(estimateItemPhotos).where(inArray(estimateItemPhotos.estimateItemId, ids));
  }

  async createEstimateItemPhoto(photo: InsertEstimateItemPhoto): Promise<EstimateItemPhoto> {
    const [row] = await db.insert(estimateItemPhotos).values(photo).returning();
    return row;
  }

  async deleteEstimateItemPhoto(id: number): Promise<string | undefined> {
    const [row] = await db.delete(estimateItemPhotos).where(eq(estimateItemPhotos.id, id)).returning();
    return row?.url;
  }

  async getAllGalleryPhotos(): Promise<GalleryPhoto[]> {
    return db.select().from(galleryPhotos);
  }

  async createGalleryPhoto(photo: InsertGalleryPhoto): Promise<GalleryPhoto> {
    const [row] = await db.insert(galleryPhotos).values(photo).returning();
    return row;
  }

  async deleteGalleryPhoto(id: number): Promise<string | undefined> {
    const [row] = await db.delete(galleryPhotos).where(eq(galleryPhotos.id, id)).returning();
    return row?.url;
  }

  async getDayCommentsByProjectId(projectId: number): Promise<DayComment[]> {
    return db.select().from(dayComments).where(eq(dayComments.projectId, projectId));
  }

  async createDayComment(comment: InsertDayComment): Promise<DayComment> {
    const [row] = await db.insert(dayComments).values(comment).returning();
    return row;
  }

  async updateDayComment(id: number, data: Partial<InsertDayComment>): Promise<DayComment | undefined> {
    const [row] = await db.update(dayComments).set(data).where(eq(dayComments.id, id)).returning();
    return row;
  }

  async deleteDayComment(id: number): Promise<boolean> {
    const result = await db.delete(dayComments).where(eq(dayComments.id, id)).returning();
    return result.length > 0;
  }
}
