import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const currencyRatesTable = pgTable("currency_rates", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  currencyCode: text("currency_code").notNull(),
  nbkrRate: numeric("nbkr_rate", { precision: 12, scale: 4 }),
  optimaRate: numeric("optima_rate", { precision: 12, scale: 4 }),
  rsbRate: numeric("rsb_rate", { precision: 12, scale: 4 }),
  bakaiRate: numeric("bakai_rate", { precision: 12, scale: 4 }),
  dobankRate: numeric("dobank_rate", { precision: 12, scale: 4 }),
  mBankRate: numeric("mbank_rate", { precision: 12, scale: 4 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCurrencyRateSchema = createInsertSchema(currencyRatesTable).omit({ id: true, createdAt: true });
export type InsertCurrencyRate = z.infer<typeof insertCurrencyRateSchema>;
export type CurrencyRate = typeof currencyRatesTable.$inferSelect;
