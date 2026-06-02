import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getApiBase } from "@/lib/api-base";
import { WBS_STATUS_OPTS } from "./status";
import type { DialogState, ProjectOption, WbsStage } from "./types";

const BASE = getApiBase();
const ah = () => {
	const t = localStorage.getItem("auth_token");
	return {
		"Content-Type": "application/json",
		...(t ? { Authorization: `Bearer ${t}` } : {}),
	};
};

export function WbsStageDialog({
	stage,
	projects,
	parentStages,
	onClose,
	onSaved,
}: {
	stage: DialogState;
	projects: ProjectOption[];
	parentStages: WbsStage[];
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const isEdit = stage && stage !== "new" && !("parentStageId" in stage && !("id" in stage));
	const init = isEdit ? (stage as WbsStage) : null;

	const presetParent =
		stage && typeof stage === "object" && !("id" in stage)
			? (stage as { parentStageId: number; projectId: number })
			: null;

	const [form, setForm] = useState({
		projectId: String(init?.projectId || presetParent?.projectId || projects[0]?.id || ""),
		parentStageId: String(init?.parentStageId || presetParent?.parentStageId || ""),
		name: init?.name || "",
		description: init?.description || "",
		status: init?.status || "not_started",
		progress: String(init?.progress ?? 0),
		startDate: init?.startDate || "",
		plannedEndDate: init?.plannedEndDate || "",
		budgetAmount: init?.budgetAmount || "",
	});
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	useEffect(() => {
		if (!stage) return;
		if (stage === "new") {
			setForm({
				projectId: String(projects[0]?.id || ""),
				parentStageId: "",
				name: "",
				description: "",
				status: "not_started",
				progress: "0",
				startDate: "",
				plannedEndDate: "",
				budgetAmount: "",
			});
		} else if ("id" in stage) {
			const s = stage as WbsStage;
			setForm({
				projectId: String(s.projectId),
				parentStageId: String(s.parentStageId || ""),
				name: s.name,
				description: s.description || "",
				status: s.status,
				progress: String(s.progress),
				startDate: s.startDate || "",
				plannedEndDate: s.plannedEndDate || "",
				budgetAmount: s.budgetAmount || "",
			});
		} else {
			const p = stage as { parentStageId: number; projectId: number };
			setForm({
				projectId: String(p.projectId),
				parentStageId: String(p.parentStageId),
				name: "",
				description: "",
				status: "not_started",
				progress: "0",
				startDate: "",
				plannedEndDate: "",
				budgetAmount: "",
			});
		}
	}, [stage, projects]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.name || !form.projectId) {
			toast({ title: "Заполните обязательные поля", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const url = init ? `${BASE}/construction/stages/${init.id}` : `${BASE}/construction/stages`;
			const res = await fetch(url, {
				method: init ? "PATCH" : "POST",
				headers: ah(),
				body: JSON.stringify({
					...form,
					projectId: parseInt(form.projectId, 10),
					progress: parseInt(form.progress, 10),
					parentStageId: form.parentStageId ? parseInt(form.parentStageId, 10) : null,
				}),
			});
			if (!res.ok) throw new Error("save failed");
			toast({ title: init ? "Этап обновлён" : "Этап добавлен" });
			onSaved();
			onClose();
		} catch {
			toast({ title: "Ошибка", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	const open = !!stage;
	const title = init ? "Редактировать этап WBS" : presetParent ? "Добавить подэтап" : "Добавить этап WBS";
	const availableParents = parentStages.filter((s) => !init || s.id !== init.id);

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div>
						<Label>Проект *</Label>
						<Select value={form.projectId} onValueChange={(v) => set("projectId", v)}>
							<SelectTrigger className="mt-1">
								<SelectValue placeholder="Выберите проект" />
							</SelectTrigger>
							<SelectContent>
								{projects.map((p) => (
									<SelectItem key={p.id} value={String(p.id)}>
										{p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{availableParents.length > 0 && !presetParent && (
						<div>
							<Label>Родительский этап</Label>
							<Select
								value={form.parentStageId || "none"}
								onValueChange={(v) => set("parentStageId", v === "none" ? "" : v)}
							>
								<SelectTrigger className="mt-1">
									<SelectValue placeholder="Корневой уровень" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">— Корневой этап —</SelectItem>
									{availableParents.map((s) => (
										<SelectItem key={s.id} value={String(s.id)}>
											{s.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
					<div>
						<Label>Название *</Label>
						<Input className="mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} required />
					</div>
					<div>
						<Label>Описание</Label>
						<Input className="mt-1" value={form.description} onChange={(e) => set("description", e.target.value)} />
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Статус</Label>
							<Select value={form.status} onValueChange={(v) => set("status", v)}>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{WBS_STATUS_OPTS.map((o) => (
										<SelectItem key={o.value} value={o.value}>
											{o.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Прогресс %</Label>
							<Input
								className="mt-1"
								type="number"
								min={0}
								max={100}
								value={form.progress}
								onChange={(e) => set("progress", e.target.value)}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Начало</Label>
							<Input className="mt-1" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
						</div>
						<div>
							<Label>Окончание (план)</Label>
							<Input
								className="mt-1"
								type="date"
								value={form.plannedEndDate}
								onChange={(e) => set("plannedEndDate", e.target.value)}
							/>
						</div>
					</div>
					<div>
						<Label>Бюджет (сом)</Label>
						<Input className="mt-1" value={form.budgetAmount} onChange={(e) => set("budgetAmount", e.target.value)} />
					</div>
					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Отмена
						</Button>
						<Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-orange-600">
							{loading ? "Сохранение…" : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
