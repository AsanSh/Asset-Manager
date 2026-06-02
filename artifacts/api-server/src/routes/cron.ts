import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import { runSlaRemindersCron } from "../lib/task-sla-reminders";

const router: IRouter = Router();

function assertCronAuthorized(req: Request, res: Response): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    res.status(503).json({ error: "CRON_SECRET не настроен на сервере" });
    return false;
  }
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/** Vercel Cron: проверка SLA-напоминаний по всем задачам */
router.get("/cron/sla-reminders", async (req, res): Promise<void> => {
  if (!assertCronAuthorized(req, res)) return;

  try {
    const result = await runSlaRemindersCron();
    logger.info({ result }, "cron: sla-reminders completed");
    res.json({ ok: true, ...result, ranAt: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, "cron: sla-reminders failed");
    res.status(500).json({
      error: err instanceof Error ? err.message : "Cron failed",
    });
  }
});

export default router;
