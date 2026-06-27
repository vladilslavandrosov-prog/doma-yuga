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
  deleteEstimatesByProjectId(projectId: number): Promise<void>;
  deleteEstimateItemsByEstimateIds(estimateIds: number[]): Promise<void>;
  deleteEstimateItemPhotosByEstimateItemIds(estimateItemIds: number[]): Promise<string[]>;
  getPaymentsByProjectId(projectId: number): Promise<Payment[]>;
  deletePaymentsByProjectId(projectId: number): Promise<void>;
  getDocumentsByProjectId(projectId: number): Promise<Document[]>;
  deleteDocumentsByProjectId(projectId: number): Promise<string[]>;
  getPhotosByProjectId(projectId: number): Promise<Photo[]>;
  deletePhotosByProjectId(projectId: number): Promise<string[]>;
  getMessagesByProjectId(projectId: number): Promise<Message[]>;
  deleteMessagesByProjectId(projectId: number): Promise<void>;
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
  updatePayment(id: number, data: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<boolean>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: number, data: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<string | undefined>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  updatePhoto(id: number, data: Partial<InsertPhoto>): Promise<Photo | undefined>;
  deletePhoto(id: number): Promise<string | undefined>;
  getVideosByProjectId(projectId: number): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, data: Partial<InsertVideo>): Promise<Video | undefined>;
  deleteVideo(id: number): Promise<string | undefined>;
  deleteVideosByProjectId(projectId: number): Promise<string[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  createClient(client: InsertClient): Promise<Client>;
  getAllClients(): Promise<Client[]>;
  updateClient(id: number, data: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: number, password: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  deleteUsersByClientId(clientId: number): Promise<void>;
  getNonWorkingDaysByProjectId(projectId: number): Promise<NonWorkingDay[]>;
  createNonWorkingDay(day: InsertNonWorkingDay): Promise<NonWorkingDay>;
  deleteNonWorkingDay(id: number): Promise<boolean>;
  deleteNonWorkingDaysByProjectId(projectId: number): Promise<void>;
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
  deleteDayCommentsByProjectId(projectId: number): Promise<void>;
  getLeads(): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, data: { status?: string; notes?: string }): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<boolean>;
  getWorkGroups(): Promise<WorkGroup[]>;
  createWorkGroup(group: InsertWorkGroup): Promise<WorkGroup>;
  updateWorkGroup(id: number, group: InsertWorkGroup): Promise<WorkGroup | undefined>;
  deleteWorkGroup(id: number): Promise<boolean>;
}

import { DatabaseStorage } from "./dbStorage";

export const storage: IStorage = new DatabaseStorage();
