import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Download,
	Edit2,
	Plus,
	Trash2,
	TrendingDown,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiBase } from "@/lib/api-base";
import { unwrapList } from "@/lib/unwrap-list";

const BASE = getApiBase();
const ah = () => {
	const t = localStorage.getItem("auth_token");
	return {
		"Content-Type": "application/json",
		...(t ? { Authorization: `Bearer ${t}` } : {}),
	};
};

function fmtKgs(v: string | number) {
	const n = parseFloat(String(v));
	return (
		`${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(
			n || 0,
		)} с`
	);
}

const CATEGORIES = [
	"Фундамент",
	"Монолит / каркас",
	"Кровля",
	"Фасад",
	"Внутренние работы",
	"Электрика",
	"Сантехника",
	"Отделка",
	"Благоустройство",
	"Проектирование",
	"Стройматериалы",
	"Зарплата",
	"Аренда техники",
	"Непредвиденные расходы",
	"Прочее",
];
const CURRENCIES = ["KGS", "USD", "EUR", "RUB", "CNY"];
const RATE_SOURCES = [
	{ value: "nbkr", label: "НБКР" },
	{ value: "optima", label: "Optima Bank" },
	{ value: "rsb", label: "RSB Bank" },
	{ value: "bakai", label: "Bakai Bank" },
	{ value: "dobank", label: "Dos-Credit Bank" },
	{ value: "mbank", label: "MBank" },
	{ value: "manual", label: "Вручную" },
];

interface BudgetItem {
	id: number;
	projectId: number;
	stageId?: number;
	category: string;
	name: string;
	plannedAmount: string;
	actualAmount: string;
	currency: string;
	exchangeRateSource: string;
	exchangeRate?: string;
	notes?: string;
}
interface Project {
	id: number;
	name: string;
}
interface Stage {
	id: number;
	name: string;
	projectId: number;
}

function BudgetDialog({
	item,
	projects,
	stages,
	onClose,
	onSaved,
}: {
	item: BudgetItem | null | "new";
	projects: Project[];
	stages: Stage[];
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const isEdit = item && item !== "new";
	const init = isEdit ? (item as BudgetItem) : null;
	const [form, setForm] = useState({
		projectId: String(init?.projectId || projects[0]?.id || ""),
		stageId: String(init?.stageId || "none"),
		category: init?.category || CATEGORIES[0],
		name: init?.name || "",
		plannedAmount: init?.plannedAmount || "",
		actualAmount: init?.actualAmount || "",
		currency: init?.currency || "KGS",
		exchangeRateSource: init?.exchangeRateSource || "nbkr",
		exchangeRate: init?.exchangeRate || "1",
		notes: init?.notes || "",
	});
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
	const filteredStages = stages.filter(
		(s) => s.projectId === parseInt(form.projectId, 10),
	);

	const planned = parseFloat(form.plannedAmount || "0");
	const rate = parseFloat(form.exchangeRate || "1");
	const plannedKgs = form.currency === "KGS" ? planned : planned * rate;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.name || !form.projectId) {
			toast({ title: "Заполните обязательные поля", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const url = isEdit
				? `${BASE}/construction/budget/${init?.id}`
				: `${BASE}/construction/budget`;
			await fetch(url, {
				method: isEdit ? "PATCH" : "POST",
				headers: ah(),
				body: JSON.stringify({
					...form,
					projectId: parseInt(form.projectId, 10),
					stageId: form.stageId && form.stageId !== "none" ? parseInt(form.stageId, 10) : null,
				}),
			});
			toast({ title: isEdit ? "Позиция обновлена" : "Позиция добавлена" });
			onSaved();
			onClose();
		} catch {
			toast({ title: "Ошибка", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Редактировать статью" : "Добавить статью бюджета"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Проект *</Label>
							<Select
								value={form.projectId}
								onValueChange={(v) => set("projectId", v)}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
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
						<div>
							<Label>Этап</Label>
							<Select
								value={form.stageId}
								onValueChange={(v) => set("stageId", v)}
							>
								<SelectTrigger className="mt-1">
									<SelectValue placeholder="Весь проект" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Весь проект</SelectItem>
									{filteredStages.map((s) => (
										<SelectItem key={s.id} value={String(s.id)}>
											{s.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Категория *</Label>
							<Select
								value={form.category}
								onValueChange={(v) => set("category", v)}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CATEGORIES.map((c) => (
										<SelectItem key={c} value={c}>
											{c}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Название статьи *</Label>
							<Input
								className="mt-1"
								value={form.name}
								onChange={(e) => set("name", e.target.value)}
								required
							/>
						</div>
						<div>
							<Label>Плановая сумма</Label>
							<Input
								className="mt-1"
								type="number"
								min="0"
								value={form.plannedAmount}
								onChange={(e) => set("plannedAmount", e.target.value)}
							/>
						</div>
						<div>
							<Label>Валюта</Label>
							<Select
								value={form.currency}
								onValueChange={(v) => set("currency", v)}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CURRENCIES.map((c) => (
										<SelectItem key={c} value={c}>
											{c}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{form.currency !== "KGS" && (
							<>
								<div>
									<Label>Источник курса</Label>
									<Select
										value={form.exchangeRateSource}
										onValueChange={(v) => set("exchangeRateSource", v)}
									>
										<SelectTrigger className="mt-1">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{RATE_SOURCES.map((r) => (
												<SelectItem key={r.value} value={r.value}>
													{r.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label>Курс к KGS</Label>
									<Input
										className="mt-1"
										type="number"
										step="0.0001"
										value={form.exchangeRate}
										onChange={(e) => set("exchangeRate", e.target.value)}
									/>
								</div>
							</>
						)}
					</div>
					{plannedKgs > 0 && form.currency !== "KGS" && (
						<div className="bg-blue-50 p-2.5 rounded-lg text-sm text-blue-700 font-medium">
							≈ {fmtKgs(plannedKgs)} (по курсу {form.exchangeRate})
						</div>
					)}
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

export default function ConstructionBudget() {
	const qc = useQueryClient();
	const { toast } = useToast();
	const [dialog, setDialog] = useState<BudgetItem | null | "new">(null);
	const [projectFilter, setProjectFilter] = useState("all");

	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const { data: stages = [] } = useQuery<Stage[]>({
		queryKey: ["construction-stages"],
		queryFn: () => api.get("/construction/stages").then((r) => r.data),
	});
	const { data: items = [], isLoading } = useQuery<BudgetItem[]>({
		queryKey: ["construction-budget", projectFilter],
		queryFn: () =>
			api
				.get(
					projectFilter === "all"
						? "/construction/budget"
						: `/construction/budget?projectId=${projectFilter}`,
				)
				.then((r) => unwrapList<BudgetItem>(r.data)),
	});

	const totalPlanned = items.reduce(
		(s, i) => s + parseFloat(i.plannedAmount),
		0,
	);
	const totalActual = items.reduce(
		(s, i) => s + parseFloat(i.actualAmount || "0"),
		0,
	);
	const diff = totalPlanned - totalActual;

	const handleDelete = async (id: number) => {
		if (!confirm("Удалить статью?")) return;
		await fetch(`${BASE}/construction/budget/${id}`, {
			method: "DELETE",
			headers: ah(),
		});
		toast({ title: "Удалено" });
		qc.invalidateQueries({ queryKey: ["construction-budget"] });
	};

	const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

	// Group by category
	const grouped = items.reduce(
		(acc, item) => {
			if (!acc[item.category]) acc[item.category] = [];
			acc[item.category].push(item);
			return acc;
		},
		{} as Record<string, BudgetItem[]>,
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Бюджет строительства
					</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Плановые и фактические затраты
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => {
							if (projectFilter === "all") {
								toast({
									title: "Выберите проект",
									description:
										"Для экспорта необходимо выбрать конкретный проект",
									variant: "destructive",
								});
								return;
							}
							window.open(
								`${BASE}/construction/projects/${projectFilter}/reports/budget/excel`,
								"_blank",
							);
						}}
						className="gap-2"
					>
						<Download className="w-4 h-4" /> Экспорт Excel
					</Button>
					<Button
						onClick={() => setDialog("new")}
						className="bg-amber-500 hover:bg-orange-600 gap-2"
					>
						<Plus className="w-4 h-4" /> Добавить статью
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-3 gap-4">
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
						<Wallet className="w-3.5 h-3.5" /> Плановый бюджет
					</p>
					<p className="text-xl font-bold text-blue-600">
						{fmtKgs(totalPlanned)}
					</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
						<TrendingDown className="w-3.5 h-3.5" /> Фактические расходы
					</p>
					<p className="text-xl font-bold text-amber-600">
						{fmtKgs(totalActual)}
					</p>
				</div>
				<div
					className={`rounded-xl border p-4 ${diff >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}
				>
					<p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
						<TrendingUp className="w-3.5 h-3.5" /> Остаток
					</p>
					<p
						className={`text-xl font-bold ${diff >= 0 ? "text-emerald-600" : "text-rose-600"}`}
					>
						{fmtKgs(diff)}
					</p>
				</div>
			</div>

			<div className="flex gap-2 flex-wrap">
				<button
					onClick={() => setProjectFilter("all")}
					className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${projectFilter === "all" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
				>
					Все
				</button>
				{projects.map((p) => (
					<button
						key={p.id}
						onClick={() => setProjectFilter(String(p.id))}
						className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${projectFilter === String(p.id) ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
					>
						{p.name}
					</button>
				))}
			</div>

			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				{isLoading ? (
					<div className="p-4">
						<Skeleton className="h-48 w-full" />
					</div>
				) : items.length === 0 ? (
					<div className="text-center py-12 text-gray-400">
						<Wallet className="w-10 h-10 mx-auto mb-2 opacity-20" />
						<p>Бюджет не задан</p>
					</div>
				) : (
					Object.entries(grouped).map(([cat, catItems]) => {
						const catPlanned = catItems.reduce(
							(s, i) => s + parseFloat(i.plannedAmount),
							0,
						);
						const catActual = catItems.reduce(
							(s, i) => s + parseFloat(i.actualAmount || "0"),
							0,
						);
						return (
							<div key={cat}>
								<div className="px-5 py-2 bg-gray-50 border-y border-gray-100 flex justify-between items-center">
									<span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
										{cat}
									</span>
									<span className="text-xs text-gray-400">
										План: {fmtKgs(catPlanned)} · Факт: {fmtKgs(catActual)}
									</span>
								</div>
								<Table>
									<TableBody>
										{catItems.map((item) => {
											const plan = parseFloat(item.plannedAmount);
											const act = parseFloat(item.actualAmount || "0");
											const pct =
												plan > 0 ? Math.min(100, (act / plan) * 100) : 0;
											return (
												<TableRow key={item.id} className="hover:bg-gray-50">
													<TableCell>
														<p className="text-sm font-medium text-gray-900">
															{item.name}
														</p>
														{projectFilter === "all" && (
															<p className="text-xs text-gray-400">
																{projectMap[item.projectId]}
															</p>
														)}
													</TableCell>
													<TableCell className="text-right text-sm text-gray-700 font-medium">
														{fmtKgs(plan)}
													</TableCell>
													<TableCell className="text-right text-sm text-amber-600">
														{fmtKgs(act)}
													</TableCell>
													<TableCell className="w-32">
														<div className="flex items-center gap-2">
															<div className="flex-1 h-1.5 bg-gray-100 rounded-full">
																<div
																	className={`h-full rounded-full ${pct > 100 ? "bg-rose-600" : pct > 80 ? "bg-yellow-400" : "bg-emerald-600"}`}
																	style={{ width: `${Math.min(100, pct)}%` }}
																/>
															</div>
															<span className="text-xs text-gray-400 w-8 text-right">
																{pct.toFixed(0)}%
															</span>
														</div>
													</TableCell>
													<TableCell>
														<div className="flex gap-1 justify-end">
															<Button
																size="sm"
																variant="ghost"
																className="h-7 w-7 p-0"
																onClick={() => setDialog(item)}
															>
																<Edit2 className="w-3.5 h-3.5 text-gray-400" />
															</Button>
															<Button
																size="sm"
																variant="ghost"
																className="h-7 w-7 p-0"
																onClick={() =>
																	handleDelete(item.id)
																}
															>
																<Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-rose-600" />
															</Button>
														</div>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
						);
					})
				)}
			</div>

			<BudgetDialog
				item={dialog}
				projects={projects}
				stages={stages}
				onClose={() => setDialog(null)}
				onSaved={() =>
					qc.invalidateQueries({ queryKey: ["construction-budget"] })
				}
			/>
		</div>
	);
}
