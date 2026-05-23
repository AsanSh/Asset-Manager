import { and, eq, sql } from "drizzle-orm";
import { db, constructionUnitsTable } from "./db";

/**
 * Создаёт квартиры (construction_units) для шахматки по параметрам проекта.
 * totalUnits — общее число квартир; равномерно распределяется по этажам.
 */
export async function seedProjectUnits(
  companyId: number,
  projectId: number,
  totalFloors: number,
  totalUnits: number,
): Promise<number> {
  const floors = Math.max(1, Math.floor(totalFloors));
  const targetTotal = Math.max(1, Math.floor(totalUnits));

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
    return 0;
  }

  const basePerFloor = Math.floor(targetTotal / floors);
  const extraFloors = targetTotal % floors;

  const values: Array<typeof constructionUnitsTable.$inferInsert> = [];

  for (let f = 1; f <= floors; f++) {
    const unitsOnFloor = basePerFloor + (f <= extraFloors ? 1 : 0);
    for (let u = 1; u <= unitsOnFloor; u++) {
      const unitNum = `${f}${String(u).padStart(2, "0")}`;
      values.push({
        companyId,
        projectId,
        unitNumber: unitNum,
        floor: f,
        unitType: "apartment",
        currency: "KGS",
        status: "available",
      });
    }
  }

  if (values.length === 0) return 0;

  await db.insert(constructionUnitsTable).values(values);
  return values.length;
}
