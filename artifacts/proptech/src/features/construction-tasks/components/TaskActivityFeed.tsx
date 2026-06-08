import type { TaskActivity } from "../types";

const ACTION_LABELS: Record<string, string> = {
	task_created: "Задача создана",
	field_change: "Изменение поля",
	subtask_created: "Добавлена подзадача",
	subtask_updated: "Подзадача обновлена",
	subtask_deleted: "Подзадача удалена",
	checklist_added: "Пункт чек-листа",
	checklist_toggled: "Чек-лист",
	checklist_updated: "Чек-лист",
	checklist_removed: "Пункт удалён",
	progress_mode_changed: "Режим прогресса",
};

export function TaskActivityFeed({
	activity,
	userMap,
}: {
	activity: TaskActivity[];
	userMap: Record<number, { firstName: string; lastName: string }>;
}) {
	if (activity.length === 0) {
		return (
			<p className="text-sm text-gray-600 text-center py-6">
				История изменений пока пуста
			</p>
		);
	}

	return (
		<ul className="space-y-3">
			{activity.map((a) => {
				const user = userMap[a.userId];
				const name = user
					? `${user.firstName} ${user.lastName}`.trim()
					: "Пользователь";
				const label = ACTION_LABELS[a.action] || a.action;
				let detail = a.newValue || "";
				if (a.action === "field_change" && a.fieldName) {
					detail = `${a.fieldName}: ${a.oldValue || "—"} → ${a.newValue || "—"}`;
				}
				return (
					<li key={a.id} className="text-sm border-l-2 border-gray-200 pl-3">
						<div className="text-gray-900 font-medium">{label}</div>
						{detail && <div className="text-gray-600 mt-0.5">{detail}</div>}
						<div className="text-[11px] text-gray-600 mt-1">
							{name} ·{" "}
							{new Date(a.createdAt).toLocaleString("ru-KG", {
								day: "numeric",
								month: "short",
								hour: "2-digit",
								minute: "2-digit",
							})}
						</div>
					</li>
				);
			})}
		</ul>
	);
}
