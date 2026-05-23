import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionWorkersTable = pgTable("construction_workers", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  fullName: text("full_name").notNull(),
  brigade: text("brigade"),
  specialization: text("specialization"),
  phone: text("phone"),
  dailyRate: numeric("daily_rate", { precision: 10, scale: 2 }),
  currency: text("currency").notNull().default("KGS"),
  status: text("status").notNull().default("active"),
  projectId: integer("project_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConstructionWorkerSchema = createInsertSchema(constructionWorkersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConstructionWorker = z.infer<typeof insertConstructionWorkerSchema>;
export type ConstructionWorker = typeof constructionWorkersTable.$inferSelect;
