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
  type DayComment, type InsertDayComment,
  type Lead, type InsertLead,
  type WorkGroup, type InsertWorkGroup,
} from "@shared/schema";

export interface IStorage {
  getClientByUid(uid: string): Promise<Client | undefined>;
  getClientById(id: number): Promise<Client | undefined>;
  getAllProjects(): Promise<Project[]>;
  getProjectsByClientId(clientId: number): Promise<Project[]>;
  getProjectById(id: number): Promise<Project | undefined>;
  getEstimatesByProjectId(projectId: number): Promise<Estimate[]>;
  getEstimateItemsByEstimateId(estimateId: number): Promise<EstimateItem[]>;
  getEstimateItemsByEstimateIds(estimateIds: number[]): Promise<EstimateItem[]>;
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
  deleteDocument(id: number): Promise<string | undefined>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  deletePhoto(id: number): Promise<string | undefined>;
  getVideosByProjectId(projectId: number): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  deleteVideo(id: number): Promise<string | undefined>;
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
  deleteEstimateItemPhoto(id: number): Promise<string | undefined>;
  getAllGalleryPhotos(): Promise<GalleryPhoto[]>;
  createGalleryPhoto(photo: InsertGalleryPhoto): Promise<GalleryPhoto>;
  deleteGalleryPhoto(id: number): Promise<string | undefined>;
  getDayCommentsByProjectId(projectId: number): Promise<DayComment[]>;
  createDayComment(comment: InsertDayComment): Promise<DayComment>;
  updateDayComment(id: number, data: Partial<InsertDayComment>): Promise<DayComment | undefined>;
  deleteDayComment(id: number): Promise<boolean>;
  getLeads(): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, data: { status?: string; notes?: string }): Promise<Lead | undefined>;
  getWorkGroups(): Promise<WorkGroup[]>;
  createWorkGroup(group: InsertWorkGroup): Promise<WorkGroup>;
  deleteWorkGroup(id: number): Promise<boolean>;
}

import { DatabaseStorage } from "./dbStorage";

export const storage: IStorage = new DatabaseStorage();
