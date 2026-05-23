import { Router } from "express";
import { eq, ilike, and, SQL } from "drizzle-orm";
import { db, propertiesTable } from "../lib/db";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";
import { sanitizeLikePattern } from "../lib/security";

const router: ReturnType<typeof Router> = Router();

router.get(
  "/properties",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const { status, project, type, search } = req.query as Record<
        string,
        string | undefined
      >;
      const conditions: SQL[] = [];

      if (req.companyId) {
        conditions.push(eq(propertiesTable.companyId, req.companyId));
      }

      if (status) {
        conditions.push(eq(propertiesTable.status, status));
      }

      if (project) {
        const sanitized = sanitizeLikePattern(project);
        conditions.push(ilike(propertiesTable.projectName, `%${sanitized}%`));
      }

      if (type) {
        conditions.push(eq(propertiesTable.type, type));
      }

      if (search) {
        const sanitized = sanitizeLikePattern(search);
        conditions.push(ilike(propertiesTable.unitNumber, `%${sanitized}%`));
      }

      const rows = await db
        .select()
        .from(propertiesTable)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(propertiesTable.createdAt);

      res.json(rows);
    } catch (error) {
      console.error("List properties error:", error);
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  }
);

router.post(
  "/properties",
  requireAuth,
  requireRole("admin", "company_admin"),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const {
        projectName,
        block,
        floor,
        unitNumber,
        type,
        area,
        status,
        comment,
        externalId,
      } = req.body;

      if (!projectName || !unitNumber || !type || !status) {
        res.status(400).json({
          error: "projectName, unitNumber, type, status required",
        });
        return;
      }

      const [row] = await db
        .insert(propertiesTable)
        .values({
          companyId: req.companyId,
          projectName,
          block,
          floor,
          unitNumber,
          type,
          area,
          status,
          comment,
          externalId,
        })
        .returning();

      res.status(201).json(row);
    } catch (error) {
      console.error("Create property error:", error);
      res.status(500).json({ error: "Failed to create property" });
    }
  }
);

router.get(
  "/properties/:id",
  requireAuth,
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

      const conditions: SQL[] = [eq(propertiesTable.id, id)];

      if (req.companyId) {
        conditions.push(eq(propertiesTable.companyId, req.companyId));
      }

      const [row] = await db
        .select()
        .from(propertiesTable)
        .where(and(...conditions));

      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      res.json(row);
    } catch (error) {
      console.error("Get property error:", error);
      res.status(500).json({ error: "Failed to fetch property" });
    }
  }
);

router.patch(
  "/properties/:id",
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
        projectName,
        block,
        floor,
        unitNumber,
        type,
        area,
        status,
        comment,
      } = req.body;
      const conditions: SQL[] = [eq(propertiesTable.id, id)];

      if (req.companyId) {
        conditions.push(eq(propertiesTable.companyId, req.companyId));
      }

      const [row] = await db
        .update(propertiesTable)
        .set({
          projectName,
          block,
          floor,
          unitNumber,
          type,
          area,
          status,
          comment,
        })
        .where(and(...conditions))
        .returning();

      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      res.json(row);
    } catch (error) {
      console.error("Update property error:", error);
      res.status(500).json({ error: "Failed to update property" });
    }
  }
);

router.delete(
  "/properties/:id",
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

      const conditions: SQL[] = [eq(propertiesTable.id, id)];

      if (req.companyId) {
        conditions.push(eq(propertiesTable.companyId, req.companyId));
      }

      await db.delete(propertiesTable).where(and(...conditions));

      res.sendStatus(204);
    } catch (error) {
      console.error("Delete property error:", error);
      res.status(500).json({ error: "Failed to delete property" });
    }
  }
);

export default router;
