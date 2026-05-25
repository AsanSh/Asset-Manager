import { Router } from "express";
import { eq, and, asc } from "drizzle-orm";
import {
  db,
  constructionSalesContractsTable,
  constructionUnitsTable,
  constructionProjectsTable,
  constructionAccrualsTable,
  counterpartiesTable,
} from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import {
  findCounterpartyForContract,
  mergeContractBuyer,
} from "../lib/contract-buyer";
import {
  generateContractDocx,
  parseContractDate,
  formatMoneyDisplay,
  formatMoneyWords,
  type ContractGeneratePayload,
} from "../lib/contract-docx";
import {
  generateAnnex1Docx,
  resolveAnnexSchedule,
  type Annex1GeneratePayload,
} from "../lib/contract-annex1-docx";

const router: ReturnType<typeof Router> = Router();

/** Данные для вкладки «Договор» по ID договора продажи */
router.get(
  "/construction/contracts-sales/:id/docx-data",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = Number(req.params.id);
    const companyId = req.companyId!;

    const [contract] = await db
      .select()
      .from(constructionSalesContractsTable)
      .where(
        and(
          eq(constructionSalesContractsTable.id, id),
          eq(constructionSalesContractsTable.companyId, companyId),
        ),
      );

    if (!contract) {
      res.status(404).json({ error: "Договор не найден" });
      return;
    }

    let unit = null;
    if (contract.unitId) {
      const [u] = await db
        .select()
        .from(constructionUnitsTable)
        .where(eq(constructionUnitsTable.id, contract.unitId));
      unit = u || null;
    }

    const [project] = await db
      .select()
      .from(constructionProjectsTable)
      .where(eq(constructionProjectsTable.id, contract.projectId));

    const counterparty = await findCounterpartyForContract(
      companyId,
      contract.buyerId,
      contract.buyerName,
    );

    if (!contract.buyerId && counterparty) {
      await db
        .update(constructionSalesContractsTable)
        .set({ buyerId: counterparty.id, updatedAt: new Date() })
        .where(
          and(
            eq(constructionSalesContractsTable.id, contract.id),
            eq(constructionSalesContractsTable.companyId, companyId),
          ),
        );
    }

    const buyer = mergeContractBuyer(counterparty, {
      buyerName: contract.buyerName,
      buyerPhone: contract.buyerPhone,
      buyerMeta:
        contract.buyerMeta ??
        (contract as { buyer_meta?: string | null }).buyer_meta ??
        null,
    });
    const total = parseFloat(contract.totalAmount?.toString() || "0");
    const down = parseFloat(contract.downPayment?.toString() || "0");
    const priceUsd =
      contract.currency === "USD"
        ? formatMoneyDisplay(total)
        : formatMoneyDisplay(total);
    const initial =
      contract.currency === "USD"
        ? formatMoneyDisplay(down)
        : formatMoneyDisplay(down);

    const payload: ContractGeneratePayload = {
      contractDate: parseContractDate(
        contract.contractDate || new Date().toISOString().slice(0, 10),
      ),
      buyer,
      office: {
        address: project?.address || "г. Бишкек",
        cadastralCode: "",
        area: unit?.area?.toString() || "",
        floor: unit?.floor?.toString() || "",
        block: unit?.block || "",
        number: unit?.unitNumber || "",
        priceUsd,
        priceUsdWords: formatMoneyWords(total),
        initialPayment: initial,
        initialPaymentWords: formatMoneyWords(down),
      },
    };

    const accruals = await db
      .select()
      .from(constructionAccrualsTable)
      .where(
        and(
          eq(constructionAccrualsTable.contractId, contract.id),
          eq(constructionAccrualsTable.companyId, companyId),
        ),
      )
      .orderBy(asc(constructionAccrualsTable.installmentNumber));

    const installmentMonths =
      contract.installmentMonths && contract.installmentMonths > 0
        ? contract.installmentMonths
        : accruals.filter((a) => a.installmentNumber > 0).length || 12;

    const schedule = resolveAnnexSchedule(
      accruals,
      total,
      down,
      installmentMonths,
      contract.contractDate || new Date().toISOString().slice(0, 10),
    );

    const annexPayload: Annex1GeneratePayload = {
      contractDate: payload.contractDate,
      buyer: payload.buyer,
      schedule,
    };

    res.json({
      contractId: contract.id,
      buyerId: contract.buyerId ?? counterparty?.id ?? null,
      buyerName: contract.buyerName,
      buyerPhone: contract.buyerPhone,
      contractNumber: contract.contractNumber,
      contractDate: contract.contractDate,
      totalAmount: total,
      downPayment: down,
      remainingAmount: Math.max(0, total - down),
      installmentMonths,
      payload,
      annexPayload,
      schedule,
    });
  },
);

/** Генерация .docx */
router.post(
  "/construction/contracts/generate-docx",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const body = req.body as ContractGeneratePayload & { projectId?: number };
      if (!body?.buyer?.fullName || !body?.office?.number) {
        res.status(400).json({ error: "Укажите покупателя и помещение" });
        return;
      }

      let templateBuffer: Buffer | undefined;
      if (body.projectId) {
        const [project] = await db
          .select({ contractTemplateMeta: constructionProjectsTable.contractTemplateMeta })
          .from(constructionProjectsTable)
          .where(and(
            eq(constructionProjectsTable.id, body.projectId),
            eq(constructionProjectsTable.companyId, req.companyId!),
          ));
        if (project?.contractTemplateMeta) {
          try {
            const meta = JSON.parse(project.contractTemplateMeta) as { dataBase64?: string };
            if (meta.dataBase64) {
              templateBuffer = Buffer.from(meta.dataBase64, "base64");
            }
          } catch {
            /* use default template */
          }
        }
      }

      const buffer = generateContractDocx(body, templateBuffer);
      const fileName = `Договор_${body.buyer.fullName.split(" ")[0]}_офис${body.office.number}.docx`.replace(
        /\s+/g,
        "_",
      );

      res.set({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      });
      res.send(buffer);
    } catch (err) {
      console.error("Contract docx error:", err);
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : "Не удалось сгенерировать договор. Проверьте шаблон.",
      });
    }
  },
);

/** Генерация Приложения №1 — график выплат на остаток */
router.post(
  "/construction/contracts/generate-annex1-docx",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const body = req.body as Annex1GeneratePayload;
      if (!body?.buyer?.fullName) {
        res.status(400).json({ error: "Укажите данные покупателя" });
        return;
      }
      if (!Array.isArray(body.schedule) || body.schedule.length === 0) {
        res.status(400).json({ error: "График выплат пуст" });
        return;
      }

      const buffer = generateAnnex1Docx(body);
      const fileName = `Приложение_1_${body.buyer.fullName.split(" ")[0] || "договор"}.docx`.replace(
        /\s+/g,
        "_",
      );

      res.set({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      });
      res.send(buffer);
    } catch (err) {
      console.error("Annex1 docx error:", err);
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : "Не удалось сгенерировать приложение 1",
      });
    }
  },
);

export default router;
