import { pgTable, text, serial, timestamp, integer, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionTaskAttachmentsTable = pgTable("construction_task_attachments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  taskId: integer("task_id").notNull(),
  uploadedBy: integer("uploaded_by"),
  docType: text("doc_type").notNull().default("other"),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type"),
  fileSize: bigint("file_size", { mode: "bigint" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConstructionTaskAttachmentSchema = createInsertSchema(
  constructionTaskAttachmentsTable,
).omit({ id: true, createdAt: true });
export type InsertConstructionTaskAttachment = z.infer<
  typeof insertConstructionTaskAttachmentSchema
>;
export type ConstructionTaskAttachment = typeof constructionTaskAttachmentsTable.$inferSelect;

