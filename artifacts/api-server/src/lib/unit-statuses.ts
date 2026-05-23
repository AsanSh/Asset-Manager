import { eq } from "drizzle-orm";
import {
  db,
  constructionUnitStatusesTable,
  constructionUnitsTable,
} from "./db";
import {
  DEFAULT_UNIT_STATUSES,
  UNIT_STATUS_COLOR_PRESETS,
  type UnitStatusColorKey,
} from "./default-unit-statuses";

export type UnitStatusRow = typeof constructionUnitStatusesTable.$inferSelect;

export async function ensureUnitStatuses(companyId: number): Promise<UnitStatusRow[]> {
  const existing = await db
    .select()
    .from(constructionUnitStatusesTable)
    .where(eq(constructionUnitStatusesTable.companyId, companyId))
    .orderBy(constructionUnitStatusesTable.sortOrder);

  if (existing.length > 0) return existing;

  await db.insert(constructionUnitStatusesTable).values(
    DEFAULT_UNIT_STATUSES.map((s) => ({
      companyId,
      code: s.code,
      label: s.label,
      colorKey: s.colorKey,
      sortOrder: s.sortOrder,
      isSystem: s.isSystem,
      saleMode: s.saleMode,
    })),
  );

  return db
    .select()
    .from(constructionUnitStatusesTable)
    .where(eq(constructionUnitStatusesTable.companyId, companyId))
    .orderBy(constructionUnitStatusesTable.sortOrder);
}

const LEGACY_STATUS_MAP: Record<string, string> = {
  свободна: "available",
  available: "available",
  забронирована: "reserved",
  бронь: "reserved",
  reserved: "reserved",
  продана: "sold",
  sold: "sold",
  заселена: "occupied",
  occupied: "occupied",
  строится: "construction",
  construction: "construction",
  registered: "sold",
};

export function slugifyStatusCode(label: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  let s = label.trim().toLowerCase();
  s = s
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("");
  s = s.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return (s || "custom_status").slice(0, 48);
}

export async function resolveUnitStatus(
  companyId: number,
  raw: string | undefined,
): Promise<string> {
  const statuses = await ensureUnitStatuses(companyId);
  const byCode = new Map(statuses.map((s) => [s.code.toLowerCase(), s.code]));
  const byLabel = new Map(
    statuses.map((s) => [s.label.trim().toLowerCase(), s.code]),
  );

  const s = String(raw || "").trim().toLowerCase();
  if (!s) return byCode.get("available") || "available";

  const legacy = LEGACY_STATUS_MAP[s];
  if (legacy && byCode.has(legacy)) return legacy;
  if (byCode.has(s)) return byCode.get(s)!;
  if (byLabel.has(s)) return byLabel.get(s)!;

  return byCode.get("available") || "available";
}

export function statusToClasses(colorKey: string) {
  const key = (colorKey in UNIT_STATUS_COLOR_PRESETS
    ? colorKey
    : "slate") as UnitStatusColorKey;
  return UNIT_STATUS_COLOR_PRESETS[key];
}
