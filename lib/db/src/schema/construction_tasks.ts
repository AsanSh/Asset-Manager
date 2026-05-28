import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionTasksTable = pgTable("construction_tasks", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  projectId: integer("project_id").notNull(),
  stageId: integer("stage_id"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("medium"),
  assignedTo: integer("assigned_to"),
  createdBy: integer("created_by"),
  dueDate: text("due_date"),
  completedAt: text("completed_at"),
  estimatedHours: numeric("estimated_hours", { precision: 8, scale: 2 }),
  actualHours: numeric("actual_hours", { precision: 8, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConstructionTaskSchema = createInsertSchema(constructionTasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConstructionTask = z.infer<typeof insertConstructionTaskSchema>;
export type ConstructionTask = typeof constructionTasksTable.$inferSelect;
