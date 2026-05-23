import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, moduleSettingsTable } from "../lib/db";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";

const router: ReturnType<typeof Router> = Router();

const AVAILABLE_MODULES = [
  {
    key: "rental",
    name: "Управление арендой",
    description: "Договоры аренды, начисления, платежи, депозиты, отчёты собственников",
    icon: "Home",
    category: "core",
  },
  {
    key: "sales",
    name: "Управление продажами",
    description: "Объекты на продажу, шахматка, договоры купли-продажи, рассрочка",
    icon: "Building2",
    category: "core",
  },
  {
    key: "reports",
    name: "Финансовые отчёты",
    description: "Детальная отчётность: долги, денежный поток, сводки по периодам",
    icon: "BarChart3",
    category: "analytics",
  },
  {
    key: "notifications",
    name: "Уведомления клиентов",
    description: "Автоматические SMS и email уведомления арендаторам о начислениях и задолженностях",
    icon: "Bell",
    category: "communication",
  },
  {
    key: "crm",
    name: "CRM для клиентов",
    description: "Воронка продаж, лиды, история взаимодействий с покупателями",
    icon: "Users",
    category: "communication",
  },
  {
    key: "maintenance",
    name: "Заявки на обслуживание",
    description: "Приём и отслеживание заявок от арендаторов, учёт ремонтных работ",
    icon: "Wrench",
    category: "operations",
  },
  {
    key: "analytics",
    name: "Аналитика и BI",
    description: "Расширенная аналитика: доходность по объектам, прогнозы, сравнения",
    icon: "TrendingUp",
    category: "analytics",
  },
  {
    key: "documents",
    name: "Электронный документооборот",
    description: "Хранение, подписание и управление документами, шаблоны договоров",
    icon: "FileText",
    category: "operations",
  },
  {
    key: "construction",
    name: "Контроль строительства",
    description: "Проекты, этапы, задачи, бюджет, операции, шахматка, ИИ-инструменты",
    icon: "HardHat",
    category: "core",
  },
  {
    key: "warehouse",
    name: "Закупки и склад",
    description: "Материалы, поставщики, поступления, списания, инвентаризация",
    icon: "Package",
    category: "operations",
  },
];

// GET /modules — список модулей с состоянием для компании
router.get("/modules", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const cid = req.companyId;
  if (!cid) { res.json(AVAILABLE_MODULES.map(m => ({ ...m, isEnabled: false }))); return; }

  const settings = await db.select().from(moduleSettingsTable).where(eq(moduleSettingsTable.companyId, cid));
  const settingsMap = new Map(settings.map(s => [s.moduleKey, s]));

  const result = AVAILABLE_MODULES.map(m => {
    const s = settingsMap.get(m.key);
    return {
      ...m,
      isEnabled: s?.isEnabled ?? m.key === "rental",
      enabledAt: s?.enabledAt ?? null,
      settingId: s?.id ?? null,
    };
  });

  res.json(result);
});

// POST /modules/:key/toggle — включить/выключить модуль
router.post("/modules/:key/toggle", requireAuth, requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const key = req.params.key as string;
  const cid = req.companyId;
  if (!cid) { res.status(400).json({ error: "Нет привязки к организации" }); return; }

  const module = AVAILABLE_MODULES.find(m => m.key === key);
  if (!module) { res.status(404).json({ error: "Модуль не найден" }); return; }

  const [existing] = await db.select().from(moduleSettingsTable)
    .where(and(eq(moduleSettingsTable.companyId, cid), eq(moduleSettingsTable.moduleKey, key)));

  let result;
  if (existing) {
    const newEnabled = !existing.isEnabled;
    [result] = await db.update(moduleSettingsTable)
      .set({ isEnabled: newEnabled, enabledAt: newEnabled ? new Date() : null })
      .where(eq(moduleSettingsTable.id, existing.id))
      .returning();
  } else {
    [result] = await db.insert(moduleSettingsTable).values({
      companyId: cid,
      moduleKey: key,
      isEnabled: true,
      enabledAt: new Date(),
    }).returning();
  }

  res.json({ ...result, module });
});

// GET /modules/enabled — список включённых ключей модулей
router.get("/modules/enabled", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const cid = req.companyId;
  if (!cid) { res.json(["rental"]); return; }

  const settings = await db.select().from(moduleSettingsTable)
    .where(and(eq(moduleSettingsTable.companyId, cid), eq(moduleSettingsTable.isEnabled, true)));

  const enabledKeys = settings.map(s => s.moduleKey);
  if (!enabledKeys.includes("rental")) enabledKeys.push("rental");

  res.json(enabledKeys);
});

export default router;
