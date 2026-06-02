import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type TaskPhotoType = "before" | "progress" | "after";

export const constructionTaskPhotosTable = pgTable("construction_task_photos", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  taskId: integer("task_id").notNull(),
  uploadedBy: integer("uploaded_by"),
  photoType: text("photo_type").notNull(),
  photoUrl: text("photo_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption"),
  takenAt: timestamp("taken_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConstructionTaskPhotoSchema = createInsertSchema(
  constructionTaskPhotosTable,
).omit({ id: true, createdAt: true });

export type InsertConstructionTaskPhoto = z.infer<
  typeof insertConstructionTaskPhotoSchema
>;
export type ConstructionTaskPhoto = typeof constructionTaskPhotosTable.$inferSelect;

