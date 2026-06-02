import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionTaskActivityTable = pgTable("construction_task_activity", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  taskId: integer("task_id").notNull(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  fieldName: text("field_name"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  meta: text("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConstructionTaskActivitySchema = createInsertSchema(constructionTaskActivityTable).omit({
  id: true,
  createdAt: true,
});
export type InsertConstructionTaskActivity = z.infer<typeof insertConstructionTaskActivitySchema>;
export type ConstructionTaskActivity = typeof constructionTaskActivityTable.$inferSelect;
