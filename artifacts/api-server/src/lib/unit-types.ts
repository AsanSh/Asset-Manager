const LEGACY_UNIT_TYPE_MAP: Record<string, string> = {
  apartment: "apartment",
  квартира: "apartment",
  studio: "studio",
  студия: "studio",
  office: "office",
  офис: "office",
  commercial: "commercial",
  коммерческое: "commercial",
  parking: "parking",
  паркинг: "parking",
  storage: "storage",
  кладовая: "storage",
};

const VALID_UNIT_TYPES = new Set([
  "apartment",
  "studio",
  "office",
  "commercial",
  "parking",
  "storage",
]);

/** Типы юнитов, участвующие в продажной площади (без паркинга и кладовых). */
export const SALEABLE_UNIT_TYPES = [
  "apartment",
  "studio",
  "office",
  "commercial",
  "house",
] as const;

/** Нормализует тип юнита из Excel (русские подписи) или API-кода. */
export function resolveUnitType(raw: string | undefined): string {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "apartment";
  const mapped = LEGACY_UNIT_TYPE_MAP[s];
  if (mapped) return mapped;
  if (VALID_UNIT_TYPES.has(s)) return s;
  return "apartment";
}
