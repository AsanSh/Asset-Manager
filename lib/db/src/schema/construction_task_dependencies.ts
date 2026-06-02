import { pgTable, serial, timestamp, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionTaskDependenciesTable = pgTable("construction_task_dependencies", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  predecessorTaskId: integer("predecessor_task_id").notNull(),
  successorTaskId: integer("successor_task_id").notNull(),
  dependencyType: text("dependency_type").notNull().default("FS"),
  lagDays: integer("lag_days").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConstructionTaskDependencySchema = createInsertSchema(
  constructionTaskDependenciesTable,
).omit({ id: true, createdAt: true });

export type InsertConstructionTaskDependency = z.infer<typeof insertConstructionTaskDependencySchema>;
export type ConstructionTaskDependency = typeof constructionTaskDependenciesTable.$inferSelect;
