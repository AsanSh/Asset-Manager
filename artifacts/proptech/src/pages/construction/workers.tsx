import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Hammer, Phone, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
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
import { api } from "@/lib/api";
import { getApiBase } from "@/lib/api-base";

const BASE = getApiBase();
const ah = () => {
	const t = localStorage.getItem("auth_token");
	return {
		"Content-Type": "application/json",
		...(t ? { Authorization: `Bearer ${t}` } : {}),
	};
};

const SPECS = [
	"Монолитчики",
	"Каменщики",
	"Кровельщики",
	"Электрики",
	"Сантехники",
	"Отделочники",
	"Плотники",
	"Сварщики",
	"Разнорабочие",
	"Прорабы",
];

interface Worker {
	id: number;
	fullName: string;
	brigade?: string;
	specialization?: string;
	phone?: string;
	dailyRate?: string;
	currency: string;
	status: string;
	projectId?: number;
	notes?: string;
	createdAt: string;
}
interface Project {
	id: number;
	name: string;
}

function WorkerDialog({
	worker,
	projects,
	onClose,
	onSaved,
}: {
	worker: Worker | null | "new";
	projects: Project[];
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const isEdit = worker && worker !== "new";
	const init = isEdit ? (worker as Worker) : null;
	const [form, setForm] = useState({
		fullName: init?.fullName || "",
		brigade: init?.brigade || "",
		specialization: init?.specialization || "",
		phone: init?.phone || "",
		dailyRate: init?.dailyRate || "",
		currency: init?.currency || "KGS",
		status: init?.status || "active",
		projectId: String(init?.projectId || "none"),
		notes: init?.notes || "",
	});
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.fullName) {
			toast({ title: "Укажите ФИО", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const url = isEdit
				? `${BASE}/construction/workers/${init?.id}`
				: `${BASE}/construction/workers`;
			await fetch(url, {
				method: isEdit ? "PATCH" : "POST",
				headers: ah(),
				body: JSON.stringify({
					...form,
					projectId: form.projectId && form.projectId !== "none" ? parseInt(form.projectId, 10) : null,
				}),
			});
			toast({ title: isEdit ? "Рабочий обновлён" : "Рабочий добавлен" });
			onSaved();
			onClose();
		} catch {
			toast({ title: "Ошибка", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={!!worker} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Редактировать рабочего" : "Добавить рабочего"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div>
						<Label>ФИО *</Label>
						<Input
							className="mt-1"
							value={form.fullName}
							onChange={(e) => set("fullName", e.target.value)}
							required
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Бригада</Label>
							<Input
								className="mt-auto"
								value={form.brigade}
								onChange={(e) => set("brigade", e.target.value)}
								placeholder="Бригада #1"
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Специализация</Label>
							<Select
								value={form.specialization}
								onValueChange={(v) => set("specialization", v)}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue placeholder="Выберите..." />
								</SelectTrigger>
								<SelectContent>
									{SPECS.map((s) => (
										<SelectItem key={s} value={s}>
											{s}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Телефон</Label>
							<Input
								className="mt-auto"
								value={form.phone}
								onChange={(e) => set("phone", e.target.value)}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Статус</Label>
							<Select
								value={form.status}
								onValueChange={(v) => set("status", v)}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="active">Активен</SelectItem>
									<SelectItem value="inactive">Неактивен</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Ставка/день (KGS)</Label>
							<Input
								className="mt-auto"
								type="number"
								value={form.dailyRate}
								onChange={(e) => set("dailyRate", e.target.value)}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Проект</Label>
							<Select
								value={form.projectId}
								onValueChange={(v) => set("projectId", v)}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue placeholder="Не назначен" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Не назначен</SelectItem>
									{projects.map((p) => (
										<SelectItem key={p.id} value={String(p.id)}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div>
						<Label>Заметки</Label>
						<Input
							className="mt-1"
							value={form.notes}
							onChange={(e) => set("notes", e.target.value)}
						/>
					</div>
					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={loading}
						>
							Отмена
						</Button>
						<Button
							type="submit"
							className="bg-amber-500 hover:bg-orange-600"
							disabled={loading}
						>
							{loading ? "..." : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function ConstructionWorkers() {
	const qc = useQueryClient();
	const { toast } = useToast();
	const [dialog, setDialog] = useState<Worker | null | "new">(null);
	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const { data: workers = [], isLoading } = useQuery<Worker[]>({
		queryKey: ["construction-workers"],
		queryFn: () => api.get("/construction/workers").then((r) => r.data),
	});

	const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

	const handleDelete = async (id: number) => {
		if (!confirm("Удалить рабочего?")) return;
		await fetch(`${BASE}/construction/workers/${id}`, {
			method: "DELETE",
			headers: ah(),
		});
		toast({ title: "Удалено" });
		qc.invalidateQueries({ queryKey: ["construction-workers"] });
	};

	const columns = useMemo<ColumnDef<Worker, unknown>[]>(
		() => [
			{
				id: "fullName",
				header: "Рабочий",
				size: 200,
				minSize: 140,
				maxSize: 360,
				accessorFn: (row) => row.fullName,
				meta: { exportLabel: "Рабочий", grow: true },
				cell: ({ row }) => (
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold shrink-0">
							{row.original.fullName.charAt(0)}
						</div>
						<div className="min-w-0">
							<p className="font-medium text-sm truncate" title={row.original.fullName}>
								{row.original.fullName}
							</p>
							{row.original.phone && (
								<div className="flex items-center gap-1 text-xs text-am-text-muted">
									<Phone className="w-3 h-3 shrink-0" />
									<span className="truncate">{row.original.phone}</span>
								</div>
							)}
						</div>
					</div>
				),
			},
			{
				id: "brigade",
				header: "Бригада",
				size: 140,
				minSize: 100,
				maxSize: 280,
				accessorFn: (row) => row.brigade || "",
				meta: { exportLabel: "Бригада", grow: true },
				cell: ({ row }) => row.original.brigade || "—",
			},
			{
				id: "specialization",
				header: "Специализация",
				size: 130,
				accessorFn: (row) => row.specialization || "",
				meta: { exportLabel: "Специализация" },
				cell: ({ row }) => row.original.specialization || "—",
			},
			{
				id: "project",
				header: "Проект",
				size: 140,
				accessorFn: (row) => (row.projectId ? projectMap[row.projectId] : "") || "",
				meta: { exportLabel: "Проект" },
				cell: ({ row }) =>
					row.original.projectId ? projectMap[row.original.projectId] || "—" : "—",
			},
			{
				id: "dailyRate",
				header: "Ставка/день",
				size: 120,
				accessorFn: (row) => parseFloat(row.dailyRate || "0"),
				meta: { exportLabel: "Ставка/день", align: "right", financeAmount: true },
				cell: ({ row }) =>
					row.original.dailyRate
						? `${parseFloat(row.original.dailyRate).toLocaleString("ru-KG")} сом`
						: "—",
			},
			{
				id: "status",
				header: "Статус",
				size: 100,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => (
					<Badge
						className={
							row.original.status === "active"
								? "bg-emerald-100 text-emerald-800"
								: "bg-gray-100 text-gray-700"
						}
						variant="secondary"
					>
						{row.original.status === "active" ? "Активен" : "Неактивен"}
					</Badge>
				),
			},
			{
				id: "actions",
				header: "",
				size: 80,
				enableSorting: false,
				enableResizing: false,
				meta: { align: "center" },
				cell: ({ row }) => (
					<div className="flex gap-1 justify-center">
						<button
							type="button"
							onClick={() => setDialog(row.original)}
							className="text-am-text-subtle hover:text-am-text-strong p-1"
							title="Редактировать"
						>
							<Edit2 className="w-3.5 h-3.5" />
						</button>
						<button
							type="button"
							onClick={() => handleDelete(row.original.id)}
							className="text-am-text-subtle hover:text-rose-600 p-1"
							title="Удалить"
						>
							<Trash2 className="w-3.5 h-3.5" />
						</button>
					</div>
				),
			},
		],
		[projectMap],
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Бригады и рабочие
					</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						{workers.filter((w) => w.status === "active").length} активных
						рабочих
					</p>
				</div>
				<Button
					onClick={() => setDialog("new")}
					className="bg-amber-500 hover:bg-orange-600 gap-2"
				>
					<Plus className="w-4 h-4" /> Добавить
				</Button>
			</div>

			<div className="grid grid-cols-3 gap-4">
				{[
					{
						label: "Всего рабочих",
						value: workers.length,
						color: "text-amber-600",
					},
					{
						label: "Активных",
						value: workers.filter((w) => w.status === "active").length,
						color: "text-emerald-600",
					},
					{
						label: "Бригад",
						value: new Set(workers.map((w) => w.brigade).filter(Boolean)).size,
						color: "text-blue-600",
					},
				].map((s) => (
					<div
						key={s.label}
						className="bg-white rounded-xl border border-gray-200 p-4"
					>
						<p className="text-xs text-gray-500 mb-1">{s.label}</p>
						<p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
					</div>
				))}
			</div>

			<DataTable
				tableId="construction-workers"
				columns={columns}
				data={workers}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по ФИО или бригаде…"
				initialSorting={[{ id: "fullName", desc: false }]}
				emptyState={
					<div className="flex flex-col items-center gap-2 py-8 text-am-text-muted">
						<Hammer className="w-10 h-10 opacity-30" />
						<p>Рабочих нет</p>
					</div>
				}
			/>

			<WorkerDialog
				worker={dialog}
				projects={projects}
				onClose={() => setDialog(null)}
				onSaved={() =>
					qc.invalidateQueries({ queryKey: ["construction-workers"] })
				}
			/>
		</div>
	);
}
