import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, documentsTable } from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const router: ReturnType<typeof Router> = Router();

router.get("/documents", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { entityType, entityId } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];
  if (req.companyId) conditions.push(eq(documentsTable.companyId, req.companyId));
  if (entityType) conditions.push(eq(documentsTable.entityType, entityType));
  if (entityId) conditions.push(eq(documentsTable.entityId, parseInt(entityId, 10)));
  const rows = await db.select().from(documentsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(documentsTable.createdAt);
  res.json(rows);
});

router.post("/documents", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { entityType, entityId, name, fileUrl, fileSize, mimeType } = req.body;
  if (!entityType || !entityId || !name || !fileUrl) {
    res.status(400).json({ error: "entityType, entityId, name, fileUrl required" });
    return;
  }
  const [row] = await db.insert(documentsTable).values({
    companyId: req.companyId, entityType, entityId, name, fileUrl, fileSize, mimeType
  }).returning();
  res.status(201).json(row);
});

router.delete("/documents/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const conditions: SQL[] = [eq(documentsTable.id, id)];
  if (req.companyId) conditions.push(eq(documentsTable.companyId, req.companyId));
  await db.delete(documentsTable).where(and(...conditions));
  res.sendStatus(204);
});

export default router;
