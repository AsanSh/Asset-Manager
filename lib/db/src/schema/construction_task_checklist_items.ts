import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionTaskChecklistItemsTable = pgTable("construction_task_checklist_items", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  taskId: integer("task_id").notNull(),
  title: text("title").notNull(),
  isDone: boolean("is_done").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  doneAt: timestamp("done_at", { withTimezone: true }),
  doneBy: integer("done_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConstructionTaskChecklistItemSchema = createInsertSchema(
  constructionTaskChecklistItemsTable,
).omit({ id: true, createdAt: true });
export type InsertConstructionTaskChecklistItem = z.infer<typeof insertConstructionTaskChecklistItemSchema>;
export type ConstructionTaskChecklistItem = typeof constructionTaskChecklistItemsTable.$inferSelect;
