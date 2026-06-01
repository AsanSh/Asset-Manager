import { Router, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  moduleSettingsTable,
  payrollEmployeesTable,
  payrollSalaryChangesTable,
  payrollApprovalRequestsTable,
} from "../lib/db";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import {
  requireTenantCompany,
  getScopedCompanyId,
} from "../middleware/tenant";
import { sendServerError } from "../lib/http-errors";

const router = Router();
router.use(requireAuth);

const PAYROLL_ACCESS_MODULE = "payroll_access";
const MANAGER_ROLES = new Set(["company_admin", "admin"]);
const FINANCE_ROLES = new Set(["finance"]);
const FORBIDDEN_MESSAGE = "Доступ к зарплатной ведомости запрещён";

type AccessInfo = {
  canAccess: boolean;
  isManager: boolean;
  isFinance: boolean;
  allowedUserIds: number[];
};

async function getAllowedUserIds(companyId: number): Promise<number[]> {
  const [row] = await db
    .select()
    .from(moduleSettingsTable)
    .where(
      and(
        eq(moduleSettingsTable.companyId, companyId),
        eq(moduleSettingsTable.moduleKey, PAYROLL_ACCESS_MODULE),
      ),
    );
  if (!row?.settings) return [];
  try {
    const parsed = JSON.parse(row.settings) as { allowedUserIds?: unknown };
    const ids = Array.isArray(parsed.allowedUserIds) ? parsed.allowedUserIds : [];
    return ids
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
}

async function computeAccess(
  req: AuthenticatedRequest,
  companyId: number,
): Promise<AccessInfo> {
  const role = req.userRole ?? "";
  const isManager = MANAGER_ROLES.has(role);
  const isFinance = FINANCE_ROLES.has(role);
  const allowedUserIds = await getAllowedUserIds(companyId);
  const inAllowlist = req.userId != null && allowedUserIds.includes(req.userId);
  return {
    canAccess: isManager || isFinance || inAllowlist,
    isManager,
    isFinance,
    allowedUserIds,
  };
}

/**
 * Gate every payroll endpoint. Resolves access for the scoped company.
 * Returns the access info when allowed, or null after sending a 403.
 */
async function assertPayrollAccess(
  req: AuthenticatedRequest,
  res: Response,
): Promise<AccessInfo | null> {
  const companyId = req.scopedCompanyId!;
  const access = await computeAccess(req, companyId);
  if (!access.canAccess) {
    res.status(403).json({ error: FORBIDDEN_MESSAGE });
    return null;
  }
  return access;
}

function toAmount(raw: unknown): string {
  const n = parseFloat(String(raw ?? "0"));
  return Number.isFinite(n) ? String(n) : "0";
}

function normalizeDate(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return s.slice(0, 16);
}

const VALID_EMPLOYMENT = new Set(["staff", "parttime", "contract"]);

// GET /construction/payroll/access — auth only, returns canAccess flag (no 403)
router.get(
  "/payroll/access",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const companyId = getScopedCompanyId(req);
    if (companyId == null) {
      res.json({
        canAccess: false,
        isManager: false,
        isFinance: false,
        allowedUserIds: [],
      });
      return;
    }
    const access = await computeAccess(req, companyId);
    res.json(access);
  },
);

// All remaining endpoints require a tenant company.
router.use("/payroll", requireTenantCompany);

// GET /construction/payroll/employees — flat list (frontend groups by department)
router.get(
  "/payroll/employees",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    if (!(await assertPayrollAccess(req, res))) return;
    const companyId = req.scopedCompanyId!;
    const rows = await db
      .select()
      .from(payrollEmployeesTable)
      .where(eq(payrollEmployeesTable.companyId, companyId))
      .orderBy(payrollEmployeesTable.department, payrollEmployeesTable.fullName);
    res.json(rows);
  },
);

// POST /construction/payroll/employees — manager/finance create
router.post(
  "/payroll/employees",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const access = await assertPayrollAccess(req, res);
    if (!access) return;
    if (!access.isManager && !access.isFinance) {
      res.status(403).json({ error: FORBIDDEN_MESSAGE });
      return;
    }
    const companyId = req.scopedCompanyId!;
    const body = req.body ?? {};
    const fullName = String(body.fullName ?? "").trim();
    if (!fullName) {
      res.status(400).json({ error: "Укажите ФИО сотрудника" });
      return;
    }
    const employmentType = VALID_EMPLOYMENT.has(String(body.employmentType))
      ? String(body.employmentType)
      : "staff";
    const baseSalary = toAmount(body.baseSalary);

    try {
      const [created] = await db
        .insert(payrollEmployeesTable)
        .values({
          companyId,
          userId:
            body.userId != null && body.userId !== ""
              ? Number(body.userId)
              : null,
          fullName,
          position: body.position ? String(body.position) : null,
          department: body.department ? String(body.department) : null,
          employmentType,
          hireDate: normalizeDate(body.hireDate),
          baseSalary,
          currentSalary: baseSalary,
          currency: body.currency ? String(body.currency) : "KGS",
          status: "active",
          notes: body.notes ? String(body.notes) : null,
          createdBy: req.userId ?? null,
        })
        .returning();
      res.status(201).json(created);
    } catch (e) {
      sendServerError(res, e, "Не удалось добавить сотрудника");
    }
  },
);

// PATCH /construction/payroll/employees/:id — non-salary fields only
router.patch(
  "/payroll/employees/:id",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const access = await assertPayrollAccess(req, res);
    if (!access) return;
    if (!access.isManager && !access.isFinance) {
      res.status(403).json({ error: FORBIDDEN_MESSAGE });
      return;
    }
    const companyId = req.scopedCompanyId!;
    const id = Number(req.params.id);
    const body = req.body ?? {};

    const [existing] = await db
      .select()
      .from(payrollEmployeesTable)
      .where(
        and(
          eq(payrollEmployeesTable.id, id),
          eq(payrollEmployeesTable.companyId, companyId),
        ),
      );
    if (!existing) {
      res.status(404).json({ error: "Сотрудник не найден" });
      return;
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.position !== undefined)
      patch.position = body.position ? String(body.position) : null;
    if (body.department !== undefined)
      patch.department = body.department ? String(body.department) : null;
    if (body.employmentType !== undefined && VALID_EMPLOYMENT.has(String(body.employmentType)))
      patch.employmentType = String(body.employmentType);
    if (body.status !== undefined && ["active", "dismissed"].includes(String(body.status)))
      patch.status = String(body.status);
    if (body.notes !== undefined)
      patch.notes = body.notes ? String(body.notes) : null;

    try {
      const [row] = await db
        .update(payrollEmployeesTable)
        .set(patch)
        .where(eq(payrollEmployeesTable.id, id))
        .returning();
      res.json(row);
    } catch (e) {
      sendServerError(res, e, "Не удалось обновить сотрудника");
    }
  },
);

// GET /construction/payroll/employees/:id/history — salary changes timeline
router.get(
  "/payroll/employees/:id/history",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    if (!(await assertPayrollAccess(req, res))) return;
    const companyId = req.scopedCompanyId!;
    const id = Number(req.params.id);

    const [employee] = await db
      .select()
      .from(payrollEmployeesTable)
      .where(
        and(
          eq(payrollEmployeesTable.id, id),
          eq(payrollEmployeesTable.companyId, companyId),
        ),
      );
    if (!employee) {
      res.status(404).json({ error: "Сотрудник не найден" });
      return;
    }

    const changes = await db
      .select()
      .from(payrollSalaryChangesTable)
      .where(
        and(
          eq(payrollSalaryChangesTable.companyId, companyId),
          eq(payrollSalaryChangesTable.payrollEmployeeId, id),
        ),
      )
      .orderBy(desc(payrollSalaryChangesTable.id));

    res.json({ employee, changes });
  },
);

// GET /construction/payroll/changes — all salary changes for the company (История)
router.get(
  "/payroll/changes",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    if (!(await assertPayrollAccess(req, res))) return;
    const companyId = req.scopedCompanyId!;

    const rows = await db
      .select({
        id: payrollSalaryChangesTable.id,
        payrollEmployeeId: payrollSalaryChangesTable.payrollEmployeeId,
        effectiveDate: payrollSalaryChangesTable.effectiveDate,
        previousAmount: payrollSalaryChangesTable.previousAmount,
        newAmount: payrollSalaryChangesTable.newAmount,
        delta: payrollSalaryChangesTable.delta,
        reason: payrollSalaryChangesTable.reason,
        createdAt: payrollSalaryChangesTable.createdAt,
        employeeName: payrollEmployeesTable.fullName,
        department: payrollEmployeesTable.department,
      })
      .from(payrollSalaryChangesTable)
      .leftJoin(
        payrollEmployeesTable,
        eq(payrollSalaryChangesTable.payrollEmployeeId, payrollEmployeesTable.id),
      )
      .where(eq(payrollSalaryChangesTable.companyId, companyId))
      .orderBy(desc(payrollSalaryChangesTable.id));

    res.json(rows);
  },
);

// GET /construction/payroll/requests — approval requests (optional ?status=)
router.get(
  "/payroll/requests",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    if (!(await assertPayrollAccess(req, res))) return;
    const companyId = req.scopedCompanyId!;
    const status = String(req.query.status ?? "").trim();

    const conditions = [eq(payrollApprovalRequestsTable.companyId, companyId)];
    if (status && status !== "all") {
      conditions.push(eq(payrollApprovalRequestsTable.status, status));
    }

    const rows = await db
      .select()
      .from(payrollApprovalRequestsTable)
      .where(and(...conditions))
      .orderBy(desc(payrollApprovalRequestsTable.id));

    res.json(rows);
  },
);

// POST /construction/payroll/requests — finance/manager creates salary-change request
router.post(
  "/payroll/requests",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const access = await assertPayrollAccess(req, res);
    if (!access) return;
    if (!access.isManager && !access.isFinance) {
      res.status(403).json({ error: FORBIDDEN_MESSAGE });
      return;
    }
    const companyId = req.scopedCompanyId!;
    const body = req.body ?? {};
    const payrollEmployeeId = Number(body.payrollEmployeeId);
    if (!Number.isFinite(payrollEmployeeId)) {
      res.status(400).json({ error: "Укажите сотрудника" });
      return;
    }
    const requestedAmount = toAmount(body.requestedAmount);
    if (parseFloat(requestedAmount) <= 0) {
      res.status(400).json({ error: "Укажите корректную сумму" });
      return;
    }

    const [employee] = await db
      .select()
      .from(payrollEmployeesTable)
      .where(
        and(
          eq(payrollEmployeesTable.id, payrollEmployeeId),
          eq(payrollEmployeesTable.companyId, companyId),
        ),
      );
    if (!employee) {
      res.status(404).json({ error: "Сотрудник не найден" });
      return;
    }

    try {
      const [created] = await db
        .insert(payrollApprovalRequestsTable)
        .values({
          companyId,
          payrollEmployeeId,
          requestType: "salary_change",
          requestedAmount,
          currentAmount: employee.currentSalary ?? "0",
          reason: body.reason ? String(body.reason) : null,
          status: "pending",
          requestedBy: req.userId ?? null,
          effectiveDate: normalizeDate(body.effectiveDate),
        })
        .returning();
      res.status(201).json(created);
    } catch (e) {
      sendServerError(res, e, "Не удалось создать запрос");
    }
  },
);

// POST /construction/payroll/requests/:id/approve — manager only
router.post(
  "/payroll/requests/:id/approve",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const access = await assertPayrollAccess(req, res);
    if (!access) return;
    if (!access.isManager) {
      res.status(403).json({ error: "Одобрять запросы может только руководитель" });
      return;
    }
    const companyId = req.scopedCompanyId!;
    const id = Number(req.params.id);
    const body = req.body ?? {};

    const [request] = await db
      .select()
      .from(payrollApprovalRequestsTable)
      .where(
        and(
          eq(payrollApprovalRequestsTable.id, id),
          eq(payrollApprovalRequestsTable.companyId, companyId),
        ),
      );
    if (!request) {
      res.status(404).json({ error: "Запрос не найден" });
      return;
    }
    if (request.status !== "pending") {
      res.status(400).json({ error: "Запрос уже обработан" });
      return;
    }

    const [employee] = await db
      .select()
      .from(payrollEmployeesTable)
      .where(
        and(
          eq(payrollEmployeesTable.id, request.payrollEmployeeId),
          eq(payrollEmployeesTable.companyId, companyId),
        ),
      );
    if (!employee) {
      res.status(404).json({ error: "Сотрудник не найден" });
      return;
    }

    const previousAmount = employee.currentSalary ?? "0";
    const newAmount = request.requestedAmount ?? "0";
    const delta = String(parseFloat(newAmount) - parseFloat(previousAmount));
    const effectiveDate = request.effectiveDate ?? normalizeDate(new Date().toISOString());

    try {
      const updated = await db.transaction(async (tx) => {
        const [reqRow] = await tx
          .update(payrollApprovalRequestsTable)
          .set({
            status: "approved",
            directorComment: body.directorComment ? String(body.directorComment) : null,
            reviewedBy: req.userId ?? null,
            reviewedAt: new Date(),
          })
          .where(eq(payrollApprovalRequestsTable.id, id))
          .returning();

        await tx
          .update(payrollEmployeesTable)
          .set({ currentSalary: newAmount, updatedAt: new Date() })
          .where(eq(payrollEmployeesTable.id, employee.id));

        await tx.insert(payrollSalaryChangesTable).values({
          companyId,
          payrollEmployeeId: employee.id,
          effectiveDate,
          previousAmount,
          newAmount,
          delta,
          reason: request.reason ?? null,
          createdBy: req.userId ?? null,
        });

        return reqRow;
      });

      res.json(updated);
    } catch (e) {
      sendServerError(res, e, "Не удалось одобрить запрос");
    }
  },
);

// POST /construction/payroll/requests/:id/reject — manager only
router.post(
  "/payroll/requests/:id/reject",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const access = await assertPayrollAccess(req, res);
    if (!access) return;
    if (!access.isManager) {
      res.status(403).json({ error: "Отклонять запросы может только руководитель" });
      return;
    }
    const companyId = req.scopedCompanyId!;
    const id = Number(req.params.id);
    const body = req.body ?? {};

    const [request] = await db
      .select()
      .from(payrollApprovalRequestsTable)
      .where(
        and(
          eq(payrollApprovalRequestsTable.id, id),
          eq(payrollApprovalRequestsTable.companyId, companyId),
        ),
      );
    if (!request) {
      res.status(404).json({ error: "Запрос не найден" });
      return;
    }
    if (request.status !== "pending") {
      res.status(400).json({ error: "Запрос уже обработан" });
      return;
    }

    try {
      const [updated] = await db
        .update(payrollApprovalRequestsTable)
        .set({
          status: "rejected",
          directorComment: body.directorComment ? String(body.directorComment) : null,
          reviewedBy: req.userId ?? null,
          reviewedAt: new Date(),
        })
        .where(eq(payrollApprovalRequestsTable.id, id))
        .returning();
      res.json(updated);
    } catch (e) {
      sendServerError(res, e, "Не удалось отклонить запрос");
    }
  },
);

// GET /construction/payroll/settings/access — manager only
router.get(
  "/payroll/settings/access",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const access = await assertPayrollAccess(req, res);
    if (!access) return;
    if (!access.isManager) {
      res.status(403).json({ error: "Доступ только для руководителя" });
      return;
    }
    const companyId = req.scopedCompanyId!;
    const allowedUserIds = await getAllowedUserIds(companyId);
    res.json({ allowedUserIds });
  },
);

// PUT /construction/payroll/settings/access — manager only
router.put(
  "/payroll/settings/access",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const access = await assertPayrollAccess(req, res);
    if (!access) return;
    if (!access.isManager) {
      res.status(403).json({ error: "Доступ только для руководителя" });
      return;
    }
    const companyId = req.scopedCompanyId!;
    const raw = Array.isArray(req.body?.allowedUserIds) ? req.body.allowedUserIds : [];
    const allowedUserIds = Array.from(
      new Set(
        raw
          .map((v: unknown) => Number(v))
          .filter((n: number) => Number.isFinite(n)),
      ),
    );
    const settings = JSON.stringify({ allowedUserIds });

    try {
      const [existing] = await db
        .select()
        .from(moduleSettingsTable)
        .where(
          and(
            eq(moduleSettingsTable.companyId, companyId),
            eq(moduleSettingsTable.moduleKey, PAYROLL_ACCESS_MODULE),
          ),
        );

      if (existing) {
        await db
          .update(moduleSettingsTable)
          .set({ settings })
          .where(eq(moduleSettingsTable.id, existing.id));
      } else {
        await db.insert(moduleSettingsTable).values({
          companyId,
          moduleKey: PAYROLL_ACCESS_MODULE,
          isEnabled: true,
          enabledAt: new Date(),
          settings,
        });
      }
      res.json({ allowedUserIds });
    } catch (e) {
      sendServerError(res, e, "Не удалось сохранить настройки доступа");
    }
  },
);

export default router;
