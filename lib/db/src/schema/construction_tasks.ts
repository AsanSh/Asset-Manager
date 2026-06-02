import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionTasksTable = pgTable("construction_tasks", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  projectId: integer("project_id").notNull(),
  stageId: integer("stage_id"),
  parentTaskId: integer("parent_task_id"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("medium"),
  assignedTo: integer("assigned_to"),
  createdBy: integer("created_by"),
  contractorId: integer("contractor_id"),
  salesContractId: integer("sales_contract_id"),
  supplyRequestId: integer("supply_request_id"),
  dueDate: text("due_date"),
  completedAt: text("completed_at"),
  estimatedHours: numeric("estimated_hours", { precision: 8, scale: 2 }),
  actualHours: numeric("actual_hours", { precision: 8, scale: 2 }),
  progressPercent: integer("progress_percent").notNull().default(0),
  progressMode: text("progress_mode").notNull().default("checklist"),
  plannedStartDate: text("planned_start_date"),
  plannedEndDate: text("planned_end_date"),
  actualStartDate: text("actual_start_date"),
  actualEndDate: text("actual_end_date"),
  workType: text("work_type").notNull().default("construction"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConstructionTaskSchema = createInsertSchema(constructionTasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConstructionTask = z.infer<typeof insertConstructionTaskSchema>;
export type ConstructionTask = typeof constructionTasksTable.$inferSelect;
