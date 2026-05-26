import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, constructionProjectsTable, constructionContractorsTable, constructionExpensesTable } from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";
import {
  chatWithDocument,
  checkSnip,
  generateTZ,
  analyzeEstimate,
  generateAct,
  generateProgressReport,
  analyzeTender,
  analyzeConstructionPhotos,
  analyzeContractors,
  sendTelegramMessage,
} from "../lib/ai";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

// ────────────────────────────────────────────────────────────────
// POST /ai/chat  — чат по тех.заданию (субподрядчики)
// ────────────────────────────────────────────────────────────────
router.post("/ai/chat", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { question, documentText, history = [] } = req.body;
    if (!question || !documentText) {
      res.status(400).json({ error: "question и documentText обязательны" });
      return;
    }
    const answer = await chatWithDocument(question, documentText, history);
    res.json({ answer });
  } catch (error) {
    console.error("AI chat error:", error);
    res.status(500).json({ error: "Ошибка AI-чата" });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /ai/snip-check  — проверка документа по СНиП/СП
// ────────────────────────────────────────────────────────────────
router.post("/ai/snip-check", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { documentText, norms = [] } = req.body;
    if (!documentText) {
      res.status(400).json({ error: "documentText обязателен" });
      return;
    }
    const raw = await checkSnip(documentText, norms);
    let result;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: raw, checks: [], recommendations: [] };
    } catch {
      result = { summary: raw, checks: [], recommendations: [] };
    }
    res.json(result);
  } catch (error) {
    console.error("SNiP check error:", error);
    res.status(500).json({ error: "Ошибка проверки СНиП" });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /ai/generate-tz  — генерация тех.задания
// ────────────────────────────────────────────────────────────────
router.post("/ai/generate-tz", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { brief, projectType = "жилое строительство" } = req.body;
    if (!brief) {
      res.status(400).json({ error: "brief обязателен" });
      return;
    }
    const tz = await generateTZ(brief, projectType);
    res.json({ text: tz });
  } catch (error) {
    console.error("Generate TZ error:", error);
    res.status(500).json({ error: "Ошибка генерации ТЗ" });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /ai/analyze-estimate  — анализ сметы
// ────────────────────────────────────────────────────────────────
router.post("/ai/analyze-estimate", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { estimateText } = req.body;
    if (!estimateText) {
      res.status(400).json({ error: "estimateText обязателен" });
      return;
    }
    const raw = await analyzeEstimate(estimateText);
    let result;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: raw, issues: [], recommendations: [] };
    } catch {
      result = { summary: raw, issues: [], recommendations: [] };
    }
    res.json(result);
  } catch (error) {
    console.error("Analyze estimate error:", error);
    res.status(500).json({ error: "Ошибка анализа сметы" });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /ai/generate-act  — генерация акта КС-2 / КС-3
// ────────────────────────────────────────────────────────────────
router.post("/ai/generate-act", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { actType, projectData, worksData } = req.body;
    if (!actType || !projectData || !worksData) {
      res.status(400).json({ error: "actType, projectData, worksData обязательны" });
      return;
    }
    if (!["КС-2", "КС-3"].includes(actType)) {
      res.status(400).json({ error: "actType должен быть КС-2 или КС-3" });
      return;
    }
    const text = await generateAct(actType, projectData, worksData);
    res.json({ text });
  } catch (error) {
    console.error("Generate act error:", error);
    res.status(500).json({ error: "Ошибка генерации акта" });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /ai/progress-report  — отчёт о ходе строительства
// ────────────────────────────────────────────────────────────────
router.post("/ai/progress-report", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { projectId, period } = req.body;
    if (!projectId || !period) {
      res.status(400).json({ error: "projectId и period обязательны" });
      return;
    }

    // Получаем данные проекта из БД
    const [project] = await db
      .select()
      .from(constructionProjectsTable)
      .where(
        req.scopedCompanyId!
          ? and(
              eq(constructionProjectsTable.id, projectId),
              eq(constructionProjectsTable.companyId, req.scopedCompanyId!)
            )
          : eq(constructionProjectsTable.id, projectId)
      );

    if (!project) {
      res.status(404).json({ error: "Проект не найден" });
      return;
    }

    const text = await generateProgressReport(project as unknown as Record<string, unknown>, period);
    res.json({ text });
  } catch (error) {
    console.error("Progress report error:", error);
    res.status(500).json({ error: "Ошибка генерации отчёта" });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /ai/analyze-tender  — анализ тендерной документации
// ────────────────────────────────────────────────────────────────
router.post("/ai/analyze-tender", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { tenderText } = req.body;
    if (!tenderText) {
      res.status(400).json({ error: "tenderText обязателен" });
      return;
    }
    const raw = await analyzeTender(tenderText);
    let result;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: raw };
    } catch {
      result = { summary: raw };
    }
    res.json(result);
  } catch (error) {
    console.error("Analyze tender error:", error);
    res.status(500).json({ error: "Ошибка анализа тендера" });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /ai/analyze-photos  — анализ фото с объекта (Claude Vision)
// ────────────────────────────────────────────────────────────────
router.post("/ai/analyze-photos", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { images, projectName, context } = req.body;
    if (!images?.length || !projectName) {
      res.status(400).json({ error: "images[] и projectName обязательны" });
      return;
    }
    if (images.length > 10) {
      res.status(400).json({ error: "Максимум 10 фото за раз" });
      return;
    }
    const report = await analyzeConstructionPhotos(images, projectName, context);
    res.json({ report });
  } catch (error) {
    console.error("Analyze photos error:", error);
    res.status(500).json({ error: "Ошибка анализа фото" });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /ai/contractor-analytics  — аналитика подрядчиков
// ────────────────────────────────────────────────────────────────
router.get("/ai/contractor-analytics", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const cid = req.scopedCompanyId!;
    if (!cid) { res.status(400).json({ error: "Нет привязки к организации" }); return; }

    const contractors = await db.select().from(constructionContractorsTable)
      .where(eq(constructionContractorsTable.companyId, cid));

    const expenses = await db.select().from(constructionExpensesTable)
      .where(and(
        eq(constructionExpensesTable.companyId, cid),
      ));

    if (!contractors.length) {
      res.json({ summary: "Подрядчики не найдены", contractors: [], topRisks: [], recommendations: [] });
      return;
    }

    const raw = await analyzeContractors(contractors, expenses);
    let result;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: raw, contractors: [], topRisks: [], recommendations: [] };
    } catch {
      result = { summary: raw, contractors: [], topRisks: [], recommendations: [] };
    }
    res.json(result);
  } catch (error) {
    console.error("Contractor analytics error:", error);
    res.status(500).json({ error: "Ошибка аналитики подрядчиков" });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /ai/telegram/send  — отправка уведомления в Telegram
// ────────────────────────────────────────────────────────────────
router.post("/ai/telegram/send", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { chatId, message } = req.body;
    if (!chatId || !message) {
      res.status(400).json({ error: "chatId и message обязательны" });
      return;
    }
    await sendTelegramMessage(chatId, message);
    res.json({ success: true });
  } catch (error) {
    console.error("Telegram send error:", error);
    res.status(500).json({ error: "Ошибка отправки в Telegram" });
  }
});

// POST /ai/telegram/webhook  — Telegram webhook (входящие сообщения)
router.post("/ai/telegram/webhook", async (req, res): Promise<void> => {
  try {
    const { message } = req.body;
    if (!message?.text || !message?.chat?.id) {
      res.sendStatus(200);
      return;
    }
    const chatId = String(message.chat.id);
    const text = message.text.trim();

    let reply = "Привет! Я бот строительного проекта. Команды:\n/status — статус объектов\n/help — помощь";
    if (text === "/status") {
      reply = "📊 Система работает. Данные по объектам доступны в приложении.";
    } else if (text === "/help") {
      reply = "Я уведомляю о событиях на строительных объектах:\n• Задержки этапов\n• Превышения бюджета\n• Новые задачи\n\nДля работы с данными используйте веб-приложение.";
    }

    await sendTelegramMessage(chatId, reply);
    res.sendStatus(200);
  } catch (error) {
    console.error("Telegram webhook error:", error);
    res.sendStatus(200);
  }
});

export default router;
