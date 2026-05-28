import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt, Trash2, TrendingDown } from "lucide-react";
import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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
	const [form, setForm] = useState({
		projectId: String(init?.projectId || projects[0]?.id || ""),
		category: init?.category || CATS[0],
		description: init?.description || "",
		amount: init?.amount || "",
		currency: init?.currency || "KGS",
		exchangeRateSource: init?.exchangeRateSource || "nbkr",
		exchangeRate: init?.exchangeRate || "1",
		contractorId: String(init?.contractorId || "none"),
		date: init?.date || new Date().toISOString().split("T")[0],
		paymentMethod: init?.paymentMethod || "cash",
		notes: init?.notes || "",
	});
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	const amount = parseFloat(form.amount || "0");
	const rate = parseFloat(form.exchangeRate || "1");
	const amountKgs = form.currency === "KGS" ? amount : amount * rate;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.description || !form.amount || !form.projectId) {
			toast({ title: "Заполните обязательные поля", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const url = isEdit
				? `${BASE}/construction/expenses/${init?.id}`
				: `${BASE}/construction/expenses`;
			await fetch(url, {
				method: isEdit ? "PATCH" : "POST",
				headers: ah(),
				body: JSON.stringify({
					...form,
					projectId: parseInt(form.projectId, 10),
					contractorId: form.contractorId && form.contractorId !== "none" ? parseInt(form.contractorId, 10) : null,
				}),
			});
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
							<Label>Категория *</Label>
							<Select
								value={form.category}
								onValueChange={(v) => set("category", v)}
							>
								<SelectTrigger className="mt-1">
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
						</div>
						<div className="col-span-2">
							<Label>Описание *</Label>
							<Input
								className="mt-1"
								value={form.description}
								onChange={(e) => set("description", e.target.value)}
								required
							/>
						</div>
						<div>
							<Label>Сумма *</Label>
							<Input
								className="mt-1"
								type="number"
								min="0"
								step="0.01"
								value={form.amount}
								onChange={(e) => set("amount", e.target.value)}
								required
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
						<div>
							<Label>Подрядчик</Label>
							<Select
								value={form.contractorId}
								onValueChange={(v) => set("contractorId", v)}
							>
								<SelectTrigger className="mt-1">
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
						<div>
							<Label>Способ оплаты</Label>
							<Select
								value={form.paymentMethod}
								onValueChange={(v) => set("paymentMethod", v)}
							>
								<SelectTrigger className="mt-1">
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
						<div className="col-span-2">
							<Label>Дата</Label>
							<Input
								className="mt-1"
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
	const [dialog, setDialog] = useState<Expense | null | "new">(null);
	const [projectFilter, setProjectFilter] = useState("all");
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
	const filteredExpenses = expensesArray.filter((e) => inPeriod(e.date, period));
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
	};

	const RATE_LABELS: Record<string, string> = Object.fromEntries(
		RATE_SOURCES.map((r) => [r.value, r.label]),
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Расходы строительства
					</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Фактические затраты по проектам
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

			<div className="grid grid-cols-3 gap-4">
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Всего расходов</p>
					<p className="text-2xl font-bold text-amber-600">
						{filteredExpenses.length}
					</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2">
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
						onClick={() => setProjectFilter(String(p.id))}
						className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${projectFilter === String(p.id) ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
					>
						{p.name}
					</button>
				))}
			</div>

			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							<TableHead>Дата</TableHead>
							<TableHead>Проект</TableHead>
							<TableHead>Категория</TableHead>
							<TableHead>Описание</TableHead>
							<TableHead>Подрядчик</TableHead>
							<TableHead className="text-right">Сумма</TableHead>
							<TableHead className="text-right">В KGS</TableHead>
							<TableHead>Курс</TableHead>
							<TableHead className="text-center">Удалить</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 9 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : filteredExpenses.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={9}
									className="text-center py-12 text-gray-400"
								>
									<Receipt className="w-10 h-10 mx-auto mb-2 opacity-20" />
									<p>Расходов нет</p>
								</TableCell>
							</TableRow>
						) : (
							filteredExpenses.map((e) => (
								<TableRow key={e.id} className="hover:bg-gray-50">
									<TableCell className="text-sm text-gray-600 whitespace-nowrap">
										{new Date(e.date).toLocaleDateString("ru-KG")}
									</TableCell>
									<TableCell className="text-xs text-gray-500 max-w-[100px] truncate">
										{e.projectName || `#${e.projectId}`}
									</TableCell>
									<TableCell>
										<Badge
											variant="secondary"
											className="text-[10px] bg-amber-50 text-amber-700"
										>
											{e.category}
										</Badge>
									</TableCell>
									<TableCell className="text-sm text-gray-800 max-w-[150px] truncate">
										{e.description}
									</TableCell>
									<TableCell className="text-xs text-gray-500">
										{e.contractorName || "—"}
									</TableCell>
									<TableCell className="text-right text-sm font-medium text-gray-800 whitespace-nowrap">
										{parseFloat(e.amount).toLocaleString("ru-KG")} {e.currency}
									</TableCell>
									<TableCell className="text-right text-sm font-semibold text-rose-600 whitespace-nowrap">
										{fmtKgs(e.amountKgs || e.amount)}
									</TableCell>
									<TableCell className="text-xs text-gray-400">
										{e.currency !== "KGS"
											? RATE_LABELS[e.exchangeRateSource] ||
												e.exchangeRateSource
											: "—"}
									</TableCell>
									<TableCell className="text-center">
										<Button
											size="sm"
											variant="ghost"
											className="h-7 w-7 p-0"
											onClick={() => handleDelete(e.id)}
										>
											<Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-rose-600" />
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<ExpenseDialog
				expense={dialog}
				projects={projects}
				contractors={contractors}
				onClose={() => setDialog(null)}
				onSaved={() =>
					qc.invalidateQueries({ queryKey: ["construction-expenses"] })
				}
			/>
		</div>
	);
}
