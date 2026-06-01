import ExcelJS from "exceljs";

export type ParsedPriceRow = {
  rowNumber: number;
  name: string;
  unitPrice: number;
  unit: string;
  sku: string | null;
  category: string;
  description: string | null;
  errors: string[];
};

export type ParsePriceResult = {
  rows: ParsedPriceRow[];
  headerRow: number;
  columnMap: Record<string, number>;
  skippedEmpty: number;
};

const NAME_HEADERS = [
  "название",
  "наименование",
  "товар",
  "материал",
  "номенклатура",
  "name",
  "product",
  "item",
];
const PRICE_HEADERS = ["цена", "стоимость", "price", "unit price", "unit_price", "прайс"];
const UNIT_HEADERS = ["ед", "ед.", "единица", "unit", "ед.изм", "ед изм"];
const SKU_HEADERS = ["артикул", "код", "sku", "арт", "код товара", "vendor code"];
const CATEGORY_HEADERS = ["категория", "группа", "category", "раздел"];
const DESC_HEADERS = ["описание", "description", "примечание"];

function normHeader(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cellStr(row: ExcelJS.Row, col: number): string {
  const cell = row.getCell(col);
  if (cell.value == null) return "";
  if (typeof cell.value === "object" && "text" in cell.value) {
    return String((cell.value as { text?: string }).text ?? "").trim();
  }
  if (typeof cell.value === "object" && "result" in cell.value) {
    return String((cell.value as { result?: unknown }).result ?? "").trim();
  }
  return String(cell.value).trim();
}

function parsePrice(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const s = String(v)
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function findColumn(headers: string[], variants: string[]): number | null {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;
    if (variants.some((v) => h === v || h.includes(v))) return i + 1;
  }
  return null;
}

export async function parseMarketplacePriceXlsx(buffer: Buffer): Promise<ParsePriceResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { rows: [], headerRow: 0, columnMap: {}, skippedEmpty: 0 };
  }

  let headerRowIndex = 1;
  let columnMap: Record<string, number> = {};
  const maxScan = Math.min(sheet.rowCount, 25);

  for (let r = 1; r <= maxScan; r++) {
    const row = sheet.getRow(r);
    const headers: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] = normHeader(cell.value);
    });
    const nameCol = findColumn(headers, NAME_HEADERS);
    const priceCol = findColumn(headers, PRICE_HEADERS);
    if (nameCol && priceCol) {
      headerRowIndex = r;
      columnMap = {
        name: nameCol,
        price: priceCol,
        unit: findColumn(headers, UNIT_HEADERS) ?? 0,
        sku: findColumn(headers, SKU_HEADERS) ?? 0,
        category: findColumn(headers, CATEGORY_HEADERS) ?? 0,
        description: findColumn(headers, DESC_HEADERS) ?? 0,
      };
      break;
    }
  }

  if (!columnMap.name || !columnMap.price) {
    columnMap = { name: 1, price: 2, unit: 3, sku: 4, category: 0, description: 0 };
    headerRowIndex = 1;
  }

  const rows: ParsedPriceRow[] = [];
  let skippedEmpty = 0;
  const limit = Math.min(sheet.rowCount, headerRowIndex + 5000);

  for (let r = headerRowIndex + 1; r <= limit; r++) {
    const row = sheet.getRow(r);
    const name = cellStr(row, columnMap.name).trim();
    if (!name) {
      skippedEmpty++;
      continue;
    }
    const priceRaw = row.getCell(columnMap.price).value;
    const unitPrice = parsePrice(priceRaw);
    const errors: string[] = [];
    if (unitPrice == null || unitPrice < 0) {
      errors.push("Некорректная цена");
    }
    const unit =
      columnMap.unit > 0 ? cellStr(row, columnMap.unit) || "шт" : "шт";
    const sku =
      columnMap.sku > 0 ? cellStr(row, columnMap.sku) || null : null;
    const category =
      columnMap.category > 0 ? cellStr(row, columnMap.category) || "materials" : "materials";
    const description =
      columnMap.description > 0 ? cellStr(row, columnMap.description) || null : null;

    rows.push({
      rowNumber: r,
      name,
      unitPrice: unitPrice ?? 0,
      unit: unit.slice(0, 32) || "шт",
      sku: sku ? sku.slice(0, 128) : null,
      category: category.slice(0, 64) || "materials",
      description,
      errors,
    });
  }

  return { rows, headerRow: headerRowIndex, columnMap, skippedEmpty };
}

export function slugifyCategory(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return "materials";
  if (/^[a-z0-9_-]+$/.test(s)) return s.slice(0, 64);
  return "materials";
}
