import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, numeric, boolean, timestamp, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  uid: text("uid").notNull().unique(),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  startDate: text("start_date").notNull(),
  status: text("status").notNull().default("active"),
  clientId: integer("client_id").notNull(),
}, (table) => [
  index("idx_projects_client_id").on(table.clientId),
]);

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const estimates = pgTable("estimates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
}, (table) => [
  index("idx_estimates_project_id").on(table.projectId),
]);

export const insertEstimateSchema = createInsertSchema(estimates).omit({ id: true });
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type Estimate = typeof estimates.$inferSelect;

export const estimateItems = pgTable("estimate_items", {
  id: serial("id").primaryKey(),
  estimateId: integer("estimate_id").notNull(),
  date: text("date").notNull(),
  name: text("name").notNull(),
  quantity: numeric("quantity").notNull(),
  unit: text("unit").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  totalPrice: numeric("total_price").notNull(),
  status: text("status").notNull().default("planned"),
  workGroup: text("work_group"),
}, (table) => [
  index("idx_estimate_items_estimate_id").on(table.estimateId),
]);

export const insertEstimateItemSchema = createInsertSchema(estimateItems).omit({ id: true });
export type InsertEstimateItem = z.infer<typeof insertEstimateItemSchema>;
export type EstimateItem = typeof estimateItems.$inferSelect;

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  amount: numeric("amount").notNull(),
  date: text("date").notNull(),
  description: text("description").notNull(),
}, (table) => [
  index("idx_payments_project_id").on(table.projectId),
]);

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull(),
}, (table) => [
  index("idx_documents_project_id").on(table.projectId),
]);

export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  url: text("url").notNull(),
  caption: text("caption").notNull(),
  date: text("date").notNull(),
}, (table) => [
  index("idx_photos_project_id").on(table.projectId),
]);

export const insertPhotoSchema = createInsertSchema(photos).omit({ id: true });
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(),
}, (table) => [
  index("idx_videos_project_id").on(table.projectId),
]);

export const insertVideoSchema = createInsertSchema(videos).omit({ id: true });
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("client"),
  clientId: integer("client_id"),
  telegramChatId: text("telegram_chat_id"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const nonWorkingDays = pgTable("non_working_days", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  date: text("date").notNull(),
  reason: text("reason").notNull(),
}, (table) => [
  index("idx_non_working_days_project_id").on(table.projectId),
]);

export const insertNonWorkingDaySchema = createInsertSchema(nonWorkingDays).omit({ id: true });
export type InsertNonWorkingDay = z.infer<typeof insertNonWorkingDaySchema>;
export type NonWorkingDay = typeof nonWorkingDays.$inferSelect;

export const estimateItemPhotos = pgTable("estimate_item_photos", {
  id: serial("id").primaryKey(),
  estimateItemId: integer("estimate_item_id").notNull(),
  url: text("url").notNull(),
}, (table) => [
  index("idx_estimate_item_photos_estimate_item_id").on(table.estimateItemId),
]);

export const insertEstimateItemPhotoSchema = createInsertSchema(estimateItemPhotos).omit({ id: true });
export type InsertEstimateItemPhoto = z.infer<typeof insertEstimateItemPhotoSchema>;
export type EstimateItemPhoto = typeof estimateItemPhotos.$inferSelect;

export const galleryPhotos = pgTable("gallery_photos", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  caption: text("caption"),
  category: text("category").notNull().default("Общее"),
});

export const insertGalleryPhotoSchema = createInsertSchema(galleryPhotos).omit({ id: true });
export type InsertGalleryPhoto = z.infer<typeof insertGalleryPhotoSchema>;
export type GalleryPhoto = typeof galleryPhotos.$inferSelect;

export const dayComments = pgTable("day_comments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  date: text("date").notNull(),
  text: text("text").notNull(),
  sender: text("sender").notNull().default("admin"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_day_comments_project_id").on(table.projectId),
]);

export const insertDayCommentSchema = createInsertSchema(dayComments).omit({ id: true });
export type InsertDayComment = z.infer<typeof insertDayCommentSchema>;
export type DayComment = typeof dayComments.$inferSelect;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  sender: text("sender").notNull(),
  text: text("text").notNull(),
  createdAt: text("created_at").notNull(),
  isRead: boolean("is_read").notNull().default(false),
}, (table) => [
  index("idx_messages_project_id").on(table.projectId),
]);

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  services: text("services").notNull(),
  objectType: text("object_type"),
  area: integer("area"),
  budget: text("budget"),
  timeline: text("timeline"),
  city: text("city"),
  description: text("description"),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  contactMethods: text("contact_methods").notNull(),
  callTimes: text("call_times"),
  source: text("source"),
  status: text("status").notNull().default("new"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true, createdAt: true, status: true, notes: true,
});
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

export const workGroups = pgTable("work_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const insertWorkGroupSchema = createInsertSchema(workGroups).omit({ id: true });
export type InsertWorkGroup = z.infer<typeof insertWorkGroupSchema>;
export type WorkGroup = typeof workGroups.$inferSelect;

export const clientReminders = pgTable("client_reminders", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  projectId: integer("project_id"),
  text: text("text").notNull(),
  dueDate: text("due_date"),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  resolutionNote: text("resolution_note"),
  resolutionQuality: text("resolution_quality"),
  notifiedAt: text("notified_at"),
  assignedToUserId: integer("assigned_to_user_id"),
  recurrence: text("recurrence").notNull().default("none"),
}, (table) => [
  index("idx_client_reminders_client_id").on(table.clientId),
  index("idx_client_reminders_project_id").on(table.projectId),
  index("idx_client_reminders_assigned_to_user_id").on(table.assignedToUserId),
  index("idx_client_reminders_status_due_date").on(table.status, table.dueDate),
]);

export const insertClientReminderSchema = createInsertSchema(clientReminders, {
  priority: z.enum(["urgent", "normal", "low"]).optional(),
  status: z.enum(["pending", "done"]).optional(),
  recurrence: z.enum(["none", "weekly", "monthly"]).optional(),
}).omit({ id: true });
export type InsertClientReminder = z.infer<typeof insertClientReminderSchema>;
export type ClientReminder = typeof clientReminders.$inferSelect;

export const reminderHistory = pgTable("reminder_history", {
  id: serial("id").primaryKey(),
  reminderId: integer("reminder_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  userId: integer("user_id"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_reminder_history_reminder_id").on(table.reminderId),
]);

export type ReminderHistory = typeof reminderHistory.$inferSelect;

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;
