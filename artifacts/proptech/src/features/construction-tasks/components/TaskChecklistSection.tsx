import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { TaskChecklistItem } from "../types";
import { TaskProgressBar } from "./TaskProgressBar";

export function TaskChecklistSection({
	taskId,
	items,
	progressPercent,
	onChanged,
}: {
	taskId: number;
	items: TaskChecklistItem[];
	progressPercent: number;
	onChanged: () => void;
}) {
	const [newTitle, setNewTitle] = useState("");
	const [adding, setAdding] = useState(false);

	const addItem = async () => {
		if (!newTitle.trim()) return;
		setAdding(true);
		try {
			await api.post(`/construction/tasks/${taskId}/checklist`, {
				title: newTitle.trim(),
			});
			setNewTitle("");
			onChanged();
		} finally {
			setAdding(false);
		}
	};

	const toggle = async (item: TaskChecklistItem) => {
		await api.patch(`/construction/tasks/${taskId}/checklist/${item.id}`, {
			isDone: !item.isDone,
		});
		onChanged();
	};

	const remove = async (itemId: number) => {
		if (!confirm("Удалить пункт?")) return;
		await api.delete(`/construction/tasks/${taskId}/checklist/${itemId}`);
		onChanged();
	};

	const done = items.filter((i) => i.isDone).length;

	return (
		<section className="space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-gray-900">
					Чек-лист
					<span className="text-gray-400 font-normal ml-1">
						({done}/{items.length})
					</span>
				</h3>
			</div>
			<TaskProgressBar percent={progressPercent} />
			<ul className="space-y-2">
				{items.map((item) => (
					<li
						key={item.id}
						className="flex items-start gap-2 group"
					>
						<Checkbox
							checked={item.isDone}
							onCheckedChange={() => toggle(item)}
							className="mt-0.5"
						/>
						<span
							className={`flex-1 text-sm ${item.isDone ? "line-through text-gray-400" : "text-gray-800"}`}
						>
							{item.title}
						</span>
						<button
							type="button"
							className="text-xs text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"
							onClick={() => remove(item.id)}
						>
							Удалить
						</button>
					</li>
				))}
			</ul>
			<div className="flex gap-2">
				<Input
					placeholder="Новый пункт..."
					value={newTitle}
					onChange={(e) => setNewTitle(e.target.value)}
					className="h-8 text-sm"
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							void addItem();
						}
					}}
				/>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={adding || !newTitle.trim()}
					onClick={() => void addItem()}
				>
					<Plus className="w-4 h-4" />
				</Button>
			</div>
		</section>
	);
}
