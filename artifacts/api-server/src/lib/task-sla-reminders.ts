import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  constructionTaskActivityTable,
  constructionTasksTable,
  notificationsTable,
} from "./db";

export type ScheduledSlaStep = {
  title: string;
  ownerRole: string;
  slaHours: number;
  reason: string;
  stepIndex: number;
  dueAt: string;
};

export async function getLatestSlaSchedule(companyId: number, taskId: number) {
  const [row] = await db
    .select()
    .from(constructionTaskActivityTable)
    .where(
      and(
        eq(constructionTaskActivityTable.companyId, companyId),
        eq(constructionTaskActivityTable.taskId, taskId),
        eq(constructionTaskActivityTable.action, "risk_plan_reminders_scheduled"),
      ),
    )
    .orderBy(desc(constructionTaskActivityTable.createdAt))
    .limit(1);

  if (!row?.meta) return null;
  try {
    const meta = JSON.parse(String(row.meta)) as {
      steps?: ScheduledSlaStep[];
      scheduledAt?: string;
    };
    if (!Array.isArray(meta.steps) || meta.steps.length === 0) return null;
    return { ...meta, schedulerUserId: row.userId };
  } catch {
    return null;
  }
}

export async function dispatchSlaReminders(params: {
  companyId: number;
  taskId: number;
  taskTitle: string;
  assigneeId: number | null;
  fromUserId: number;
  steps: ScheduledSlaStep[];
}): Promise<{ created: number; pending: number; recipientId: number }> {
  const recipientId = params.assigneeId ?? params.fromUserId;
  const now = Date.now();

  const existing = await db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.companyId, params.companyId),
        eq(notificationsTable.userId, recipientId),
        eq(notificationsTable.type, "task_sla_reminder"),
      ),
    );

  const notifiedKeys = new Set<string>();
  for (const n of existing) {
    if (!n.metadata) continue;
    try {
      const parsed = JSON.parse(String(n.metadata));
      if (Number(parsed?.taskId) === params.taskId) {
        notifiedKeys.add(`${parsed.stepIndex}:${String(parsed.dueAt).slice(0, 16)}`);
      }
    } catch {
      // ignore malformed metadata
    }
  }

  let created = 0;
  let pending = 0;
  for (const step of params.steps) {
    const dueMs = new Date(step.dueAt).getTime();
    if (!Number.isFinite(dueMs)) continue;
    if (now < dueMs) {
      pending += 1;
      continue;
    }
    const dedupeKey = `${step.stepIndex}:${step.dueAt.slice(0, 16)}`;
    if (notifiedKeys.has(dedupeKey)) continue;

    const overdueHours = Math.max(0, Math.round((now - dueMs) / (60 * 60 * 1000)));
    await db.insert(notificationsTable).values({
      companyId: params.companyId,
      userId: recipientId,
      fromUserId: params.fromUserId,
      type: "task_sla_reminder",
      title:
        overdueHours > 0
          ? `SLA просрочен: ${params.taskTitle}`
          : `SLA шага: ${params.taskTitle}`,
      body: `${step.title} · ${step.ownerRole} · дедлайн ${new Date(step.dueAt).toLocaleString("ru-KG")}`,
      message: step.reason,
      icon: "clock",
      color: overdueHours > 0 ? "rose" : "amber",
      link: `/construction/tasks/${params.taskId}`,
      metadata: JSON.stringify({
        taskId: params.taskId,
        stepIndex: step.stepIndex,
        dueAt: step.dueAt,
        slaHours: step.slaHours,
      }),
    } as any);
    created += 1;
    notifiedKeys.add(dedupeKey);
  }

  return { created, pending, recipientId };
}

/** Фоновая проверка SLA по всем задачам с запланированными напоминаниями */
export async function runSlaRemindersCron(): Promise<{
  schedulesFound: number;
  tasksProcessed: number;
  notificationsCreated: number;
  pending: number;
  skippedDone: number;
  skippedInvalid: number;
}> {
  const activityRows = await db
    .select()
    .from(constructionTaskActivityTable)
    .where(eq(constructionTaskActivityTable.action, "risk_plan_reminders_scheduled"))
    .orderBy(desc(constructionTaskActivityTable.createdAt));

  const latestByTask = new Map<string, (typeof activityRows)[number]>();
  for (const row of activityRows) {
    const key = `${row.companyId}:${row.taskId}`;
    if (!latestByTask.has(key)) latestByTask.set(key, row);
  }

  const schedules = [...latestByTask.values()];
  if (schedules.length === 0) {
    return {
      schedulesFound: 0,
      tasksProcessed: 0,
      notificationsCreated: 0,
      pending: 0,
      skippedDone: 0,
      skippedInvalid: 0,
    };
  }

  const taskIds = [...new Set(schedules.map((s) => s.taskId))];
  const tasks = await db
    .select({
      id: constructionTasksTable.id,
      companyId: constructionTasksTable.companyId,
      title: constructionTasksTable.title,
      status: constructionTasksTable.status,
      assignedTo: constructionTasksTable.assignedTo,
    })
    .from(constructionTasksTable)
    .where(inArray(constructionTasksTable.id, taskIds));

  const taskMap = new Map(tasks.map((t) => [`${t.companyId}:${t.id}`, t]));

  let tasksProcessed = 0;
  let notificationsCreated = 0;
  let pending = 0;
  let skippedDone = 0;
  let skippedInvalid = 0;

  for (const schedule of schedules) {
    const task = taskMap.get(`${schedule.companyId}:${schedule.taskId}`);
    if (!task) {
      skippedInvalid += 1;
      continue;
    }
    if (task.status === "done") {
      skippedDone += 1;
      continue;
    }

    let steps: ScheduledSlaStep[] = [];
    try {
      const meta = JSON.parse(String(schedule.meta)) as { steps?: ScheduledSlaStep[] };
      steps = Array.isArray(meta.steps) ? meta.steps : [];
    } catch {
      skippedInvalid += 1;
      continue;
    }
    if (steps.length === 0) {
      skippedInvalid += 1;
      continue;
    }

    const dispatch = await dispatchSlaReminders({
      companyId: schedule.companyId,
      taskId: schedule.taskId,
      taskTitle: task.title,
      assigneeId: task.assignedTo,
      fromUserId: schedule.userId,
      steps,
    });

    tasksProcessed += 1;
    notificationsCreated += dispatch.created;
    pending += dispatch.pending;
  }

  return {
    schedulesFound: schedules.length,
    tasksProcessed,
    notificationsCreated,
    pending,
    skippedDone,
    skippedInvalid,
  };
}
