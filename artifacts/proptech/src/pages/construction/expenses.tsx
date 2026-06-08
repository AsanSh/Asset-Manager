import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt, Trash2, TrendingDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useSearch } from "wouter";
import { DataTable } from "@/components/data-table";
import { defaultPeriod, inPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
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
import { flattenWbsTree } from "@/features/construction-wbs/tree";
import type { WbsStage } from "@/features/construction-wbs/types";
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

function fmtKgs(v: string | number) {
	return (
		`${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(
			parseFloat(String(v)) || 0,
		)} сом`
	);
}

const CATS = [
	"Монолит / каркас",
	"Фундамент",
	"Кровля",
	"Фасад",
	"Внутренние работы",
	"Электрика",
	"Сантехника",
	"Отделка",
	"Благоустройство",
	"Стройматериалы",
	"Зарплата",
	"Аренда техники",
	"Проектирование",
	"Прочее",
];
const CURRENCIES = ["KGS", "USD", "EUR", "RUB", "CNY"];
const RATE_SOURCES = [
	{ value: "nbkr", label: "НБКР" },
	{ value: "optima", label: "Optima Bank" },
	{ value: "rsb", label: "RSB Bank" },
	{ value: "bakai", label: "Bakai Bank" },
	{ value: "dobank", label: "Dos-Credit" },
	{ value: "mbank", label: "MBank" },
	{ value: "manual", label: "Вручную" },
];
const PAY_METHODS = [
	{ value: "cash", label: "Наличные" },
	{ value: "transfer", label: "Перевод" },
	{ value: "card", label: "Карта" },
	{ value: "check", label: "Чек" },
];

interface Expense {
	id: number;
	projectId: number;
	stageId?: number;
	budgetItemId?: number;
	category: string;
	description: string;
	amount: string;
	currency: string;
	exchangeRateSource: string;
	exchangeRate?: string;
	amountKgs?: string;
	contractorId?: number;
	date: string;
	paymentMethod: string;
	status: string;
	notes?: string;
	contractorName?: string;
	projectName?: string;
	stageName?: string;
	createdAt: string;
}
interface Project {
	id: number;
	name: string;
}
interface Contractor {
	id: number;
	fullName: string;
}
interface BudgetItem {
	id: number;
	projectId: number;
	stageId?: number | null;
	name: string;
	category: string;
}

function expenseFormInit(expense: Expense | null, projects: Project[]) {
	const row = expense;
	return {
		projectId: String(row?.projectId || projects[0]?.id || ""),
		stageId: row?.stageId != null ? String(row.stageId) : "",
		budgetItemId: row?.budgetItemId != null ? String(row.budgetItemId) : "none",
		miscCategory: row?.stageId == null && row?.budgetItemId == null ? row?.category || CATS[CATS.length - 1] : "",
		description: row?.description || "",
		amount: row?.amount || "",
		currency: row?.currency || "KGS",
		exchangeRateSource: row?.exchangeRateSource || "nbkr",
		exchangeRate: row?.exchangeRate || "1",
		contractorId: String(row?.contractorId || "none"),
		date: row?.date || new Date().toISOString().split("T")[0],
		paymentMethod: row?.paymentMethod || "cash",
		notes: row?.notes || "",
	};
}

function ExpenseDialog({
	expense,
	projects,
	contractors,
	onClose,
	onSaved,
}: {
	expense: Expense | null | "new";
	projects: Project[];
	contractors: Contractor[];
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const isEdit = expense && expense !== "new";
	const init = isEdit ? (expense as Expense) : null;
	const [form, setForm] = useState(() => expenseFormInit(init, projects));
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	useEffect(() => {
		if (!expense) return;
		const row = expense === "new" ? null : expense;
		setForm(expenseFormInit(row, projects));
	}, [expense, projects]);

	const { data: projectStages = [] } = useQuery<WbsStage[]>({
		queryKey: ["construction-stages", form.projectId],
		enabled: !!form.projectId,
		queryFn: () =>
			api
				.get("/construction/stages", { params: { projectId: form.projectId } })
				.then((r) => (Array.isArray(r.data) ? r.data : [])),
	});

	const { data: budgetItems = [] } = useQuery<BudgetItem[]>({
		queryKey: ["construction-budget", form.projectId],
		enabled: !!form.projectId,
		queryFn: () =>
			api
				.get("/construction/budget", { params: { projectId: form.projectId } })
				.then((r) => (Array.isArray(r.data) ? r.data : [])),
	});

	const stageOptions = useMemo(
		() => flattenWbsTree(projectStages, new Map()),
		[projectStages],
	);

	const budgetForStage = useMemo(() => {
		if (!form.stageId) return budgetItems;
		const sid = Number(form.stageId);
		return budgetItems.filter((b) => Number(b.stageId) === sid);
	}, [budgetItems, form.stageId]);

	useEffect(() => {
		if (!form.projectId || isEdit) return;
		if (stageOptions.length > 0 && !form.stageId) {
			setForm((p) => ({ ...p, stageId: String(stageOptions[0].id), miscCategory: "" }));
		}
	}, [form.projectId, stageOptions, isEdit, form.stageId]);

	useEffect(() => {
		if (form.budgetItemId === "none") return;
		const item = budgetItems.find((b) => String(b.id) === form.budgetItemId);
		if (item?.stageId != null && String(item.stageId) !== form.stageId) {
			setForm((p) => ({ ...p, stageId: String(item.stageId) }));
		}
	}, [form.budgetItemId, form.stageId, budgetItems]);

	const amount = parseFloat(form.amount || "0");
	const rate = parseFloat(form.exchangeRate || "1");
	const amountKgs = form.currency === "KGS" ? amount : amount * rate;

	const resolveStagePayload = () => {
		if (stageOptions.length === 0) {
			return {
				stageId: null as number | null,
				budgetItemId: null as number | null,
				category: form.miscCategory || CATS[CATS.length - 1],
			};
		}
		const stageId = form.stageId ? parseInt(form.stageId, 10) : null;
		const stage = projectStages.find((s) => s.id === stageId);
		const budgetItemId =
			form.budgetItemId !== "none" ? parseInt(form.budgetItemId, 10) : null;
		const item = budgetItemId
			? budgetItems.find((b) => b.id === budgetItemId)
			: null;
		const category =
			item?.name || item?.category || stage?.name || "Этап WBS";
		return { stageId, budgetItemId, category };
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.description || !form.amount || !form.projectId) {
			toast({ title: "Заполните обязательные поля", variant: "destructive" });
			return;
		}
		if (stageOptions.length > 0 && !form.stageId) {
			toast({
				title: "Выберите этап WBS",
				description: "Расход привязывается к этапу — освоение попадёт в Гант и план проекта. Статья бюджета опциональна.",
				variant: "destructive",
			});
			return;
		}
		const { stageId, budgetItemId, category } = resolveStagePayload();
		setLoading(true);
		try {
			const url = isEdit
				? `${BASE}/construction/expenses/${init?.id}`
				: `${BASE}/construction/expenses`;
			const res = await fetch(url, {
				method: isEdit ? "PATCH" : "POST",
				headers: ah(),
				body: JSON.stringify({
					projectId: parseInt(form.projectId, 10),
					stageId,
					budgetItemId,
					category,
					description: form.description,
					amount: form.amount,
					currency: form.currency,
					exchangeRateSource: form.exchangeRateSource,
					exchangeRate: form.exchangeRate,
					contractorId:
						form.contractorId && form.contractorId !== "none"
							? parseInt(form.contractorId, 10)
							: null,
					date: form.date,
					paymentMethod: form.paymentMethod,
					notes: form.notes,
				}),
			});
			if (!res.ok) throw new Error("save failed");
			toast({ title: isEdit ? "Расход обновлён" : "Расход добавлен" });
			onSaved();
			onClose();
		} catch {
			toast({ title: "Ошибка", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={!!expense} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Редактировать расход" : "Добавить расход"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Проект *</Label>
							<Select
								value={form.projectId}
								onValueChange={(v) => set("projectId", v)}
							>
								<SelectTrigger className="mt-auto">
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
						{stageOptions.length === 0 ? (
							<div className="flex flex-col sm:col-span-2">
								<Label className="leading-tight mb-1.5">Категория</Label>
								<Select
									value={form.miscCategory || CATS[CATS.length - 1]}
									onValueChange={(v) => set("miscCategory", v)}
								>
									<SelectTrigger className="mt-auto">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{CATS.map((c) => (
											<SelectItem key={c} value={c}>
												{c}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-[10px] text-gray-600 mt-1">
									В проекте нет этапов WBS — расход не попадёт в Гант
								</p>
							</div>
						) : (
							<>
								<div className="flex flex-col sm:col-span-2">
									<Label className="leading-tight mb-1.5">Этап WBS *</Label>
									<Select
										value={form.stageId || undefined}
										onValueChange={(v) =>
											setForm((p) => ({
												...p,
												stageId: v,
												budgetItemId: "none",
											}))
										}
									>
										<SelectTrigger className="mt-auto">
											<SelectValue placeholder="Этап для Ганта и освоения" />
										</SelectTrigger>
										<SelectContent>
											{stageOptions.map((node) => (
												<SelectItem key={node.id} value={String(node.id)}>
													<span style={{ paddingLeft: node.depth * 12 }}>
														{node.wbsCode} · {node.stage.name}
													</span>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="flex flex-col sm:col-span-2">
									<Label className="leading-tight mb-1.5">Статья бюджета</Label>
									<Select
										value={form.budgetItemId}
										onValueChange={(v) => set("budgetItemId", v)}
									>
										<SelectTrigger className="mt-auto">
											<SelectValue placeholder="Необязательно" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">— без статьи —</SelectItem>
											{budgetForStage.map((item) => (
												<SelectItem key={item.id} value={String(item.id)}>
													{item.name}
													{item.category ? ` (${item.category})` : ""}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<p className="text-[10px] text-gray-600 mt-1">
										Этап — для WBS и Ганта; статья — детализация в бюджете проекта
									</p>
								</div>
							</>
						)}
						<div className="sm:col-span-2 flex flex-col">
							<Label className="leading-tight mb-1.5">Описание *</Label>
							<Input
								className="mt-auto"
								value={form.description}
								onChange={(e) => set("description", e.target.value)}
								required
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Сумма *</Label>
							<Input
								className="mt-auto"
								type="number"
								min="0"
								step="0.01"
								value={form.amount}
								onChange={(e) => set("amount", e.target.value)}
								required
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Валюта</Label>
							<Select
								value={form.currency}
								onValueChange={(v) => set("currency", v)}
							>
								<SelectTrigger className="mt-auto">
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
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Подрядчик</Label>
							<Select
								value={form.contractorId}
								onValueChange={(v) => set("contractorId", v)}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue placeholder="Не указан" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Не указан</SelectItem>
									{contractors.map((c) => (
										<SelectItem key={c.id} value={String(c.id)}>
											{c.fullName}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Способ оплаты</Label>
							<Select
								value={form.paymentMethod}
								onValueChange={(v) => set("paymentMethod", v)}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PAY_METHODS.map((m) => (
										<SelectItem key={m.value} value={m.value}>
											{m.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="sm:col-span-2 flex flex-col">
							<Label className="leading-tight mb-1.5">Дата</Label>
							<Input
								className="mt-auto"
								type="date"
								value={form.date}
								onChange={(e) => set("date", e.target.value)}
							/>
						</div>
					</div>
					{amountKgs > 0 && form.currency !== "KGS" && (
						<div className="bg-amber-50 p-2.5 rounded-lg text-sm text-amber-700 font-medium">
							≈ {fmtKgs(amountKgs)}
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

export default function ConstructionExpenses() {
	const qc = useQueryClient();
	const { toast } = useToast();
	const urlSearch = useSearch();
	const urlParams = useMemo(() => new URLSearchParams(urlSearch), [urlSearch]);
	const initialProject = urlParams.get("projectId") || "all";
	const initialStageId = urlParams.get("stageId");

	const [dialog, setDialog] = useState<Expense | null | "new">(null);

	useEffect(() => {
		if (urlParams.get("create") === "1") setDialog("new");
	}, [urlParams]);
	const [projectFilter, setProjectFilter] = useState(initialProject);
	const [stageFilter, setStageFilter] = useState<string>(initialStageId || "all");
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());

	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const { data: contractors = [] } = useQuery<Contractor[]>({
		queryKey: ["construction-contractors"],
		queryFn: () => api.get("/construction/contractors").then((r) => r.data),
	});
	const { data: expenses = [], isLoading } = useQuery<Expense[]>({
		queryKey: ["construction-expenses", projectFilter],
		queryFn: () =>
			api
				.get("/construction/expenses", {
					params:
						projectFilter !== "all" ? { projectId: projectFilter } : undefined,
				})
				.then((r) => r.data),
	});

	const expensesArray = Array.isArray(expenses) ? expenses : [];
	const filteredExpenses = expensesArray.filter((e) => {
		if (!inPeriod(e.date, period)) return false;
		if (stageFilter !== "all" && String(e.stageId ?? "") !== stageFilter) return false;
		return true;
	});
	const projectsArray = Array.isArray(projects) ? projects : [];
	const totalKgs = filteredExpenses.reduce(
		(s, e) => s + parseFloat(e.amountKgs || e.amount),
		0,
	);

	const handleDelete = async (id: number) => {
		if (!confirm("Удалить расход?")) return;
		await fetch(`${BASE}/construction/expenses/${id}`, {
			method: "DELETE",
			headers: ah(),
		});
		toast({ title: "Удалено" });
		qc.invalidateQueries({ queryKey: ["construction-expenses"] });
		qc.invalidateQueries({ queryKey: ["construction-stages"] });
	};

	const handleSaved = () => {
		qc.invalidateQueries({ queryKey: ["construction-expenses"] });
		qc.invalidateQueries({ queryKey: ["construction-stages"] });
	};

	const { data: filterStages = [] } = useQuery<WbsStage[]>({
		queryKey: ["construction-stages", projectFilter],
		enabled: projectFilter !== "all",
		queryFn: () =>
			api
				.get("/construction/stages", { params: { projectId: projectFilter } })
				.then((r) => (Array.isArray(r.data) ? r.data : [])),
	});

	const RATE_LABELS: Record<string, string> = Object.fromEntries(
		RATE_SOURCES.map((r) => [r.value, r.label]),
	);

	const columns = useMemo<ColumnDef<any, unknown>[]>(
		() => [
			{
				accessorKey: "date",
				header: "Дата",
				size: 110,
				meta: { exportLabel: "Дата" },
				cell: ({ row }) => (
					<span className="text-sm text-gray-600 whitespace-nowrap">
						{new Date(row.original.date).toLocaleDateString("ru-KG")}
					</span>
				),
			},
			{
				id: "project",
				header: "Проект",
				size: 130,
				accessorFn: (row: any) => row.projectName || `#${row.projectId}`,
				meta: { exportLabel: "Проект" },
				cell: ({ getValue }) => (
					<span className="text-xs text-gray-500 truncate block max-w-[140px]">
						{getValue() as string}
					</span>
				),
			},
			{
				id: "stage",
				header: "Этап WBS",
				size: 160,
				accessorFn: (row: Expense) => row.stageName || row.category,
				meta: { exportLabel: "Этап WBS" },
				cell: ({ row }) => (
					<span className="text-xs text-gray-700 truncate block max-w-[160px]">
						{row.original.stageName ? (
							<Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-800">
								{row.original.stageName}
							</Badge>
						) : (
							<span className="text-amber-600">{row.original.category}</span>
						)}
					</span>
				),
			},
			{
				accessorKey: "description",
				header: "Описание",
				size: 180,
				meta: { exportLabel: "Описание" },
				cell: ({ row }) => (
					<span className="text-sm text-gray-800 truncate block max-w-[180px]">
						{row.original.description}
					</span>
				),
			},
			{
				id: "contractor",
				header: "Подрядчик",
				size: 130,
				accessorFn: (row: any) => row.contractorName || "—",
				meta: { exportLabel: "Подрядчик" },
				cell: ({ getValue }) => (
					<span className="text-xs text-gray-500">{getValue() as string}</span>
				),
			},
			{
				id: "amount",
				header: "Сумма",
				size: 130,
				accessorFn: (row: any) => parseFloat(row.amount || "0"),
				meta: { exportLabel: "Сумма", align: "right" },
				cell: ({ row }) => (
					<span className="text-sm font-medium text-gray-800 whitespace-nowrap font-mono">
						{parseFloat(row.original.amount).toLocaleString("ru-KG")}{" "}
						{row.original.currency}
					</span>
				),
			},
			{
				id: "amountKgs",
				header: "В KGS",
				size: 130,
				accessorFn: (row: any) =>
					parseFloat(row.amountKgs || row.amount || "0"),
				meta: { exportLabel: "Сумма (сом)", align: "right" },
				cell: ({ row }) => (
					<span className="text-sm font-semibold text-rose-600 whitespace-nowrap font-mono">
						{fmtKgs(row.original.amountKgs || row.original.amount)}
					</span>
				),
			},
			{
				id: "rate",
				header: "Курс",
				size: 100,
				accessorFn: (row: any) =>
					row.currency !== "KGS"
						? RATE_LABELS[row.exchangeRateSource] || row.exchangeRateSource
						: "—",
				meta: { exportLabel: "Курс" },
				cell: ({ getValue }) => (
					<span className="text-xs text-gray-600">{getValue() as string}</span>
				),
			},
			{
				id: "__actions",
				header: "Удалить",
				size: 80,
				enableSorting: false,
				meta: { align: "center" },
				cell: ({ row }) => (
					<Button
						size="sm"
						variant="ghost"
						className="h-7 w-7 p-0"
						onClick={() => handleDelete(row.original.id)}
					>
						<Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-rose-600" />
					</Button>
				),
			},
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[RATE_LABELS],
	);

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Расходы строительства
					</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Фактические затраты по проектам · ⌘⇧Z — новый расход
					</p>
				</div>
				<Button
					onClick={() => setDialog("new")}
					className="bg-amber-500 hover:bg-orange-600 gap-2"
				>
					<Plus className="w-4 h-4" /> Добавить расход
				</Button>
			</div>

			<PeriodPicker value={period} onChange={setPeriod} />

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Всего расходов</p>
					<p className="text-2xl font-bold text-amber-600">
						{filteredExpenses.length}
					</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4 sm:col-span-2">
					<p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
						<TrendingDown className="w-3.5 h-3.5" /> Общая сумма в KGS
					</p>
					<p className="text-xl font-bold text-rose-600">{fmtKgs(totalKgs)}</p>
				</div>
			</div>

			<div className="flex gap-2 flex-wrap">
				<button
					onClick={() => setProjectFilter("all")}
					className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${projectFilter === "all" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
				>
					Все
				</button>
				{projectsArray.map((p) => (
					<button
						key={p.id}
						onClick={() => {
							setProjectFilter(String(p.id));
							setStageFilter("all");
						}}
						className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${projectFilter === String(p.id) ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
					>
						{p.name}
					</button>
				))}
			</div>

			{projectFilter !== "all" && filterStages.length > 0 && (
				<div className="flex gap-2 flex-wrap items-center">
					<span className="text-xs text-gray-600">Этап:</span>
					<button
						onClick={() => setStageFilter("all")}
						className={`px-2.5 py-1 rounded-full text-xs ${stageFilter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"}`}
					>
						Все
					</button>
					{filterStages.map((s) => (
						<button
							key={s.id}
							onClick={() => setStageFilter(String(s.id))}
							className={`px-2.5 py-1 rounded-full text-xs max-w-[200px] truncate ${stageFilter === String(s.id) ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"}`}
						>
							{s.name}
						</button>
					))}
				</div>
			)}

			<DataTable
				tableId="construction-expenses"
				columns={columns}
				data={filteredExpenses}
				isLoading={isLoading}
				initialSorting={[{ id: "date", desc: true }]}
				emptyState={
					<div className="flex flex-col items-center gap-2">
						<Receipt className="w-10 h-10 text-gray-200" />
						<span>Расходов нет</span>
					</div>
				}
			/>

			<ExpenseDialog
				expense={dialog}
				projects={projects}
				contractors={contractors}
				onClose={() => setDialog(null)}
				onSaved={handleSaved}
			/>
		</div>
	);
}
