import {
  constructionProjectsTable,
  constructionUnitStatusesTable,
  constructionUnitsTable,
  type ConstructionProject,
  type ConstructionUnit,
} from "./db";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { ensureUnitStatuses } from "./unit-statuses";

export function parseNum(v: unknown): number {
  const n = parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
}

export function computeListPrice(
  project: Pick<ConstructionProject, "baseSalePricePerSqm" | "costPerSqm"> | null | undefined,
  unit: Pick<ConstructionUnit, "area" | "pricePerSqm" | "priceCoefficient">,
): number {
  const area = parseNum(unit.area);
  const coef = parseNum(unit.priceCoefficient) || 1;
  const base =
    parseNum(project?.baseSalePricePerSqm) ||
    parseNum(project?.costPerSqm) ||
    parseNum(unit.pricePerSqm);
  return area * base * coef;
}

export function isSalesRole(role: string): boolean {
  return role === "sales_manager";
}

export function canManagePricing(role: string, permissions: string[] = []): boolean {
  if (["super_admin", "admin", "company_admin", "owner", "commercial_director"].includes(role)) {
    return true;
  }
  if (
    permissions.some(
      (p) => p === "construction.pricing" || p === "construction.pricing.approve",
    )
  ) {
    return true;
  }
  return false;
}

export async function getStatusSaleMode(
  companyId: number,
  statusCode: string,
): Promise<"none" | "reserved" | "sold"> {
  const statuses = await ensureUnitStatuses(companyId);
  const row = statuses.find((s) => s.code === statusCode);
  const mode = row?.saleMode;
  if (mode === "reserved" || mode === "sold") return mode;
  return "none";
}

/** Продажник может менять статус только если цена утверждена и целевой статус — бронь/продажа. */
export async function assertUnitStatusAllowed(opts: {
  companyId: number;
  role: string;
  unit: ConstructionUnit;
  nextStatus: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const saleMode = await getStatusSaleMode(opts.companyId, opts.nextStatus);
  if (!isSalesRole(opts.role)) return { ok: true };

  if (saleMode === "none") {
    return { ok: false, error: "Менеджер продаж может переводить квартиру только в бронь или продажу" };
  }
  if (!opts.unit.priceApproved) {
    return {
      ok: false,
      error: "Цена не утверждена коммерческим директором. Сначала утвердите цену в шахматке",
    };
  }
  return { ok: true };
}

export function enrichUnitPricing(
  project: Pick<ConstructionProject, "baseSalePricePerSqm" | "costPerSqm"> | null,
  unit: ConstructionUnit,
) {
  const listPrice = computeListPrice(project, unit);
  return {
    ...unit,
    listPrice: listPrice > 0 ? String(listPrice) : null,
    priceCoefficient: unit.priceCoefficient ?? "1",
    priceApproved: !!unit.priceApproved,
  };
}

export async function loadProjectForPricing(
  companyId: number,
  projectId: number,
): Promise<ConstructionProject | null> {
  const [row] = await db
    .select()
    .from(constructionProjectsTable)
    .where(
      and(
        eq(constructionProjectsTable.id, projectId),
        eq(constructionProjectsTable.companyId, companyId),
      ),
    );
  return row ?? null;
}

export async function approveUnitPrice(opts: {
  companyId: number,
  unitId: number,
  userId: number,
  coefficient?: number,
}): Promise<ConstructionUnit | null> {
  const [unit] = await db
    .select()
    .from(constructionUnitsTable)
    .where(
      and(
        eq(constructionUnitsTable.id, opts.unitId),
        eq(constructionUnitsTable.companyId, opts.companyId),
      ),
    );
  if (!unit) return null;

  const project = await loadProjectForPricing(opts.companyId, unit.projectId);
  const coef =
    opts.coefficient !== undefined
      ? String(opts.coefficient)
      : unit.priceCoefficient ?? "1";
  const listPrice = computeListPrice(project, { ...unit, priceCoefficient: coef });
  const area = parseNum(unit.area);
  const pps = area > 0 ? listPrice / area : parseNum(unit.pricePerSqm);

  const [updated] = await db
    .update(constructionUnitsTable)
    .set({
      priceCoefficient: coef,
      pricePerSqm: pps > 0 ? String(pps) : unit.pricePerSqm,
      totalPrice: listPrice > 0 ? String(listPrice) : unit.totalPrice,
      priceApproved: true,
      priceApprovedBy: opts.userId,
      priceApprovedAt: new Date(),
    })
    .where(eq(constructionUnitsTable.id, opts.unitId))
    .returning();
  return updated ?? null;
}
