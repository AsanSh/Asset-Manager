import { and, eq, inArray, sql } from "drizzle-orm";
import { db, constructionUnitsTable } from "./db";

export type ProjectUnitsSyncResult = {
  created: number;
  removed: number;
  skipped: number;
};

/** Целевая раскладка квартир по этажам (номер вида 901 = 9 этаж, кв. 01). */
export function buildTargetUnitSlots(
  totalFloors: number,
  totalUnits: number,
): { floor: number; unitNumber: string }[] {
  const floors = Math.max(1, Math.floor(totalFloors));
  const targetTotal = Math.max(1, Math.floor(totalUnits));
  const basePerFloor = Math.floor(targetTotal / floors);
  const extraFloors = targetTotal % floors;
  const slots: { floor: number; unitNumber: string }[] = [];

  for (let f = 1; f <= floors; f++) {
    const unitsOnFloor = basePerFloor + (f <= extraFloors ? 1 : 0);
    for (let u = 1; u <= unitsOnFloor; u++) {
      slots.push({
        floor: f,
        unitNumber: `${f}${String(u).padStart(2, "0")}`,
      });
    }
  }

  return slots;
}

const REMOVABLE_STATUSES = new Set([
  "available",
  "draft",
  "closed",
  "unavailable",
  "construction",
]);

/**
 * Синхронизирует construction_units с totalFloors/totalUnits проекта:
 * добавляет недостающие слоты, удаляет лишние только без клиента/договора.
 */
export async function syncProjectUnits(
  companyId: number,
  projectId: number,
  totalFloors: number,
  totalUnits: number,
): Promise<ProjectUnitsSyncResult> {
  const slots = buildTargetUnitSlots(totalFloors, totalUnits);
  const targetNumbers = new Set(slots.map((s) => s.unitNumber));

  const existing = await db
    .select()
    .from(constructionUnitsTable)
    .where(
      and(
        eq(constructionUnitsTable.projectId, projectId),
        eq(constructionUnitsTable.companyId, companyId),
      ),
    );

  const existingByNumber = new Map(
    existing.map((u) => [String(u.unitNumber), u]),
  );

  const toInsert = slots
    .filter((s) => !existingByNumber.has(s.unitNumber))
    .map(
      (s): typeof constructionUnitsTable.$inferInsert => ({
        companyId,
        projectId,
        unitNumber: s.unitNumber,
        floor: s.floor,
        unitType: "apartment",
        currency: "KGS",
        status: "available",
      }),
    );

  let created = 0;
  if (toInsert.length > 0) {
    await db.insert(constructionUnitsTable).values(toInsert);
    created = toInsert.length;
  }

  const removableIds: number[] = [];
  let skipped = 0;

  for (const u of existing) {
    const num = String(u.unitNumber);
    if (targetNumbers.has(num)) continue;

    if (u.clientId || u.salesContractId) {
      skipped += 1;
      continue;
    }
    if (!REMOVABLE_STATUSES.has(String(u.status))) {
      skipped += 1;
      continue;
    }
    removableIds.push(u.id);
  }

  let removed = 0;
  if (removableIds.length > 0) {
    await db
      .delete(constructionUnitsTable)
      .where(
        and(
          eq(constructionUnitsTable.companyId, companyId),
          eq(constructionUnitsTable.projectId, projectId),
          inArray(constructionUnitsTable.id, removableIds),
        ),
      );
    removed = removableIds.length;
  }

  return { created, removed, skipped };
}

/** @deprecated Используйте syncProjectUnits — создаёт юниты только если шахматка пуста. */
export async function seedProjectUnits(
  companyId: number,
  projectId: number,
  totalFloors: number,
  totalUnits: number,
): Promise<number> {
  const [existing] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(constructionUnitsTable)
    .where(
      and(
        eq(constructionUnitsTable.projectId, projectId),
        eq(constructionUnitsTable.companyId, companyId),
      ),
    );

  if (Number(existing?.n ?? 0) > 0) {
    const { created } = await syncProjectUnits(
      companyId,
      projectId,
      totalFloors,
      totalUnits,
    );
    return created;
  }

  const { created } = await syncProjectUnits(
    companyId,
    projectId,
    totalFloors,
    totalUnits,
  );
  return created;
}
