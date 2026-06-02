import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionTaskSubtasksTable = pgTable("construction_task_subtasks", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  taskId: integer("task_id").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("todo"),
  assignedTo: integer("assigned_to"),
  dueDate: text("due_date"),
  progressPercent: integer("progress_percent").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConstructionTaskSubtaskSchema = createInsertSchema(constructionTaskSubtasksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertConstructionTaskSubtask = z.infer<typeof insertConstructionTaskSubtaskSchema>;
export type ConstructionTaskSubtask = typeof constructionTaskSubtasksTable.$inferSelect;
