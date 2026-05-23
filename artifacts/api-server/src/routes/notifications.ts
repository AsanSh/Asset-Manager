import { Router } from "express";
import { eq, and, desc, or } from "drizzle-orm";
import { db, notificationsTable, messagesTable, usersTable } from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const router: ReturnType<typeof Router> = Router();

// ── NOTIFICATIONS ──────────────────────────────────────────────────────────

router.get("/notifications", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, req.userId!),
        eq(notificationsTable.companyId, req.companyId!)
      )
    )
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(rows);
});

router.get("/notifications/unread-count", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, req.userId!),
        eq(notificationsTable.companyId, req.companyId!),
        eq(notificationsTable.isRead, false)
      )
    );
  res.json({ count: rows.length });
});

router.post("/notifications", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { userId, type, title, body, link, fromUserId } = req.body;
  if (!userId || !title) { res.status(400).json({ error: "userId and title required" }); return; }
  const [row] = await db.insert(notificationsTable).values({
    companyId: req.companyId!,
    userId,
    fromUserId: fromUserId || null,
    type: type || "info",
    title,
    body: body || null,
    link: link || null,
  }).returning();
  res.status(201).json(row);
});

router.patch("/notifications/:id/read", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [row] = await db.update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.userId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.post("/notifications/read-all", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(
      and(
        eq(notificationsTable.userId, req.userId!),
        eq(notificationsTable.companyId, req.companyId!)
      )
    );
  res.json({ ok: true });
});

router.delete("/notifications/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(notificationsTable)
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.userId!)));
  res.json({ ok: true });
});

// ── MESSAGES / CHAT ────────────────────────────────────────────────────────

router.get("/messages/conversations", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const myId = req.userId!;
  const companyId = req.companyId!;

  const sent = await db.select().from(messagesTable)
    .where(and(eq(messagesTable.fromUserId, myId), eq(messagesTable.companyId, companyId)));
  const received = await db.select().from(messagesTable)
    .where(and(eq(messagesTable.toUserId, myId), eq(messagesTable.companyId, companyId)));

  const all = [...sent, ...received];

  // Build conversation map (partner userId → last message)
  const convMap: Record<number, any> = {};
  all.forEach(m => {
    const partnerId = m.fromUserId === myId ? (m.toUserId ?? 0) : m.fromUserId;
    if (!convMap[partnerId] || new Date(m.createdAt) > new Date(convMap[partnerId].createdAt)) {
      convMap[partnerId] = m;
    }
  });

  const partners = Object.keys(convMap).map(Number).filter(id => id > 0);
  if (partners.length === 0) { res.json([]); return; }

  const partnerUsers = await db.select({
    id: usersTable.id,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    email: usersTable.email,
  }).from(usersTable).where(eq(usersTable.companyId, companyId));

  const userMap: Record<number, any> = {};
  partnerUsers.forEach(u => { userMap[u.id] = u; });

  const conversations = partners.map(partnerId => {
    const lastMsg = convMap[partnerId];
    const unreadCount = received.filter(m => m.fromUserId === partnerId && !m.isRead).length;
    return {
      partnerId,
      partner: userMap[partnerId] || { id: partnerId, firstName: "Пользователь", lastName: "", email: "" },
      lastMessage: lastMsg,
      unreadCount,
    };
  }).sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());

  res.json(conversations);
});

router.get("/messages/:partnerId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const myId = req.userId!;
  const companyId = req.companyId!;
  const partnerId = parseInt(req.params.partnerId as string, 10);

  const msgs = await db.select().from(messagesTable)
    .where(
      and(
        eq(messagesTable.companyId, companyId),
        or(
          and(eq(messagesTable.fromUserId, myId), eq(messagesTable.toUserId, partnerId)),
          and(eq(messagesTable.fromUserId, partnerId), eq(messagesTable.toUserId, myId))
        )
      )
    )
    .orderBy(messagesTable.createdAt);

  // Mark received as read
  await db.update(messagesTable)
    .set({ isRead: true })
    .where(
      and(
        eq(messagesTable.fromUserId, partnerId),
        eq(messagesTable.toUserId, myId),
        eq(messagesTable.companyId, companyId)
      )
    );

  res.json(msgs);
});

router.post("/messages", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { toUserId, content } = req.body;
  if (!toUserId || !content?.trim()) { res.status(400).json({ error: "toUserId and content required" }); return; }
  const [row] = await db.insert(messagesTable).values({
    companyId: req.companyId!,
    fromUserId: req.userId!,
    toUserId,
    content: content.trim(),
  }).returning();
  res.status(201).json(row);
});

router.get("/messages/unread-count", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db.select().from(messagesTable)
    .where(
      and(
        eq(messagesTable.toUserId, req.userId!),
        eq(messagesTable.companyId, req.companyId!),
        eq(messagesTable.isRead, false)
      )
    );
  res.json({ count: rows.length });
});

export default router;
