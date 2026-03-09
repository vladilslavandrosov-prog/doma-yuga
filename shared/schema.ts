import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, numeric, boolean, timestamp, date } from "drizzle-orm/pg-core";
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
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const estimates = pgTable("estimates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
});

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
});

export const insertEstimateItemSchema = createInsertSchema(estimateItems).omit({ id: true });
export type InsertEstimateItem = z.infer<typeof insertEstimateItemSchema>;
export type EstimateItem = typeof estimateItems.$inferSelect;

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  amount: numeric("amount").notNull(),
  date: text("date").notNull(),
  description: text("description").notNull(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  url: text("url").notNull(),
  caption: text("caption").notNull(),
  date: text("date").notNull(),
});

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
});

export const insertVideoSchema = createInsertSchema(videos).omit({ id: true });
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("client"),
  clientId: integer("client_id"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const nonWorkingDays = pgTable("non_working_days", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  date: text("date").notNull(),
  reason: text("reason").notNull(),
});

export const insertNonWorkingDaySchema = createInsertSchema(nonWorkingDays).omit({ id: true });
export type InsertNonWorkingDay = z.infer<typeof insertNonWorkingDaySchema>;
export type NonWorkingDay = typeof nonWorkingDays.$inferSelect;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  sender: text("sender").notNull(),
  text: text("text").notNull(),
  createdAt: text("created_at").notNull(),
  isRead: boolean("is_read").notNull().default(false),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
