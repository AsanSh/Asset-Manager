import { Router } from "express";
import { db } from "../lib/db";
import {
  barterAssetsTable,
  barterMovementsTable,
  constructionProjectsTable,
  constructionSalesContractsTable,
  counterpartiesTable,
  constructionContractorsTable,
} from "../lib/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";
import { sendServerError } from "../lib/http-errors";
import {
  acceptBarterFromBuyer,
  buildBarterReport,
  cancelBarterMovement,
  computeAssetRemainder,
  disposeBarterToCounterparty,
} from "../lib/barter-ledger";

const router = Router();
router.use(requireAuth, requireTenantCompany);

router.get("/barter/assets", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const companyId = req.scopedCompanyId!;
    const projectId = req.query.projectId ? Number(req.query.projectId) : null;

    const rows = await db
      .select({
        asset: barterAssetsTable,
        projectName: constructionProjectsTable.name,
        contractNumber: constructionSalesContractsTable.contractNumber,
      })
      .from(barterAssetsTable)
      .leftJoin(
        constructionProjectsTable,
        eq(barterAssetsTable.projectId, constructionProjectsTable.id),
      )
      .leftJoin(
        constructionSalesContractsTable,
        eq(barterAssetsTable.contractId, constructionSalesContractsTable.id),
      )
      .where(
        projectId
          ? and(
              eq(barterAssetsTable.companyId, companyId),
              eq(barterAssetsTable.projectId, projectId),
            )
          : eq(barterAssetsTable.companyId, companyId),
      )
      .orderBy(desc(barterAssetsTable.createdAt));

    res.json(
      rows.map((r) => ({
        ...r.asset,
        projectName: r.projectName,
        contractNumber: r.contractNumber,
        remainder: computeAssetRemainder(
          r.asset.acceptedAmountKgs,
          r.asset.disposedAmountKgs,
        ),
      })),
    );
  } catch (err) {
    sendServerError(res, err);
  }
});

router.get("/barter/assets/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const companyId = req.scopedCompanyId!;
    const assetId = Number(req.params.id);

    const [assetRow] = await db
      .select()
      .from(barterAssetsTable)
      .where(
        and(
          eq(barterAssetsTable.id, assetId),
          eq(barterAssetsTable.companyId, companyId),
        ),
      );

    if (!assetRow) {
      res.status(404).json({ error: "Актив не найден" });
      return;
    }

    const movements = await db
      .select({
        movement: barterMovementsTable,
        counterpartyName: counterpartiesTable.fullName,
        contractorName: constructionContractorsTable.fullName,
      })
      .from(barterMovementsTable)
      .leftJoin(
        counterpartiesTable,
        eq(barterMovementsTable.counterpartyId, counterpartiesTable.id),
      )
      .leftJoin(
        constructionContractorsTable,
        eq(barterMovementsTable.contractorId, constructionContractorsTable.id),
      )
      .where(eq(barterMovementsTable.assetId, assetId))
      .orderBy(desc(barterMovementsTable.date), desc(barterMovementsTable.id));

    res.json({
      asset: {
        ...assetRow,
        remainder: computeAssetRemainder(
          assetRow.acceptedAmountKgs,
          assetRow.disposedAmountKgs,
        ),
      },
      movements: movements.map((m) => ({
        ...m.movement,
        counterpartyName: m.counterpartyName,
        contractorName: m.contractorName,
      })),
    });
  } catch (err) {
    sendServerError(res, err);
  }
});

router.post("/barter/accept", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const companyId = req.scopedCompanyId!;
    const body = req.body ?? {};
    const result = await acceptBarterFromBuyer({
      companyId,
      contractId: Number(body.contractId),
      accrualId: body.accrualId ? Number(body.accrualId) : null,
      amount: body.amount,
      date: body.date,
      assetType: body.assetType,
      title: String(body.title || "").trim(),
      identifier: body.identifier,
      counterpartyId: body.counterpartyId ? Number(body.counterpartyId) : null,
      projectId: body.projectId ? Number(body.projectId) : null,
      notes: body.notes,
      accountId: body.accountId ? Number(body.accountId) : null,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка приёма бартера";
    res.status(400).json({ error: message });
  }
});

router.post("/barter/dispose", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const companyId = req.scopedCompanyId!;
    const body = req.body ?? {};
    const result = await disposeBarterToCounterparty({
      companyId,
      assetId: Number(body.assetId),
      amount: body.amount,
      date: body.date,
      counterpartyId: body.counterpartyId ? Number(body.counterpartyId) : null,
      contractorId: body.contractorId ? Number(body.contractorId) : null,
      projectId: body.projectId ? Number(body.projectId) : null,
      purpose: body.purpose,
      notes: body.notes,
      category: body.category,
      accountId: body.accountId ? Number(body.accountId) : null,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка выдачи бартера";
    res.status(400).json({ error: message });
  }
});

router.post(
  "/barter/movements/:id/cancel",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const companyId = req.scopedCompanyId!;
      const result = await cancelBarterMovement(companyId, Number(req.params.id));
      res.json({ ok: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка отмены";
      res.status(400).json({ error: message });
    }
  },
);

router.get("/barter/report", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const companyId = req.scopedCompanyId!;
    const projectId = req.query.projectId ? Number(req.query.projectId) : null;
    const report = await buildBarterReport(companyId, projectId);
    res.json(report);
  } catch (err) {
    sendServerError(res, err);
  }
});

export default router;
