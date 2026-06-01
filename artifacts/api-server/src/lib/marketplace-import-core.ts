import { and, eq, notInArray, sql } from "drizzle-orm";
import {
  db,
  marketplaceProductsTable,
  marketplacePriceImportsTable,
  usersTable,
} from "./db";
import {
  parseMarketplacePriceXlsx,
  slugifyCategory,
  type ParsedPriceRow,
} from "./marketplace-price-xlsx";

export const MAX_MARKETPLACE_IMPORT_BYTES = 8 * 1024 * 1024;

export function validMarketplacePriceRows(rows: ParsedPriceRow[]) {
  return rows.filter((r) => r.errors.length === 0 && r.name.trim());
}

export async function parseMarketplacePriceImport(params: {
  supplierId: number;
  fileName: string;
  base64: string;
  createdBy: number | null;
}) {
  let base64 = params.base64;
  const comma = base64.indexOf(",");
  if (comma >= 0) base64 = base64.slice(comma + 1);
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length < 8) {
    throw new Error("EMPTY_FILE");
  }
  if (buffer.length > MAX_MARKETPLACE_IMPORT_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const parsed = await parseMarketplacePriceXlsx(buffer);
  const ok = validMarketplacePriceRows(parsed.rows);
  const stats = {
    total: parsed.rows.length,
    valid: ok.length,
    invalid: parsed.rows.length - ok.length,
    skippedEmpty: parsed.skippedEmpty,
    headerRow: parsed.headerRow,
  };

  const [imp] = await db
    .insert(marketplacePriceImportsTable)
    .values({
      supplierId: params.supplierId,
      fileName: params.fileName,
      status: "review",
      stats: JSON.stringify(stats),
      rowsPreview: JSON.stringify(parsed.rows),
      createdBy: params.createdBy,
    })
    .returning();

  return { import: imp, stats, rows: parsed.rows };
}

export async function commitMarketplacePriceImport(params: {
  importId: number;
  supplierId: number;
  deactivateMissing: boolean;
}) {
  const [imp] = await db
    .select()
    .from(marketplacePriceImportsTable)
    .where(
      and(
        eq(marketplacePriceImportsTable.id, params.importId),
        eq(marketplacePriceImportsTable.supplierId, params.supplierId),
      ),
    );
  if (!imp) {
    throw new Error("IMPORT_NOT_FOUND");
  }
  if (imp.status === "committed") {
    throw new Error("ALREADY_COMMITTED");
  }

  const allRows: ParsedPriceRow[] = imp.rowsPreview ? JSON.parse(imp.rowsPreview) : [];
  const rows = validMarketplacePriceRows(allRows);
  if (rows.length === 0) {
    throw new Error("NO_VALID_ROWS");
  }

  let created = 0;
  let updated = 0;
  const touchedIds: number[] = [];

  await db.transaction(async (tx) => {
    for (const row of rows) {
      const sku = row.sku?.trim() || null;
      const name = row.name.trim();
      const category = slugifyCategory(row.category);
      const unitPrice = String(Math.round(row.unitPrice * 100) / 100);

      let existing: { id: number } | undefined;
      if (sku) {
        const [bySku] = await tx
          .select({ id: marketplaceProductsTable.id })
          .from(marketplaceProductsTable)
          .where(
            and(
              eq(marketplaceProductsTable.supplierId, params.supplierId),
              sql`lower(trim(${marketplaceProductsTable.sku})) = ${sku.toLowerCase()}`,
            ),
          )
          .limit(1);
        existing = bySku;
      }
      if (!existing) {
        const [byName] = await tx
          .select({ id: marketplaceProductsTable.id })
          .from(marketplaceProductsTable)
          .where(
            and(
              eq(marketplaceProductsTable.supplierId, params.supplierId),
              sql`lower(trim(${marketplaceProductsTable.name})) = ${name.toLowerCase()}`,
            ),
          )
          .limit(1);
        existing = byName;
      }

      if (existing) {
        const [u] = await tx
          .update(marketplaceProductsTable)
          .set({
            name,
            sku,
            category,
            unit: row.unit,
            unitPrice,
            description: row.description,
            isActive: true,
            lastImportId: params.importId,
            updatedAt: new Date(),
          })
          .where(eq(marketplaceProductsTable.id, existing.id))
          .returning({ id: marketplaceProductsTable.id });
        if (u) {
          updated++;
          touchedIds.push(u.id);
        }
      } else {
        const [ins] = await tx
          .insert(marketplaceProductsTable)
          .values({
            supplierId: params.supplierId,
            sku,
            name,
            category,
            unit: row.unit,
            unitPrice,
            currency: "KGS",
            description: row.description,
            isActive: true,
            lastImportId: params.importId,
          })
          .returning({ id: marketplaceProductsTable.id });
        if (ins) {
          created++;
          touchedIds.push(ins.id);
        }
      }
    }

    if (params.deactivateMissing && touchedIds.length > 0) {
      await tx
        .update(marketplaceProductsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(marketplaceProductsTable.supplierId, params.supplierId),
            notInArray(marketplaceProductsTable.id, touchedIds),
          ),
        );
    }

    await tx
      .update(marketplacePriceImportsTable)
      .set({
        status: "committed",
        stats: JSON.stringify({
          ...(imp.stats ? JSON.parse(imp.stats) : {}),
          created,
          updated,
          committed: rows.length,
        }),
        rowsPreview: null,
        updatedAt: new Date(),
      })
      .where(eq(marketplacePriceImportsTable.id, params.importId));
  });

  return { created, updated, total: rows.length };
}

export async function getMarketplaceSupplierIdForUser(
  userId: number,
): Promise<number | null> {
  const [me] = await db
    .select({
      role: usersTable.role,
      linkedMarketplaceSupplierId: usersTable.linkedMarketplaceSupplierId,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!me || me.role !== "marketplace_supplier" || !me.linkedMarketplaceSupplierId) {
    return null;
  }
  return me.linkedMarketplaceSupplierId;
}
