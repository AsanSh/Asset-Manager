import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { db, pool } from "./db";
import { logger } from "./logger";

export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.join(process.cwd(), "drizzle/migrations");
  try {
    await migrate(db, { migrationsFolder });
    logger.info("DB migrations: OK");
  } catch (err) {
    logger.error({ err }, "DB migrations failed");
    throw err;
  } finally {
    // migrate() opens its own client — pool stays open for the app
  }
}
