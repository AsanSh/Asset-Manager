import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  clientSegmentsTable,
  clientPortalPublicationsTable,
  clientPortalAppealsTable,
  counterpartiesTable,
} from "../lib/db";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";

const router: ReturnType<typeof Router> = Router();
router.use(requireAuth, requireTenantCompany);

const STAFF_ROLES = ["admin", "company_admin", "owner", "finance"] as const;

// ── Сегменты ───────────────────────────────────────────────────────────────────

router.get("/client-relations/segments", async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db
    .select()
    .from(clientSegmentsTable)
    .where(eq(clientSegmentsTable.companyId, req.scopedCompanyId!))
    .orderBy(clientSegmentsTable.name);
  res.json(rows);
});

router.post(
  "/client-relations/segments",
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const body = req.body ?? {};
    if (!body.name) {
      res.status(400).json({ error: "Название сегмента обязательно" });
      return;
    }
    const [row] = await db
      .insert(clientSegmentsTable)
      .values({
        companyId: req.scopedCompanyId!,
        name: String(body.name),
        description: body.description ? String(body.description) : null,
        criteria: body.criteria ?? null,
      })
      .returning();
    res.status(201).json(row);
  },
);

router.patch(
  "/client-relations/segments/:id",
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = Number(req.params.id);
    const body = req.body ?? {};
    const [row] = await db
      .update(clientSegmentsTable)
      .set({
        name: body.name !== undefined ? String(body.name) : undefined,
        description: body.description !== undefined ? String(body.description || "") : undefined,
        criteria: body.criteria !== undefined ? body.criteria : undefined,
      })
      .where(
        and(
          eq(clientSegmentsTable.id, id),
          eq(clientSegmentsTable.companyId, req.scopedCompanyId!),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Сегмент не найден" });
      return;
    }
    res.json(row);
  },
);

router.delete(
  "/client-relations/segments/:id",
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = Number(req.params.id);
    await db
      .delete(clientSegmentsTable)
      .where(
        and(
          eq(clientSegmentsTable.id, id),
          eq(clientSegmentsTable.companyId, req.scopedCompanyId!),
        ),
      );
    res.json({ success: true });
  },
);

// ── Публикации в портал ──────────────────────────────────────────────────────

router.get("/client-relations/publications", async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db
    .select()
    .from(clientPortalPublicationsTable)
    .where(eq(clientPortalPublicationsTable.companyId, req.scopedCompanyId!))
    .orderBy(desc(clientPortalPublicationsTable.publishedAt));
  res.json(rows);
});

router.post(
  "/client-relations/publications",
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const body = req.body ?? {};
    if (!body.title || !body.body) {
      res.status(400).json({ error: "Заголовок и текст обязательны" });
      return;
    }
    const [row] = await db
      .insert(clientPortalPublicationsTable)
      .values({
        companyId: req.scopedCompanyId!,
        title: String(body.title),
        body: String(body.body),
        audience: String(body.audience || "all"),
        segmentId: body.segmentId ? Number(body.segmentId) : null,
        projectId: body.projectId ? Number(body.projectId) : null,
        isActive: body.isActive !== false,
        createdBy: req.userId ?? null,
      })
      .returning();
    res.status(201).json(row);
  },
);

router.patch(
  "/client-relations/publications/:id",
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = Number(req.params.id);
    const body = req.body ?? {};
    const [row] = await db
      .update(clientPortalPublicationsTable)
      .set({
        title: body.title !== undefined ? String(body.title) : undefined,
        body: body.body !== undefined ? String(body.body) : undefined,
        audience: body.audience !== undefined ? String(body.audience) : undefined,
        isActive: body.isActive !== undefined ? !!body.isActive : undefined,
      })
      .where(
        and(
          eq(clientPortalPublicationsTable.id, id),
          eq(clientPortalPublicationsTable.companyId, req.scopedCompanyId!),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Публикация не найдена" });
      return;
    }
    res.json(row);
  },
);

// ── Обращения покупателей (CRM Client Relations) ─────────────────────────────

router.get("/client-relations/appeals", requireRole(...STAFF_ROLES), async (req: AuthenticatedRequest, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const filters = [eq(clientPortalAppealsTable.companyId, req.scopedCompanyId!)];
  if (status) filters.push(eq(clientPortalAppealsTable.status, status));

  const rows = await db
    .select({
      appeal: clientPortalAppealsTable,
      buyerName: counterpartiesTable.fullName,
    })
    .from(clientPortalAppealsTable)
    .leftJoin(counterpartiesTable, eq(clientPortalAppealsTable.buyerId, counterpartiesTable.id))
    .where(and(...filters))
    .orderBy(desc(clientPortalAppealsTable.createdAt));

  res.json(
    rows.map((r) => ({
      ...r.appeal,
      buyerName: r.buyerName,
    })),
  );
});

router.patch(
  "/client-relations/appeals/:id",
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = Number(req.params.id);
    const body = req.body ?? {};
    const [row] = await db
      .update(clientPortalAppealsTable)
      .set({
        status: body.status !== undefined ? String(body.status) : undefined,
        response: body.response !== undefined ? String(body.response) : undefined,
        respondedAt: body.response ? new Date() : undefined,
      })
      .where(
        and(
          eq(clientPortalAppealsTable.id, id),
          eq(clientPortalAppealsTable.companyId, req.scopedCompanyId!),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Обращение не найдено" });
      return;
    }
    res.json(row);
  },
);

export default router;
