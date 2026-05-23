import { pgTable, serial, integer, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  userId: integer("user_id"),                  // null = для всех пользователей компании
  fromUserId: integer("from_user_id"),
  type: text("type").notNull().default("info"),
  title: text("title").notNull(),
  body: text("body"),
  message: text("message"),                    // alias for body
  icon: text("icon"),                          // alert-circle, check-circle, warning
  color: text("color"),                        // red, green, yellow, blue
  link: text("link"),
  metadata: text("metadata"),                  // JSON для доп. данных
  isRead: boolean("is_read").notNull().default(false),
  read: boolean("read").notNull().default(false), // alias for isRead
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
