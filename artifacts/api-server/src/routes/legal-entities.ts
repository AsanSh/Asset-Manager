import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, legalEntitiesTable } from "../lib/db";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";

const router: ReturnType<typeof Router> = Router();

// GET /api/legal-entities - List all legal entities for company
router.get(
  "/legal-entities",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const conditions: SQL[] = [];

      if (req.companyId) {
        conditions.push(eq(legalEntitiesTable.companyId, req.companyId));
      }

      const rows = await db
        .select()
        .from(legalEntitiesTable)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(legalEntitiesTable.createdAt);

      res.json(rows);
    } catch (error) {
      console.error("List legal entities error:", error);
      res.status(500).json({ error: "Failed to fetch legal entities" });
    }
  }
);

// POST /api/legal-entities - Create new legal entity
router.post(
  "/legal-entities",
  requireAuth,
  requireRole("admin", "company_admin"),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const {
        name,
        fullLegalName,
        inn,
        address,
        phone,
        email,
        directorName,
        accountant,
        isActive,
      } = req.body;

      if (!name || !fullLegalName || !inn) {
        res.status(400).json({
          error: "name, fullLegalName, and inn are required",
        });
        return;
      }

      const [row] = await db
        .insert(legalEntitiesTable)
        .values({
          companyId: req.companyId!,
          name,
          fullLegalName,
          inn,
          address,
          phone,
          email,
          directorName,
          accountant,
          isActive: isActive ?? true,
        })
        .returning();

      res.status(201).json(row);
    } catch (error) {
      console.error("Create legal entity error:", error);
      res.status(500).json({ error: "Failed to create legal entity" });
    }
  }
);

// PATCH /api/legal-entities/:id - Update legal entity
router.patch(
  "/legal-entities/:id",
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
        fullLegalName,
        inn,
        address,
        phone,
        email,
        directorName,
        accountant,
        isActive,
      } = req.body;

      const conditions: SQL[] = [eq(legalEntitiesTable.id, id)];

      if (req.companyId) {
        conditions.push(eq(legalEntitiesTable.companyId, req.companyId));
      }

      const [row] = await db
        .update(legalEntitiesTable)
        .set({
          name,
          fullLegalName,
          inn,
          address,
          phone,
          email,
          directorName,
          accountant,
          isActive,
        })
        .where(and(...conditions))
        .returning();

      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      res.json(row);
    } catch (error) {
      console.error("Update legal entity error:", error);
      res.status(500).json({ error: "Failed to update legal entity" });
    }
  }
);

// DELETE /api/legal-entities/:id - Delete legal entity (admin only)
router.delete(
  "/legal-entities/:id",
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

      const conditions: SQL[] = [eq(legalEntitiesTable.id, id)];

      if (req.companyId) {
        conditions.push(eq(legalEntitiesTable.companyId, req.companyId));
      }

      await db.delete(legalEntitiesTable).where(and(...conditions));

      res.sendStatus(204);
    } catch (error) {
      console.error("Delete legal entity error:", error);
      res.status(500).json({ error: "Failed to delete legal entity" });
    }
  }
);

export default router;
