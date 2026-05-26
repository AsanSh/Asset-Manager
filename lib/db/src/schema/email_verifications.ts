import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const emailVerificationsTable = pgTable("email_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
