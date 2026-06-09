import { migrate } from "drizzle-orm/node-postgres/migrator";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db, pool } from "./db";
import { logger } from "./logger";

function resolveMigrationsFolder(): string {
  const candidates = [
    path.join(process.cwd(), "drizzle/migrations"),
    path.join(process.cwd(), "artifacts/api-server/drizzle/migrations"),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../drizzle/migrations"),
  ];
  for (const folder of candidates) {
    if (existsSync(path.join(folder, "meta/_journal.json"))) return folder;
  }
  throw new Error(
    `Drizzle migrations not found (cwd=${process.cwd()})`,
  );
}

export async function runMigrations(): Promise<void> {
  const migrationsFolder = resolveMigrationsFolder();
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
