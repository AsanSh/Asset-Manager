import { and, eq, isNotNull, ne } from "drizzle-orm";
import {
  constructionExpensesTable,
  constructionOperationsTable,
  db,
  expensesTable,
  financialCategoriesTable,
} from "./db";

export type CategoryModule = "all" | "rental" | "construction" | "proptech" | "warehouse";

export type CategoryPreset = {
  name: string;
  type: "income" | "expense";
  module: CategoryModule;
  sortOrder: number;
};

/** Статьи из форм операций, ОПУ и отчётов — единый справочник для настроек. */
export const FINANCIAL_CATEGORY_PRESETS: CategoryPreset[] = [
  // Строительство — доходы (operations.tsx)
  { name: "Платёж по договору", type: "income", module: "construction", sortOrder: 10 },
  { name: "Первоначальный взнос", type: "income", module: "construction", sortOrder: 20 },
  { name: "Аванс покупателя", type: "income", module: "construction", sortOrder: 30 },
  { name: "Инвестиции", type: "income", module: "construction", sortOrder: 40 },
  { name: "Возврат от поставщика", type: "income", module: "construction", sortOrder: 50 },
  { name: "Перевод между счетами", type: "income", module: "construction", sortOrder: 60 },
  { name: "Прочие доходы", type: "income", module: "construction", sortOrder: 70 },
  // Строительство — расходы (operations.tsx)
  { name: "Строительство", type: "expense", module: "construction", sortOrder: 110 },
  { name: "Зарплата бригады", type: "expense", module: "construction", sortOrder: 120 },
  { name: "Подрядчики", type: "expense", module: "construction", sortOrder: 130 },
  { name: "Материалы", type: "expense", module: "construction", sortOrder: 140 },
  { name: "Аренда техники", type: "expense", module: "construction", sortOrder: 150 },
  { name: "OPEX", type: "expense", module: "construction", sortOrder: 160 },
  { name: "Налоги и взносы", type: "expense", module: "construction", sortOrder: 170 },
  { name: "Документация", type: "expense", module: "construction", sortOrder: 180 },
  { name: "Земельный участок", type: "expense", module: "construction", sortOrder: 190 },
  { name: "Займы другим проектам", type: "expense", module: "construction", sortOrder: 200 },
  { name: "Подотчёт", type: "expense", module: "construction", sortOrder: 210 },
  { name: "Прочие расходы", type: "expense", module: "construction", sortOrder: 220 },
  // Строительство — расходы проекта (pnl.tsx CONST_EXPENSE_CATS)
  { name: "Оплата труда", type: "expense", module: "construction", sortOrder: 230 },
  { name: "Техника/Оборудование", type: "expense", module: "construction", sortOrder: 240 },
  { name: "Субподряд", type: "expense", module: "construction", sortOrder: 250 },
  { name: "Проектирование", type: "expense", module: "construction", sortOrder: 260 },
  { name: "Разрешения/Согласования", type: "expense", module: "construction", sortOrder: 270 },
  { name: "Коммуналка", type: "expense", module: "construction", sortOrder: 280 },
  { name: "Транспорт", type: "expense", module: "construction", sortOrder: 290 },
  { name: "Административные", type: "expense", module: "construction", sortOrder: 300 },
  // Аренда — постоянные (opu.tsx FIXED_CATS)
  { name: "Зарплата", type: "expense", module: "rental", sortOrder: 410 },
  { name: "Бонусы", type: "expense", module: "rental", sortOrder: 420 },
  { name: "Маркетинг/Реклама", type: "expense", module: "rental", sortOrder: 430 },
  { name: "Юруслуги", type: "expense", module: "rental", sortOrder: 440 },
  { name: "Транспортные расходы", type: "expense", module: "rental", sortOrder: 450 },
  { name: "Программное обеспечения", type: "expense", module: "rental", sortOrder: 460 },
  { name: "Канцелярия", type: "expense", module: "rental", sortOrder: 470 },
  { name: "Хозрасход", type: "expense", module: "rental", sortOrder: 480 },
  { name: "Интернет", type: "expense", module: "rental", sortOrder: 500 },
  { name: "Связь", type: "expense", module: "rental", sortOrder: 510 },
  { name: "Мелкий ремонт", type: "expense", module: "rental", sortOrder: 520 },
  { name: "Единый налог", type: "expense", module: "rental", sortOrder: 531 },
  { name: "Налог на имущество", type: "expense", module: "rental", sortOrder: 532 },
  { name: "Налог прочие", type: "expense", module: "rental", sortOrder: 533 },
  // Аренда — на объекте (expenses.tsx)
  { name: "Обслуживание", type: "expense", module: "rental", sortOrder: 540 },
  { name: "Коммунальные услуги", type: "expense", module: "rental", sortOrder: 550 },
  { name: "Управляющая компания", type: "expense", module: "rental", sortOrder: 560 },
  { name: "Уборка", type: "expense", module: "rental", sortOrder: 570 },
  { name: "Ремонт", type: "expense", module: "rental", sortOrder: 580 },
  { name: "Прочее", type: "expense", module: "rental", sortOrder: 590 },
];

const RENTAL_CATEGORY_KEY_LABELS: Record<string, string> = {
  salary: "Зарплата",
  bonus: "Бонусы",
  marketing: "Маркетинг/Реклама",
  legal: "Юруслуги",
  transport: "Транспортные расходы",
  software: "Программное обеспечения",
  office: "Канцелярия",
  facilities: "Хозрасход",
  utilities: "Коммуналка",
  internet: "Интернет",
  communication: "Связь",
  maintenance: "Мелкий ремонт",
  tax: "Налоги и взносы",
  tax_single: "Единый налог",
  tax_property: "Налог на имущество",
  tax_other: "Налог прочие",
  other: "Прочие расходы",
  management_fee: "Управляющая компания",
  cleaning: "Уборка",
  repair: "Ремонт",
};

const CONSTRUCTION_EXPENSE_KEY_LABELS: Record<string, string> = {
  materials: "Материалы",
  labor: "Оплата труда",
  equipment: "Техника/Оборудование",
  subcontract: "Субподряд",
  design: "Проектирование",
  permits: "Разрешения/Согласования",
  utilities: "Коммуналка",
  transport: "Транспорт",
  admin: "Административные",
  other: "Прочие расходы",
};

const PRESET_COLORS = [
  "#4F46E5",
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
];

function catalogKey(type: string, module: string, name: string) {
  return `${type}|${module}|${name.trim().toLowerCase()}`;
}

function resolveCategoryName(
  raw: string,
  type: "income" | "expense",
  module: CategoryModule,
): string {
  const trimmed = raw.trim();
  if (!trimmed) return type === "income" ? "Прочие доходы" : "Прочие расходы";
  if (module === "rental" && RENTAL_CATEGORY_KEY_LABELS[trimmed]) {
    return RENTAL_CATEGORY_KEY_LABELS[trimmed];
  }
  if (module === "construction" && CONSTRUCTION_EXPENSE_KEY_LABELS[trimmed]) {
    return CONSTRUCTION_EXPENSE_KEY_LABELS[trimmed];
  }
  return trimmed;
}

async function discoverUsageCategories(companyId: number): Promise<CategoryPreset[]> {
  const discovered: CategoryPreset[] = [];
  let sort = 900;

  const opRows = await db
    .select({
      category: constructionOperationsTable.category,
      type: constructionOperationsTable.type,
    })
    .from(constructionOperationsTable)
    .where(
      and(
        eq(constructionOperationsTable.companyId, companyId),
        isNotNull(constructionOperationsTable.category),
        ne(constructionOperationsTable.category, ""),
      ),
    );

  const opSeen = new Set<string>();
  for (const row of opRows) {
    const opType = row.type === "income" ? "income" : "expense";
    const name = resolveCategoryName(String(row.category), opType, "construction");
    const key = catalogKey(opType, "construction", name);
    if (opSeen.has(key)) continue;
    opSeen.add(key);
    discovered.push({
      name,
      type: opType,
      module: "construction",
      sortOrder: sort++,
    });
  }

  const expRows = await db
    .select({ category: constructionExpensesTable.category })
    .from(constructionExpensesTable)
    .where(
      and(
        eq(constructionExpensesTable.companyId, companyId),
        isNotNull(constructionExpensesTable.category),
        ne(constructionExpensesTable.category, ""),
      ),
    );

  const expSeen = new Set<string>();
  for (const row of expRows) {
    const name = resolveCategoryName(String(row.category), "expense", "construction");
    const key = catalogKey("expense", "construction", name);
    if (expSeen.has(key)) continue;
    expSeen.add(key);
    discovered.push({ name, type: "expense", module: "construction", sortOrder: sort++ });
  }

  const rentalRows = await db
    .select({ category: expensesTable.category })
    .from(expensesTable)
    .where(
      and(
        eq(expensesTable.companyId, companyId),
        isNotNull(expensesTable.category),
        ne(expensesTable.category, ""),
      ),
    );

  const rentalSeen = new Set<string>();
  for (const row of rentalRows) {
    const name = resolveCategoryName(String(row.category), "expense", "rental");
    const key = catalogKey("expense", "rental", name);
    if (rentalSeen.has(key)) continue;
    rentalSeen.add(key);
    discovered.push({ name, type: "expense", module: "rental", sortOrder: sort++ });
  }

  return discovered;
}

/** Идемпотентно наполняет financial_categories пресетами и статьями из операций. */
export async function ensureCompanyFinancialCategories(companyId: number): Promise<void> {
  const existing = await db
    .select()
    .from(financialCategoriesTable)
    .where(eq(financialCategoriesTable.companyId, companyId));

  const seen = new Set<string>();
  for (const row of existing) {
    seen.add(catalogKey(row.type, row.module, row.name));
    if (row.module === "all") {
      seen.add(catalogKey(row.type, "construction", row.name));
      seen.add(catalogKey(row.type, "rental", row.name));
    }
  }

  const toInsert: CategoryPreset[] = [
    ...FINANCIAL_CATEGORY_PRESETS,
    ...(await discoverUsageCategories(companyId)),
  ];

  let colorIdx = existing.length;
  for (const preset of toInsert) {
    const key = catalogKey(preset.type, preset.module, preset.name);
    if (seen.has(key)) continue;
    seen.add(key);

    await db.insert(financialCategoriesTable).values({
      companyId,
      name: preset.name,
      type: preset.type,
      parentId: null,
      module: preset.module,
      color: PRESET_COLORS[colorIdx % PRESET_COLORS.length],
      sortOrder: preset.sortOrder,
      isActive: true,
    });
    colorIdx += 1;
  }
}
