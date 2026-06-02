import { and, asc, eq } from "drizzle-orm";
import {
  constructionTaskActivityTable,
  constructionTaskChecklistItemsTable,
  constructionTaskSubtasksTable,
  constructionTasksTable,
  db,
  type ConstructionTask,
} from "./db";

export type ProgressMode = "checklist" | "manual" | "subtasks";

export function computeChecklistProgress(
  items: { isDone: boolean }[],
): number {
  if (items.length === 0) return 0;
  const done = items.filter((i) => i.isDone).length;
  return Math.round((done / items.length) * 100);
}

export function computeSubtasksProgress(
  items: { progressPercent: number | null; status: string }[],
): number {
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, s) => {
    if (s.status === "done") return acc + 100;
    return acc + Math.min(100, Math.max(0, Number(s.progressPercent) || 0));
  }, 0);
  return Math.round(sum / items.length);
}

export async function recalculateTaskProgress(
  companyId: number,
  taskId: number,
): Promise<number> {
  const [task] = await db
    .select()
    .from(constructionTasksTable)
    .where(
      and(
        eq(constructionTasksTable.id, taskId),
        eq(constructionTasksTable.companyId, companyId),
      ),
    );
  if (!task) return 0;

  const mode = (task.progressMode || "checklist") as ProgressMode;
  let percent = Number(task.progressPercent) || 0;

  if (mode === "manual") {
    return Math.min(100, Math.max(0, percent));
  }

  if (mode === "subtasks") {
    const subtasks = await db
      .select()
      .from(constructionTaskSubtasksTable)
      .where(
        and(
          eq(constructionTaskSubtasksTable.taskId, taskId),
          eq(constructionTaskSubtasksTable.companyId, companyId),
        ),
      );
    percent = computeSubtasksProgress(subtasks);
  } else {
    const checklist = await db
      .select()
      .from(constructionTaskChecklistItemsTable)
      .where(
        and(
          eq(constructionTaskChecklistItemsTable.taskId, taskId),
          eq(constructionTaskChecklistItemsTable.companyId, companyId),
        ),
      )
      .orderBy(asc(constructionTaskChecklistItemsTable.sortOrder));
    percent = computeChecklistProgress(checklist);
  }

  await db
    .update(constructionTasksTable)
    .set({ progressPercent: percent })
    .where(
      and(
        eq(constructionTasksTable.id, taskId),
        eq(constructionTasksTable.companyId, companyId),
      ),
    );

  return percent;
}

export async function logTaskActivity(params: {
  companyId: number;
  taskId: number;
  userId: number;
  action: string;
  fieldName?: string;
  oldValue?: string | null;
  newValue?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(constructionTaskActivityTable).values({
    companyId: params.companyId,
    taskId: params.taskId,
    userId: params.userId,
    action: params.action,
    fieldName: params.fieldName ?? null,
    oldValue: params.oldValue ?? null,
    newValue: params.newValue ?? null,
    meta: params.meta ? JSON.stringify(params.meta) : null,
  });
}

export function taskFieldChanges(
  prev: ConstructionTask,
  patch: Record<string, unknown>,
): Array<{ field: string; oldValue: string; newValue: string }> {
  const tracked: Array<keyof ConstructionTask> = [
    "title",
    "status",
    "priority",
    "assignedTo",
    "dueDate",
    "stageId",
    "progressPercent",
    "plannedStartDate",
    "plannedEndDate",
  ];
  const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];
  for (const field of tracked) {
    if (patch[field] === undefined) continue;
    const oldVal = prev[field];
    const newVal = patch[field];
    if (String(oldVal ?? "") !== String(newVal ?? "")) {
      changes.push({
        field,
        oldValue: String(oldVal ?? ""),
        newValue: String(newVal ?? ""),
      });
    }
  }
  return changes;
}
