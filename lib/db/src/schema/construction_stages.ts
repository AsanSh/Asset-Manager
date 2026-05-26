import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionStagesTable = pgTable("construction_stages", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("planned"),
  progress: integer("progress").notNull().default(0),
  startDate: text("start_date"),
  plannedEndDate: text("planned_end_date"),
  actualEndDate: text("actual_end_date"),
  budgetAmount: numeric("budget_amount", { precision: 15, scale: 2 }),
  parentStageId: integer("parent_stage_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConstructionStageSchema = createInsertSchema(constructionStagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConstructionStage = z.infer<typeof insertConstructionStageSchema>;
export type ConstructionStage = typeof constructionStagesTable.$inferSelect;
