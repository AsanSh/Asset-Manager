import { Router } from "express";
import { eq, and, desc, or } from "drizzle-orm";
import { db, notificationsTable } from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

// GET /api/notifications - Get user notifications
router.get("/notifications", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { limit = "50", unreadOnly } = req.query;

  let conditions = and(
    eq(notificationsTable.companyId, req.scopedCompanyId!),
    or(
      eq(notificationsTable.userId, req.userId!),
      eq(notificationsTable.userId, null as any) // Company-wide notifications
    )
  );

  if (unreadOnly === "true") {
    conditions = and(conditions, eq(notificationsTable.isRead, false));
  }

  const notifications = await db.select()
    .from(notificationsTable)
    .where(conditions)
    .orderBy(desc(notificationsTable.createdAt))
    .limit(parseInt(limit as string));

  res.json(notifications);
});

// GET /api/notifications/unread-count
router.get("/notifications/unread-count", async (req: AuthenticatedRequest, res): Promise<void> => {
  const result = await db.select({ count: notificationsTable.id })
    .from(notificationsTable)
    .where(and(
      eq(notificationsTable.companyId, req.scopedCompanyId!),
      or(
        eq(notificationsTable.userId, req.userId!),
        eq(notificationsTable.userId, null as any)
      ),
      eq(notificationsTable.isRead, false)
    ));

  const count = result.length;
  res.json({ count });
});

// PATCH /api/notifications/:id/read
router.patch("/notifications/:id/read", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);

  const [notification] = await db.update(notificationsTable)
    .set({
      isRead: true,
      read: true
    })
    .where(and(
      eq(notificationsTable.id, id),
      eq(notificationsTable.companyId, req.scopedCompanyId!)
    ))
    .returning();

  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json(notification);
});

// PATCH /api/notifications/mark-all-read
router.patch("/notifications/mark-all-read", async (req: AuthenticatedRequest, res): Promise<void> => {
  await db.update(notificationsTable)
    .set({
      isRead: true,
      read: true
    })
    .where(and(
      eq(notificationsTable.companyId, req.scopedCompanyId!),
      or(
        eq(notificationsTable.userId, req.userId!),
        eq(notificationsTable.userId, null as any)
      ),
      eq(notificationsTable.isRead, false)
    ));

  res.json({ ok: true });
});

// DELETE /api/notifications/:id
router.delete("/notifications/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);

  await db.delete(notificationsTable)
    .where(and(
      eq(notificationsTable.id, id),
      eq(notificationsTable.companyId, req.scopedCompanyId!)
    ));

  res.json({ ok: true });
});

// POST /api/notifications (internal use for creating notifications)
router.post("/notifications", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { userId, type, title, body, message, icon, color, link, metadata } = req.body;

  const [notification] = await db.insert(notificationsTable).values({
    companyId: req.scopedCompanyId!,
    userId: userId || null,
    type,
    title,
    body: body || message,
    message: message || body,
    icon: icon || "info",
    color: color || "blue",
    link: link || null,
    metadata: metadata ? JSON.stringify(metadata) : null,
    isRead: false,
    read: false,
  }).returning();

  res.status(201).json(notification);
});

export default router;
