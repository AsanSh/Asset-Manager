import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { TaskSubtask } from "../types";

export function TaskSubtasksSection({
	taskId,
	subtasks,
	onChanged,
}: {
	taskId: number;
	subtasks: TaskSubtask[];
	onChanged: () => void;
}) {
	const [newTitle, setNewTitle] = useState("");
	const [adding, setAdding] = useState(false);

	const addSubtask = async () => {
		if (!newTitle.trim()) return;
		setAdding(true);
		try {
			await api.post(`/construction/tasks/${taskId}/subtasks`, {
				title: newTitle.trim(),
			});
			setNewTitle("");
			onChanged();
		} finally {
			setAdding(false);
		}
	};

	const toggleDone = async (st: TaskSubtask) => {
		const next = st.status === "done" ? "todo" : "done";
		await api.patch(`/construction/tasks/${taskId}/subtasks/${st.id}`, {
			status: next,
		});
		onChanged();
	};

	return (
		<section className="space-y-3">
			<h3 className="text-sm font-semibold text-gray-900">
				Подзадачи
				<span className="text-gray-400 font-normal ml-1">({subtasks.length})</span>
			</h3>
			<ul className="space-y-2">
				{subtasks.map((st) => (
					<li key={st.id} className="flex items-center gap-2">
						<Checkbox
							checked={st.status === "done"}
							onCheckedChange={() => toggleDone(st)}
						/>
						<span
							className={`text-sm flex-1 ${st.status === "done" ? "line-through text-gray-400" : "text-gray-800"}`}
						>
							{st.title}
						</span>
						{st.dueDate && (
							<span className="text-[10px] text-gray-400">
								{new Date(st.dueDate).toLocaleDateString("ru-KG", {
									day: "numeric",
									month: "short",
								})}
							</span>
						)}
					</li>
				))}
			</ul>
			<div className="flex gap-2">
				<Input
					placeholder="Подзадача..."
					value={newTitle}
					onChange={(e) => setNewTitle(e.target.value)}
					className="h-8 text-sm"
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							void addSubtask();
						}
					}}
				/>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={adding || !newTitle.trim()}
					onClick={() => void addSubtask()}
				>
					<Plus className="w-4 h-4" />
				</Button>
			</div>
		</section>
	);
}
