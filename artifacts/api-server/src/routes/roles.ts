import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, rolesTable } from "../lib/db";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";

const router: ReturnType<typeof Router> = Router();

// GET /api/roles - List all roles
router.get(
  "/roles",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const conditions: SQL[] = [];

      if (req.companyId) {
        conditions.push(eq(rolesTable.companyId, req.companyId));
      }

      const rows = await db
        .select()
        .from(rolesTable)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(rolesTable.createdAt);

      res.json(rows);
    } catch (error) {
      console.error("List roles error:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  }
);

// GET /api/roles/:id - Get role with permissions
router.get(
  "/roles/:id",
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

      const conditions: SQL[] = [eq(rolesTable.id, id)];

      if (req.companyId) {
        conditions.push(eq(rolesTable.companyId, req.companyId));
      }

      const [row] = await db
        .select()
        .from(rolesTable)
        .where(and(...conditions));

      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      res.json(row);
    } catch (error) {
      console.error("Get role error:", error);
      res.status(500).json({ error: "Failed to fetch role" });
    }
  }
);

// POST /api/roles - Create role (admin only)
router.post(
  "/roles",
  requireAuth,
  requireRole("admin", "company_admin"),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const {
        name,
        description,
        permissions,
        isSystem,
        isActive,
      } = req.body;

      if (!name) {
        res.status(400).json({
          error: "name is required",
        });
        return;
      }

      if (!Array.isArray(permissions)) {
        res.status(400).json({
          error: "permissions must be an array",
        });
        return;
      }

      const [row] = await db
        .insert(rolesTable)
        .values({
          companyId: req.companyId!,
          name,
          description,
          permissions: permissions || [],
          isSystem: isSystem ?? false,
          isActive: isActive ?? true,
        })
        .returning();

      res.status(201).json(row);
    } catch (error) {
      console.error("Create role error:", error);
      res.status(500).json({ error: "Failed to create role" });
    }
  }
);

// PATCH /api/roles/:id - Update role (admin only)
router.patch(
  "/roles/:id",
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
        description,
        permissions,
        isActive,
      } = req.body;

      // Prevent updating system roles
      const conditions: SQL[] = [
        eq(rolesTable.id, id),
        eq(rolesTable.isSystem, false),
      ];

      if (req.companyId) {
        conditions.push(eq(rolesTable.companyId, req.companyId));
      }

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (permissions !== undefined) {
        if (!Array.isArray(permissions)) {
          res.status(400).json({
            error: "permissions must be an array",
          });
          return;
        }
        updateData.permissions = permissions;
      }
      if (isActive !== undefined) updateData.isActive = isActive;

      const [row] = await db
        .update(rolesTable)
        .set(updateData)
        .where(and(...conditions))
        .returning();

      if (!row) {
        res.status(404).json({ error: "Not found or system role cannot be modified" });
        return;
      }

      res.json(row);
    } catch (error) {
      console.error("Update role error:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  }
);

// DELETE /api/roles/:id - Delete role (admin only)
router.delete(
  "/roles/:id",
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

      // Prevent deleting system roles
      const conditions: SQL[] = [
        eq(rolesTable.id, id),
        eq(rolesTable.isSystem, false),
      ];

      if (req.companyId) {
        conditions.push(eq(rolesTable.companyId, req.companyId));
      }

      const [existing] = await db
        .select()
        .from(rolesTable)
        .where(and(...conditions));

      if (!existing) {
        res.status(404).json({ error: "Not found or system role cannot be deleted" });
        return;
      }

      await db.delete(rolesTable).where(and(...conditions));

      res.sendStatus(204);
    } catch (error) {
      console.error("Delete role error:", error);
      res.status(500).json({ error: "Failed to delete role" });
    }
  }
);

export default router;
