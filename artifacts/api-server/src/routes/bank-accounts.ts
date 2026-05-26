import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, bankAccountsTable } from "../lib/db";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

// GET /api/bank-accounts - List all bank accounts
router.get("/bank-accounts",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const conditions: SQL[] = [];
      conditions.push(eq(bankAccountsTable.companyId, req.scopedCompanyId!));

      const rows = await db
        .select()
        .from(bankAccountsTable)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(bankAccountsTable.createdAt);

      res.json(rows);
    } catch (error) {
      console.error("List bank accounts error:", error);
      res.status(500).json({ error: "Failed to fetch bank accounts" });
    }
  }
);

// POST /api/bank-accounts - Create new bank account
router.post(
  "/bank-accounts",
  requireAuth,
  requireRole("admin", "company_admin"),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const {
        name,
        type,
        bank,
        bik,
        accountNumber,
        currency,
        openingBalance,
        currentBalance,
        isActive,
        notes,
      } = req.body;

      if (!name || !type || !currency) {
        res.status(400).json({
          error: "name, type, and currency are required",
        });
        return;
      }

      const [row] = await db
        .insert(bankAccountsTable)
        .values({
          companyId: req.scopedCompanyId!,
          name,
          type,
          bank,
          bik,
          accountNumber,
          currency,
          openingBalance: openingBalance ?? "0",
          currentBalance: currentBalance ?? openingBalance ?? "0",
          isActive: isActive ?? true,
          notes,
        })
        .returning();

      res.status(201).json(row);
    } catch (error) {
      console.error("Create bank account error:", error);
      res.status(500).json({ error: "Failed to create bank account" });
    }
  }
);

// PATCH /api/bank-accounts/:id - Update bank account
router.patch(
  "/bank-accounts/:id",
  requireAuth,
  requireRole("admin", "company_admin"),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const id = parseInt(
        Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
        10
      );

      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid ID" });
        return;
      }

      const {
        name,
        type,
        bank,
        bik,
        accountNumber,
        currency,
        openingBalance,
        currentBalance,
        isActive,
        notes,
      } = req.body;

      const conditions: SQL[] = [eq(bankAccountsTable.id, id)];
      conditions.push(eq(bankAccountsTable.companyId, req.scopedCompanyId!));

      const [row] = await db
        .update(bankAccountsTable)
        .set({
          name,
          type,
          bank,
          bik,
          accountNumber,
          currency,
          openingBalance,
          currentBalance,
          isActive,
          notes,
        })
        .where(and(...conditions))
        .returning();

      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      res.json(row);
    } catch (error) {
      console.error("Update bank account error:", error);
      res.status(500).json({ error: "Failed to update bank account" });
    }
  }
);

// DELETE /api/bank-accounts/:id - Delete bank account (admin only)
router.delete(
  "/bank-accounts/:id",
  requireAuth,
  requireRole("admin", "company_admin"),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const id = parseInt(
        Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
        10
      );

      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid ID" });
        return;
      }

      const conditions: SQL[] = [eq(bankAccountsTable.id, id)];
      conditions.push(eq(bankAccountsTable.companyId, req.scopedCompanyId!));

      await db.delete(bankAccountsTable).where(and(...conditions));

      res.sendStatus(204);
    } catch (error) {
      console.error("Delete bank account error:", error);
      res.status(500).json({ error: "Failed to delete bank account" });
    }
  }
);

export default router;
