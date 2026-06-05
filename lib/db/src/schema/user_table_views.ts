import { integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userTableViewsTable = pgTable(
	"user_table_views",
	{
		id: serial("id").primaryKey(),
		userId: integer("user_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		tableId: text("table_id").notNull(),
		layout: jsonb("layout").notNull().default({}),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => ({
		userTableUnique: uniqueIndex("user_table_views_user_table_idx").on(
			table.userId,
			table.tableId,
		),
	}),
);

export type UserTableView = typeof userTableViewsTable.$inferSelect;
