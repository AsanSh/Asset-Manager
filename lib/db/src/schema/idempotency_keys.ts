import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const idempotencyKeysTable = pgTable("idempotency_keys", {
  key: text("key").primaryKey(),
  companyId: integer("company_id").notNull(),
  userId: integer("user_id"),
  route: text("route").notNull(),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type IdempotencyKey = typeof idempotencyKeysTable.$inferSelect;
