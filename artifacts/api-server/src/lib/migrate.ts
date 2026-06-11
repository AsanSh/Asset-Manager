import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db, pool } from "./db";
import { logger } from "./logger";

function resolveMigrationsFolder(): string {
  const candidates = [
    path.join(process.cwd(), "drizzle/migrations"),
    path.join(process.cwd(), "artifacts/api-server/drizzle/migrations"),
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../drizzle/migrations",
    ),
  ];
  for (const folder of candidates) {
    if (existsSync(path.join(folder, "meta/_journal.json"))) return folder;
  }
  throw new Error(`Drizzle migrations not found (cwd=${process.cwd()})`);
}

/** Prod already ran legacy 0000–0033; mark baseline applied without re-CREATE. */
async function markBaselineIfLegacySchemaPresent(
  migrationsFolder: string,
): Promise<void> {
  const migrations = readMigrationFiles({ migrationsFolder });
  if (migrations.length !== 1) return;

  const baseline = migrations[0];
  const { rows: applied } = await pool.query<{ hash: string }>(
    "SELECT hash FROM drizzle.__drizzle_migrations",
  );
  if (applied.some((row) => row.hash === baseline.hash)) return;

  const { rows: hasCompanies } = await pool.query<{ ok: number }>(
    `SELECT 1 AS ok FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'companies' LIMIT 1`,
  );
  if (hasCompanies.length === 0) return;

  await pool.query(
    `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
    [baseline.hash, baseline.folderMillis],
  );
  logger.info(
    "DB migrations: prod baseline marked applied (legacy schema already present)",
  );
}

export async function runMigrations(): Promise<void> {
  const migrationsFolder = resolveMigrationsFolder();
  try {
    await markBaselineIfLegacySchemaPresent(migrationsFolder);
    await migrate(db, { migrationsFolder });
    logger.info("DB migrations: OK");
  } catch (err) {
    logger.error({ err }, "DB migrations failed");
    throw err;
  }
}
