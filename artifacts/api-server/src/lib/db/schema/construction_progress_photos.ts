import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionProgressPhotosTable = pgTable("construction_progress_photos", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  projectId: integer("project_id").notNull(),
  floorNumber: integer("floor_number"),
  photoUrl: text("photo_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  description: text("description"),
  takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
  uploadedBy: integer("uploaded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConstructionProgressPhotoSchema = createInsertSchema(constructionProgressPhotosTable).omit({ id: true, createdAt: true });
export type InsertConstructionProgressPhoto = z.infer<typeof insertConstructionProgressPhotoSchema>;
export type ConstructionProgressPhoto = typeof constructionProgressPhotosTable.$inferSelect;
