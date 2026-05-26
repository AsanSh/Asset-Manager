import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, importJobsTable, counterpartiesTable, propertiesTable, contractsTable } from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

function validateCounterparty(row: Record<string, unknown>, index: number) {
  const errors: Array<{ row: number; field: string | null; message: string }> = [];
  if (!row.fullName && !row.full_name) errors.push({ row: index, field: "fullName", message: "fullName is required" });
  if (!row.type) errors.push({ row: index, field: "type", message: "type is required" });
  return errors;
}

function validateProperty(row: Record<string, unknown>, index: number) {
  const errors: Array<{ row: number; field: string | null; message: string }> = [];
  if (!row.projectName && !row.project_name) errors.push({ row: index, field: "projectName", message: "projectName is required" });
  if (!row.unitNumber && !row.unit_number) errors.push({ row: index, field: "unitNumber", message: "unitNumber is required" });
  if (!row.type) errors.push({ row: index, field: "type", message: "type is required" });
  if (!row.status) errors.push({ row: index, field: "status", message: "status is required" });
  return errors;
}

function validateContract(row: Record<string, unknown>, index: number) {
  const errors: Array<{ row: number; field: string | null; message: string }> = [];
  if (!row.contractNumber && !row.contract_number) errors.push({ row: index, field: "contractNumber", message: "contractNumber is required" });
  if (!row.type) errors.push({ row: index, field: "type", message: "type is required" });
  if (!row.status) errors.push({ row: index, field: "status", message: "status is required" });
  return errors;
}

router.get("/import/jobs", async (req: AuthenticatedRequest, res): Promise<void> => {
  const conditions: SQL[] = [];
  conditions.push(eq(importJobsTable.companyId, req.scopedCompanyId!));
  const rows = await db.select().from(importJobsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(importJobsTable.createdAt);
  res.json(rows);
});

router.get("/import/jobs/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const conditions: SQL[] = [eq(importJobsTable.id, id)];
  conditions.push(eq(importJobsTable.companyId, req.scopedCompanyId!));
  const [row] = await db.select().from(importJobsTable).where(and(...conditions));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.post("/import/preview", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { type, data } = req.body;
  if (!type || !Array.isArray(data)) {
    res.status(400).json({ error: "type and data[] required" });
    return;
  }

  const allErrors: Array<{ row: number; field: string | null; message: string }> = [];
  data.forEach((row: Record<string, unknown>, idx: number) => {
    let rowErrors: Array<{ row: number; field: string | null; message: string }> = [];
    if (type === "counterparties") rowErrors = validateCounterparty(row, idx + 1);
    else if (type === "properties") rowErrors = validateProperty(row, idx + 1);
    else if (type === "contracts") rowErrors = validateContract(row, idx + 1);
    allErrors.push(...rowErrors);
  });

  const errorRows = new Set(allErrors.map(e => e.row)).size;
  res.json({
    totalRows: data.length,
    validRows: data.length - errorRows,
    errorRows,
    errors: allErrors,
    preview: data.slice(0, 10),
  });
});

router.post("/import/commit", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { type, data, onlyValid } = req.body;
  if (!type || !Array.isArray(data)) {
    res.status(400).json({ error: "type and data[] required" });
    return;
  }

  const companyId = req.scopedCompanyId!;
  let successRows = 0;
  let errorRows = 0;
  const jobErrors: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      if (type === "counterparties") {
        const errs = validateCounterparty(row, i + 1);
        if (errs.length > 0 && onlyValid) { errorRows++; continue; }
        await db.insert(counterpartiesTable).values({
          companyId,
          type: row.type || "individual",
          fullName: row.fullName || row.full_name || "",
          iin: row.iin || null,
          phone: row.phone || null,
          email: row.email || null,
          comment: row.comment || null,
          externalId: row.externalId || row.external_id || null,
        }).onConflictDoNothing();
        successRows++;
      } else if (type === "properties") {
        const errs = validateProperty(row, i + 1);
        if (errs.length > 0 && onlyValid) { errorRows++; continue; }
        await db.insert(propertiesTable).values({
          companyId,
          projectName: row.projectName || row.project_name || "",
          block: row.block || null,
          floor: row.floor ? Number(row.floor) : null,
          unitNumber: row.unitNumber || row.unit_number || "",
          type: row.type || "apartment",
          area: row.area ? String(row.area) : null,
          status: row.status || "available",
          comment: row.comment || null,
          externalId: row.externalId || row.external_id || null,
        });
        successRows++;
      } else if (type === "contracts") {
        const errs = validateContract(row, i + 1);
        if (errs.length > 0 && onlyValid) { errorRows++; continue; }
        await db.insert(contractsTable).values({
          companyId,
          contractNumber: row.contractNumber || row.contract_number || "",
          contractDate: row.contractDate || row.contract_date || null,
          type: row.type || "sale",
          amount: row.amount ? String(row.amount) : null,
          currency: row.currency || "KGS",
          startDate: row.startDate || row.start_date || null,
          endDate: row.endDate || row.end_date || null,
          deposit: row.deposit ? String(row.deposit) : null,
          status: row.status || "draft",
          comment: row.comment || null,
        });
        successRows++;
      }
    } catch {
      errorRows++;
      jobErrors.push(`Row ${i + 1}: failed to insert`);
    }
  }

  const status = errorRows === 0 ? "completed" : successRows === 0 ? "failed" : "partial";
  const [job] = await db.insert(importJobsTable).values({
    companyId,
    type,
    status,
    totalRows: data.length,
    successRows,
    errorRows,
    errors: jobErrors.length > 0 ? jobErrors.join("; ") : null,
  }).returning();

  res.json(job);
});

export default router;
