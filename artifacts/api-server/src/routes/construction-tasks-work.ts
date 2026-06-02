import { Router } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  db,
  constructionStagesTable,
  constructionTasksTable,
  constructionTaskDependenciesTable,
  constructionTaskSubtasksTable,
  constructionTaskChecklistItemsTable,
  constructionTaskActivityTable,
  constructionTaskAttachmentsTable,
  constructionTaskPhotosTable,
  notificationsTable,
  taskCommentsTable,
} from "../lib/db";
import {
  logTaskActivity,
  recalculateTaskProgress,
  taskFieldChanges,
} from "../lib/construction-task-work";
import { uploadFile } from "../lib/file-storage";
import { chat } from "../lib/ai";
import {
  dispatchSlaReminders,
  getLatestSlaSchedule,
  type ScheduledSlaStep,
} from "../lib/task-sla-reminders";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";

const router = Router();
router.use(requireAuth, requireTenantCompany);

type TaskRiskActionPlanStep = {
  title: string;
  ownerRole: string;
  slaHours: number;
  reason: string;
};

type RiskLevel = "low" | "medium" | "high";

type NextBestAction = TaskRiskActionPlanStep & {
  stepIndex: number;
  dueAt: string;
  urgency: "critical" | "high" | "normal";
};

type RiskActionPlanResult = {
  source: "ai" | "fallback";
  summary: string;
  riskLevel: RiskLevel;
  steps: TaskRiskActionPlanStep[];
  signals: {
    hasOverdue: boolean;
    overdueDays: number;
    blockedByCount: number;
    progressPercent: number;
    checklistDone: number;
    checklistTotal: number;
    hasAssignee: boolean;
  };
  nextBestAction: NextBestAction | null;
};

function pickNextBestAction(
  steps: TaskRiskActionPlanStep[],
  riskLevel: RiskLevel,
): NextBestAction | null {
  if (steps.length === 0) return null;
  const ranked = steps
    .map((step, stepIndex) => ({ ...step, stepIndex }))
    .sort((a, b) => a.slaHours - b.slaHours);
  const pick = ranked[0];
  const dueAt = new Date(Date.now() + pick.slaHours * 60 * 60 * 1000).toISOString();
  const urgency: NextBestAction["urgency"] =
    riskLevel === "high" && pick.slaHours <= 6
      ? "critical"
      : riskLevel !== "low" && pick.slaHours <= 12
        ? "high"
        : "normal";
  return { ...pick, dueAt, urgency };
}

function normalizePlanSteps(raw: unknown): TaskRiskActionPlanStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => ({
      title: String((s as TaskRiskActionPlanStep)?.title ?? "").trim(),
      ownerRole: String((s as TaskRiskActionPlanStep)?.ownerRole ?? "").trim(),
      slaHours: Math.max(1, Math.min(168, Number((s as TaskRiskActionPlanStep)?.slaHours ?? 24) || 24)),
      reason: String((s as TaskRiskActionPlanStep)?.reason ?? "").trim(),
    }))
    .filter((s) => s.title && s.ownerRole && s.reason)
    .slice(0, 6);
}

async function generateRiskActionPlanForTask(
  companyId: number,
  taskId: number,
): Promise<RiskActionPlanResult | null> {
  const task = await loadTask(companyId, taskId);
  if (!task) return null;

  const [checklist, dependencies] = await Promise.all([
    db
      .select()
      .from(constructionTaskChecklistItemsTable)
      .where(
        and(
          eq(constructionTaskChecklistItemsTable.taskId, taskId),
          eq(constructionTaskChecklistItemsTable.companyId, companyId),
        ),
      ),
    db
      .select()
      .from(constructionTaskDependenciesTable)
      .where(
        and(
          eq(constructionTaskDependenciesTable.successorTaskId, taskId),
          eq(constructionTaskDependenciesTable.companyId, companyId),
        ),
      ),
  ]);

  const now = Date.now();
  const dueDateRaw = task.plannedEndDate ?? task.dueDate ?? null;
  const dueAt = dueDateRaw ? new Date(String(dueDateRaw)).getTime() : null;
  const overdueDays =
    task.status !== "done" && dueAt && Number.isFinite(dueAt)
      ? Math.max(0, Math.floor((now - dueAt) / (24 * 60 * 60 * 1000)))
      : 0;
  const checklistDone = checklist.filter((x) => x.isDone).length;
  const checklistTotal = checklist.length;

  const riskInput = {
    hasOverdue: overdueDays > 0,
    overdueDays,
    blockedByCount: dependencies.length,
    progressPercent: Number(task.progressPercent ?? 0),
    checklistDone,
    checklistTotal,
    hasAssignee: Boolean(task.assignedTo),
  };

  const fallback = buildFallbackRiskPlan(riskInput);
  const payload = {
    task: {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      progressPercent: riskInput.progressPercent,
      dueDate: dueDateRaw,
      assignedTo: task.assignedTo,
    },
    riskSignals: {
      overdueDays,
      blockedByCount: riskInput.blockedByCount,
      checklistDone,
      checklistTotal,
    },
  };

  const resolveRiskLevel = (steps: TaskRiskActionPlanStep[], hinted?: string): RiskLevel => {
    if (hinted && ["low", "medium", "high"].includes(hinted)) return hinted as RiskLevel;
    if (overdueDays > 0 || dependencies.length > 0) return "high";
    if (Number(task.progressPercent ?? 0) < 50) return "medium";
    return "low";
  };

  try {
    const aiText = await chat(
      [
        {
          role: "user",
          content: `Сформируй JSON action plan для рисковой строительной задачи.\nДанные:\n${JSON.stringify(payload, null, 2)}\n\nВерни строго JSON: {"summary":string,"riskLevel":"low"|"medium"|"high","steps":[{"title":string,"ownerRole":string,"slaHours":number,"reason":string}]}\nМаксимум 6 шагов, только практичные действия.`,
        },
      ],
      "Ты — руководитель строительного проекта. Предлагай конкретные антикризисные шаги с ответственными и SLA. Никакого markdown, только валидный JSON.",
      1200,
    );

    const parsed = JSON.parse(aiText) as {
      summary?: string;
      riskLevel?: RiskLevel;
      steps?: TaskRiskActionPlanStep[];
    };
    const safeSteps = normalizePlanSteps(parsed.steps);
    const steps = safeSteps.length > 0 ? safeSteps : fallback;
    const riskLevel = resolveRiskLevel(steps, parsed.riskLevel);
    return {
      source: safeSteps.length > 0 ? "ai" : "fallback",
      summary:
        String(parsed.summary ?? "").trim() ||
        "Сгенерирован план стабилизации по текущим KPI задачи.",
      riskLevel,
      steps,
      signals: riskInput,
      nextBestAction: pickNextBestAction(steps, riskLevel),
    };
  } catch {
    const riskLevel = resolveRiskLevel(fallback);
    return {
      source: "fallback",
      summary: "AI временно недоступен, показан базовый антикризисный план.",
      riskLevel,
      steps: fallback,
      signals: riskInput,
      nextBestAction: pickNextBestAction(fallback, riskLevel),
    };
  }
}

function buildFallbackRiskPlan(input: {
  hasOverdue: boolean;
  overdueDays: number;
  blockedByCount: number;
  progressPercent: number;
  checklistDone: number;
  checklistTotal: number;
  hasAssignee: boolean;
}): TaskRiskActionPlanStep[] {
  const steps: TaskRiskActionPlanStep[] = [];
  if (!input.hasAssignee) {
    steps.push({
      title: "Назначить ответственного по задаче и зафиксировать зону ответственности",
      ownerRole: "Руководитель проекта",
      slaHours: 2,
      reason: "Без исполнителя задача не имеет владельца и теряет контроль сроков.",
    });
  }
  if (input.blockedByCount > 0) {
    steps.push({
      title: "Закрыть блокирующие зависимости и согласовать новый критический путь",
      ownerRole: "Планировщик / PM",
      slaHours: 8,
      reason: `Обнаружено блокеров: ${input.blockedByCount}. Пока они не сняты, задача не может ускориться.`,
    });
  }
  if (input.hasOverdue) {
    steps.push({
      title: "Провести экспресс-перепланирование и утвердить recovery-план",
      ownerRole: "PM + Производитель работ",
      slaHours: 6,
      reason: `Просрочка ${input.overdueDays} дн. Требуется обновить фактические даты и ресурсы.`,
    });
  }
  if (input.progressPercent < 50) {
    steps.push({
      title: "Разбить оставшийся объем на короткие подэтапы с ежедневным контролем",
      ownerRole: "Прораб",
      slaHours: 12,
      reason: "Низкий прогресс увеличивает риск срыва срока, нужен более мелкий план выполнения.",
    });
  }
  if (input.checklistTotal > 0 && input.checklistDone < input.checklistTotal) {
    steps.push({
      title: "Закрыть обязательные пункты чек-листа перед переходом к следующему этапу",
      ownerRole: "Ответственный исполнитель",
      slaHours: 24,
      reason: `Выполнено ${input.checklistDone}/${input.checklistTotal} пунктов чек-листа.`,
    });
  }
  if (steps.length === 0) {
    steps.push({
      title: "Подтвердить статус без рисков и сохранить текущий темп выполнения",
      ownerRole: "PM",
      slaHours: 24,
      reason: "Критичных рисков не найдено, требуется только плановый контроль.",
    });
  }
  return steps.slice(0, 6);
}

async function loadTask(companyId: number, taskId: number) {
  const [row] = await db
    .select()
    .from(constructionTasksTable)
    .where(
      and(
        eq(constructionTasksTable.id, taskId),
        eq(constructionTasksTable.companyId, companyId),
      ),
    );
  return row ?? null;
}

async function stageContext(companyId: number, stageId: number | null) {
  if (!stageId) return { stage: null, parentStage: null };
  const [stage] = await db
    .select()
    .from(constructionStagesTable)
    .where(
      and(
        eq(constructionStagesTable.id, stageId),
        eq(constructionStagesTable.companyId, companyId),
      ),
    );
  if (!stage) return { stage: null, parentStage: null };
  if (!stage.parentStageId) return { stage, parentStage: null };
  const [parentStage] = await db
    .select()
    .from(constructionStagesTable)
    .where(eq(constructionStagesTable.id, stage.parentStageId));
  return { stage, parentStage: parentStage ?? null };
}

/** GET /construction/tasks/:id/full */
router.get("/tasks/:id/full", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const companyId = req.scopedCompanyId!;
  const task = await loadTask(companyId, taskId);
  if (!task) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }

  const [subtasks, checklist, activity, comments] = await Promise.all([
    db
      .select()
      .from(constructionTaskSubtasksTable)
      .where(
        and(
          eq(constructionTaskSubtasksTable.taskId, taskId),
          eq(constructionTaskSubtasksTable.companyId, companyId),
        ),
      )
      .orderBy(asc(constructionTaskSubtasksTable.sortOrder), asc(constructionTaskSubtasksTable.id)),
    db
      .select()
      .from(constructionTaskChecklistItemsTable)
      .where(
        and(
          eq(constructionTaskChecklistItemsTable.taskId, taskId),
          eq(constructionTaskChecklistItemsTable.companyId, companyId),
        ),
      )
      .orderBy(asc(constructionTaskChecklistItemsTable.sortOrder), asc(constructionTaskChecklistItemsTable.id)),
    db
      .select()
      .from(constructionTaskActivityTable)
      .where(
        and(
          eq(constructionTaskActivityTable.taskId, taskId),
          eq(constructionTaskActivityTable.companyId, companyId),
        ),
      )
      .orderBy(desc(constructionTaskActivityTable.createdAt))
      .limit(100),
    db
      .select()
      .from(taskCommentsTable)
      .where(
        and(
          eq(taskCommentsTable.taskId, taskId),
          eq(taskCommentsTable.companyId, companyId),
        ),
      )
      .orderBy(asc(taskCommentsTable.createdAt)),
  ]);

  const { stage, parentStage } = await stageContext(companyId, task.stageId);

  res.json({
    task,
    subtasks,
    checklist,
    activity,
    comments,
    stage,
    parentStage,
    counts: {
      subtasks: subtasks.length,
      checklistDone: checklist.filter((c) => c.isDone).length,
      checklistTotal: checklist.length,
      comments: comments.length,
    },
  });
});

/** GET /construction/tasks/:id/activity */
router.get("/tasks/:id/activity", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const companyId = req.scopedCompanyId!;
  if (!(await loadTask(companyId, taskId))) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }
  const rows = await db
    .select()
    .from(constructionTaskActivityTable)
    .where(
      and(
        eq(constructionTaskActivityTable.taskId, taskId),
        eq(constructionTaskActivityTable.companyId, companyId),
      ),
    )
    .orderBy(desc(constructionTaskActivityTable.createdAt));
  res.json(rows);
});

/** POST /construction/tasks/:id/subtasks */
router.post("/tasks/:id/subtasks", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const companyId = req.scopedCompanyId!;
  const userId = req.userId!;
  const task = await loadTask(companyId, taskId);
  if (!task) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }
  const { title, assignedTo, dueDate, status } = req.body;
  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "Укажите название подзадачи" });
    return;
  }

  const existing = await db
    .select({ sortOrder: constructionTaskSubtasksTable.sortOrder })
    .from(constructionTaskSubtasksTable)
    .where(eq(constructionTaskSubtasksTable.taskId, taskId));
  const nextOrder = existing.reduce((m, r) => Math.max(m, r.sortOrder ?? 0), 0) + 1;

  const [row] = await db
    .insert(constructionTaskSubtasksTable)
    .values({
      companyId,
      taskId,
      title: title.trim(),
      assignedTo: assignedTo ? parseInt(String(assignedTo), 10) : null,
      dueDate: dueDate || null,
      status: status || "todo",
      sortOrder: nextOrder,
    })
    .returning();

  if (task.progressMode === "subtasks") {
    await recalculateTaskProgress(companyId, taskId);
  }

  await logTaskActivity({
    companyId,
    taskId,
    userId,
    action: "subtask_created",
    newValue: row.title,
  });

  res.status(201).json(row);
});

/** PATCH /construction/tasks/:id/subtasks/:subId */
router.patch("/tasks/:id/subtasks/:subId", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const subId = parseInt(req.params.subId as string, 10);
  const companyId = req.scopedCompanyId!;
  const userId = req.userId!;
  const task = await loadTask(companyId, taskId);
  if (!task) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }

  const { title, status, assignedTo, dueDate, progressPercent, sortOrder } = req.body;
  const patch: Record<string, unknown> = {};
  if (title !== undefined) patch.title = String(title).trim();
  if (status !== undefined) {
    patch.status = status;
    if (status === "done") patch.completedAt = new Date();
    if (status !== "done") patch.completedAt = null;
    patch.progressPercent = status === "done" ? 100 : (progressPercent ?? 0);
  }
  if (assignedTo !== undefined) patch.assignedTo = assignedTo ? parseInt(String(assignedTo), 10) : null;
  if (dueDate !== undefined) patch.dueDate = dueDate || null;
  if (progressPercent !== undefined) patch.progressPercent = Math.min(100, Math.max(0, parseInt(String(progressPercent), 10) || 0));
  if (sortOrder !== undefined) patch.sortOrder = parseInt(String(sortOrder), 10);

  const [row] = await db
    .update(constructionTaskSubtasksTable)
    .set(patch)
    .where(
      and(
        eq(constructionTaskSubtasksTable.id, subId),
        eq(constructionTaskSubtasksTable.taskId, taskId),
        eq(constructionTaskSubtasksTable.companyId, companyId),
      ),
    )
    .returning();

  if (!row) {
    res.status(404).json({ error: "Подзадача не найдена" });
    return;
  }

  if (task.progressMode === "subtasks") {
    await recalculateTaskProgress(companyId, taskId);
  }

  await logTaskActivity({
    companyId,
    taskId,
    userId,
    action: "subtask_updated",
    meta: { subtaskId: subId },
  });

  res.json(row);
});

/** DELETE /construction/tasks/:id/subtasks/:subId */
router.delete("/tasks/:id/subtasks/:subId", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const subId = parseInt(req.params.subId as string, 10);
  const companyId = req.scopedCompanyId!;
  const userId = req.userId!;
  const task = await loadTask(companyId, taskId);
  if (!task) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }

  await db
    .delete(constructionTaskSubtasksTable)
    .where(
      and(
        eq(constructionTaskSubtasksTable.id, subId),
        eq(constructionTaskSubtasksTable.taskId, taskId),
        eq(constructionTaskSubtasksTable.companyId, companyId),
      ),
    );

  if (task.progressMode === "subtasks") {
    await recalculateTaskProgress(companyId, taskId);
  }

  await logTaskActivity({
    companyId,
    taskId,
    userId,
    action: "subtask_deleted",
    meta: { subtaskId: subId },
  });

  res.json({ ok: true });
});

/** POST /construction/tasks/:id/checklist */
router.post("/tasks/:id/checklist", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const companyId = req.scopedCompanyId!;
  const userId = req.userId!;
  const task = await loadTask(companyId, taskId);
  if (!task) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }
  const { title } = req.body;
  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "Укажите пункт чек-листа" });
    return;
  }

  const existing = await db
    .select({ sortOrder: constructionTaskChecklistItemsTable.sortOrder })
    .from(constructionTaskChecklistItemsTable)
    .where(eq(constructionTaskChecklistItemsTable.taskId, taskId));
  const nextOrder = existing.reduce((m, r) => Math.max(m, r.sortOrder ?? 0), 0) + 1;

  const [row] = await db
    .insert(constructionTaskChecklistItemsTable)
    .values({
      companyId,
      taskId,
      title: title.trim(),
      sortOrder: nextOrder,
    })
    .returning();

  const percent = await recalculateTaskProgress(companyId, taskId);

  await logTaskActivity({
    companyId,
    taskId,
    userId,
    action: "checklist_added",
    newValue: row.title,
    meta: { progressPercent: percent },
  });

  res.status(201).json(row);
});

/** PATCH /construction/tasks/:id/checklist/:itemId */
router.patch("/tasks/:id/checklist/:itemId", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const itemId = parseInt(req.params.itemId as string, 10);
  const companyId = req.scopedCompanyId!;
  const userId = req.userId!;
  const task = await loadTask(companyId, taskId);
  if (!task) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }

  const { title, isDone, sortOrder } = req.body;
  const patch: Record<string, unknown> = {};
  if (title !== undefined) patch.title = String(title).trim();
  if (isDone !== undefined) {
    patch.isDone = Boolean(isDone);
    patch.doneAt = isDone ? new Date() : null;
    patch.doneBy = isDone ? userId : null;
  }
  if (sortOrder !== undefined) patch.sortOrder = parseInt(String(sortOrder), 10);

  const [row] = await db
    .update(constructionTaskChecklistItemsTable)
    .set(patch)
    .where(
      and(
        eq(constructionTaskChecklistItemsTable.id, itemId),
        eq(constructionTaskChecklistItemsTable.taskId, taskId),
        eq(constructionTaskChecklistItemsTable.companyId, companyId),
      ),
    )
    .returning();

  if (!row) {
    res.status(404).json({ error: "Пункт не найден" });
    return;
  }

  const percent = await recalculateTaskProgress(companyId, taskId);

  await logTaskActivity({
    companyId,
    taskId,
    userId,
    action: isDone !== undefined ? "checklist_toggled" : "checklist_updated",
    fieldName: "isDone",
    newValue: String(row.isDone),
    meta: { progressPercent: percent },
  });

  res.json({ item: row, progressPercent: percent });
});

/** DELETE /construction/tasks/:id/checklist/:itemId */
router.delete("/tasks/:id/checklist/:itemId", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const itemId = parseInt(req.params.itemId as string, 10);
  const companyId = req.scopedCompanyId!;
  const userId = req.userId!;

  await db
    .delete(constructionTaskChecklistItemsTable)
    .where(
      and(
        eq(constructionTaskChecklistItemsTable.id, itemId),
        eq(constructionTaskChecklistItemsTable.taskId, taskId),
        eq(constructionTaskChecklistItemsTable.companyId, companyId),
      ),
    );

  const percent = await recalculateTaskProgress(companyId, taskId);

  await logTaskActivity({
    companyId,
    taskId,
    userId,
    action: "checklist_removed",
    meta: { progressPercent: percent },
  });

  res.json({ ok: true, progressPercent: percent });
});

/** PATCH /construction/tasks/:id/progress-mode */
router.patch("/tasks/:id/progress-mode", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const companyId = req.scopedCompanyId!;
  const userId = req.userId!;
  const { progressMode, progressPercent } = req.body;
  const allowed = ["checklist", "manual", "subtasks"];
  if (!allowed.includes(progressMode)) {
    res.status(400).json({ error: "Недопустимый режим прогресса" });
    return;
  }

  const patch: Record<string, unknown> = { progressMode };
  if (progressMode === "manual" && progressPercent !== undefined) {
    patch.progressPercent = Math.min(100, Math.max(0, parseInt(String(progressPercent), 10) || 0));
  }

  const [row] = await db
    .update(constructionTasksTable)
    .set(patch)
    .where(
      and(
        eq(constructionTasksTable.id, taskId),
        eq(constructionTasksTable.companyId, companyId),
      ),
    )
    .returning();

  if (!row) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }

  const percent =
    progressMode === "manual"
      ? Number(row.progressPercent)
      : await recalculateTaskProgress(companyId, taskId);

  await logTaskActivity({
    companyId,
    taskId,
    userId,
    action: "progress_mode_changed",
    newValue: progressMode,
    meta: { progressPercent: percent },
  });

  res.json({ ...row, progressPercent: percent });
});

/** POST /construction/tasks/:id/risk-action-plan */
router.post("/tasks/:id/risk-action-plan", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const companyId = req.scopedCompanyId!;
  const plan = await generateRiskActionPlanForTask(companyId, taskId);
  if (!plan) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }
  res.json(plan);
});

/** GET /construction/tasks/:id/next-best-action */
router.get("/tasks/:id/next-best-action", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const companyId = req.scopedCompanyId!;
  const plan = await generateRiskActionPlanForTask(companyId, taskId);
  if (!plan) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }
  res.json({
    nextBestAction: plan.nextBestAction,
    riskLevel: plan.riskLevel,
    summary: plan.summary,
  });
});

/** POST /construction/tasks/:id/risk-plan-reminders — планировать SLA-напоминания */
router.post("/tasks/:id/risk-plan-reminders", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const companyId = req.scopedCompanyId!;
  const userId = req.userId!;
  const task = await loadTask(companyId, taskId);
  if (!task) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }

  const bodySteps = normalizePlanSteps(req.body?.steps);
  const plan = bodySteps.length > 0
    ? null
    : await generateRiskActionPlanForTask(companyId, taskId);
  const steps = bodySteps.length > 0 ? bodySteps : plan?.steps ?? [];
  if (steps.length === 0) {
    res.status(400).json({ error: "Нет шагов плана для напоминаний" });
    return;
  }

  const scheduledAt = new Date().toISOString();
  const scheduledSteps: ScheduledSlaStep[] = steps.map((step, stepIndex) => ({
    ...step,
    stepIndex,
    dueAt: new Date(Date.now() + step.slaHours * 60 * 60 * 1000).toISOString(),
  }));

  await logTaskActivity({
    companyId,
    taskId,
    userId,
    action: "risk_plan_reminders_scheduled",
    meta: { scheduledAt, steps: scheduledSteps },
  });

  const dispatch = await dispatchSlaReminders({
    companyId,
    taskId,
    taskTitle: task.title,
    assigneeId: task.assignedTo,
    fromUserId: userId,
    steps: scheduledSteps,
  });

  res.json({
    scheduled: scheduledSteps.length,
    scheduledAt,
    recipientId: dispatch.recipientId,
    notificationsCreated: dispatch.created,
    pending: dispatch.pending,
  });
});

/** POST /construction/tasks/:id/sla-reminders/check — отправить наступившие SLA-напоминания */
router.post("/tasks/:id/sla-reminders/check", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const companyId = req.scopedCompanyId!;
  const userId = req.userId!;
  const task = await loadTask(companyId, taskId);
  if (!task) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }

  const schedule = await getLatestSlaSchedule(companyId, taskId);
  if (!schedule?.steps?.length) {
    res.json({ created: 0, pending: 0, scheduled: 0 });
    return;
  }

  const dispatch = await dispatchSlaReminders({
    companyId,
    taskId,
    taskTitle: task.title,
    assigneeId: task.assignedTo,
    fromUserId: userId,
    steps: schedule.steps,
  });

  res.json({
    created: dispatch.created,
    pending: dispatch.pending,
    scheduled: schedule.steps.length,
    scheduledAt: schedule.scheduledAt ?? null,
  });
});

// ── TASK OVERDUE NOTIFICATIONS ───────────────────────────────────────────────

router.post("/tasks/overdue/check", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const userId = req.userId!;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const overdue = await db
    .select()
    .from(constructionTasksTable)
    .where(
      and(
        eq(constructionTasksTable.companyId, companyId),
        eq(constructionTasksTable.assignedTo, userId),
      ),
    );

  const overdueTasks = overdue.filter(
    (t) =>
      t.status !== "done" &&
      !!t.dueDate &&
      new Date(String(t.dueDate)) < now,
  );

  if (overdueTasks.length === 0) {
    res.json({ created: 0, totalOverdue: 0 });
    return;
  }

  const existing = await db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.companyId, companyId),
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.type, "task_overdue"),
      ),
    );

  const notifiedToday = new Set<number>();
  for (const n of existing) {
    if (!n.metadata || !n.createdAt) continue;
    const createdDate = new Date(n.createdAt).toISOString().slice(0, 10);
    if (createdDate !== today) continue;
    try {
      const parsed = JSON.parse(String(n.metadata));
      const taskId = Number(parsed?.taskId);
      if (Number.isFinite(taskId)) notifiedToday.add(taskId);
    } catch {
      // ignore malformed metadata
    }
  }

  let created = 0;
  for (const task of overdueTasks) {
    if (notifiedToday.has(task.id)) continue;
    await db.insert(notificationsTable).values({
      companyId,
      userId,
      fromUserId: userId,
      type: "task_overdue",
      title: `Просрочена задача: ${task.title}`,
      body: `Срок истёк: ${task.dueDate}`,
      message: `Срок истёк: ${task.dueDate}`,
      icon: "alert-circle",
      color: "rose",
      link: `/construction/tasks/${task.id}`,
      metadata: JSON.stringify({ taskId: task.id, dueDate: task.dueDate }),
    } as any);
    created += 1;
  }

  res.json({ created, totalOverdue: overdueTasks.length });
});

// ── TASK PHOTOS ──────────────────────────────────────────────────────────────

const ALLOWED_PHOTO_TYPES = ["before", "progress", "after"] as const;

router.get("/tasks/:id/photos", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const companyId = req.scopedCompanyId!;
  if (!(await loadTask(companyId, taskId))) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }

  const rows = await db
    .select()
    .from(constructionTaskPhotosTable)
    .where(
      and(
        eq(constructionTaskPhotosTable.taskId, taskId),
        eq(constructionTaskPhotosTable.companyId, companyId),
      ),
    )
    .orderBy(desc(constructionTaskPhotosTable.createdAt));

  res.json(rows);
});

router.post("/tasks/:id/photos", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const companyId = req.scopedCompanyId!;
  const userId = req.userId!;

  const task = await loadTask(companyId, taskId);
  if (!task) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }

  const { photoType, photos } = req.body as {
    photoType: string;
    photos: Array<{ fileName: string; mimeType: string; base64: string; caption?: string; takenAt?: string }>;
  };

  if (!ALLOWED_PHOTO_TYPES.includes(photoType as any)) {
    res.status(400).json({ error: "Недопустимый тип фото" });
    return;
  }
  if (!Array.isArray(photos) || photos.length === 0) {
    res.status(400).json({ error: "Нет файлов" });
    return;
  }

  // Ограничение по размеру base64 (примерно): 8 МБ на файл
  const MAX_BYTES = 8 * 1024 * 1024;

  const inserted: any[] = [];
  for (const p of photos) {
    if (!p?.base64 || !p?.mimeType || !p?.fileName) continue;
    const buffer = Buffer.from(String(p.base64), "base64");
    if (buffer.length > MAX_BYTES) {
      res.status(400).json({ error: `Файл слишком большой: ${p.fileName}` });
      return;
    }

    const uploaded = await uploadFile({
      fileName: String(p.fileName),
      mimeType: String(p.mimeType),
      base64: String(p.base64),
      pathname: `construction-tasks/${companyId}/${taskId}/photos/${photoType}`,
    });

    if (uploaded.storage !== "blob") {
      res.status(500).json({
        error:
          "Blob-хранилище не настроено. Пожалуйста, включите BLOB_READ_WRITE_TOKEN в Vercel env.",
      });
      return;
    }

    const [row] = await db
      .insert(constructionTaskPhotosTable)
      .values({
        companyId,
        taskId,
        uploadedBy: userId,
        photoType: photoType as any,
        photoUrl: uploaded.url,
        thumbnailUrl: uploaded.url,
        caption: p.caption ? String(p.caption) : null,
        takenAt: p.takenAt ? new Date(String(p.takenAt)) : null,
      })
      .returning();

    inserted.push(row);
  }

  res.status(201).json(inserted);
});

// ── TASK ATTACHMENTS ─────────────────────────────────────────────────────────

const inferDocType = (fileName: string, mimeType: string): string => {
  const lower = String(fileName).toLowerCase();
  if (
    mimeType.startsWith("image/") ||
    lower.match(/\.(png|jpg|jpeg|webp|gif)$/)
  ) return "photo";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".dwg")) return "dwg";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "xlsx";
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) return "docx";
  return "other";
};

router.get("/tasks/:id/attachments", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const companyId = req.scopedCompanyId!;
  if (!(await loadTask(companyId, taskId))) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }

  const rows = await db
    .select()
    .from(constructionTaskAttachmentsTable)
    .where(
      and(
        eq(constructionTaskAttachmentsTable.taskId, taskId),
        eq(constructionTaskAttachmentsTable.companyId, companyId),
      ),
    )
    .orderBy(desc(constructionTaskAttachmentsTable.createdAt));

  res.json(rows);
});

router.post("/tasks/:id/attachments", async (req: AuthenticatedRequest, res): Promise<void> => {
  const taskId = parseInt(req.params.id as string, 10);
  const companyId = req.scopedCompanyId!;
  const userId = req.userId!;

  const task = await loadTask(companyId, taskId);
  if (!task) {
    res.status(404).json({ error: "Задача не найдена" });
    return;
  }

  const { files, docType } = req.body as {
    docType?: string;
    files: Array<{ fileName: string; mimeType: string; base64: string }>;
  };

  if (!Array.isArray(files) || files.length === 0) {
    res.status(400).json({ error: "Нет файлов" });
    return;
  }

  const MAX_BYTES = 12 * 1024 * 1024; // до 12 МБ base64 ~ per-file

  const inserted: any[] = [];
  for (const f of files) {
    if (!f?.base64 || !f?.mimeType || !f?.fileName) continue;
    const buffer = Buffer.from(String(f.base64), "base64");
    if (buffer.length > MAX_BYTES) {
      res.status(400).json({ error: `Файл слишком большой: ${f.fileName}` });
      return;
    }

    const uploaded = await uploadFile({
      fileName: String(f.fileName),
      mimeType: String(f.mimeType),
      base64: String(f.base64),
      pathname: `construction-tasks/${companyId}/${taskId}/attachments`,
    });

    if (uploaded.storage !== "blob") {
      res.status(500).json({
        error:
          "Blob-хранилище не настроено. Пожалуйста, включите BLOB_READ_WRITE_TOKEN в Vercel env.",
      });
      return;
    }

    const inferred = docType ? String(docType) : inferDocType(f.fileName, f.mimeType);
    const [row] = await db
      .insert(constructionTaskAttachmentsTable)
      .values({
        companyId,
        taskId,
        uploadedBy: userId,
        docType: inferred,
        fileUrl: uploaded.url,
        fileName: String(f.fileName),
        mimeType: String(f.mimeType),
        fileSize: BigInt(buffer.length),
      })
      .returning();

    inserted.push(row);
  }

  res.status(201).json(inserted);
});

export default router;

