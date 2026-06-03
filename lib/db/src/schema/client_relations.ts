import { pgTable, serial, integer, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientSegmentsTable = pgTable("client_segments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  criteria: jsonb("criteria"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const clientPortalPublicationsTable = pgTable("client_portal_publications", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: text("audience").notNull().default("all"),
  segmentId: integer("segment_id"),
  projectId: integer("project_id"),
  isActive: boolean("is_active").notNull().default(true),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const clientPortalAppealsTable = pgTable("client_portal_appeals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  buyerId: integer("buyer_id").notNull(),
  contractId: integer("contract_id"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  response: text("response"),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClientSegmentSchema = createInsertSchema(clientSegmentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertClientPortalPublicationSchema = createInsertSchema(clientPortalPublicationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertClientPortalAppealSchema = createInsertSchema(clientPortalAppealsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ClientSegment = typeof clientSegmentsTable.$inferSelect;
export type ClientPortalPublication = typeof clientPortalPublicationsTable.$inferSelect;
export type ClientPortalAppeal = typeof clientPortalAppealsTable.$inferSelect;
