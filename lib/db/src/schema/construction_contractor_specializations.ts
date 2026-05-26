import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const constructionContractorSpecializationsTable = pgTable(
  "construction_contractor_specializations",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);
