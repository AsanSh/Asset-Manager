import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeftRight,
	Download,
	Filter,
	Search,
	TrendingDown,
	TrendingUp,
	Upload,
	X,
} from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/unwrap-list";

const RATE_SOURCES = ["НБКР", "Optima", "RSB", "Bakai", "DoBank", "MBank"];
const CATEGORIES_INCOME = [
	"Платёж по договору",
	"Первоначальный взнос",
	"Аванс покупателя",
	"Инвестиции",
	"Возврат от поставщика",
	"Перевод между счетами",
	"Прочие доходы",
];
const CATEGORIES_EXPENSE = [
	"Строительство",
	"Зарплата бригады",
	"Подрядчики",
	"Материалы",
	"Аренда техники",
	"OPEX",
	"Налоги и взносы",
	"Документация",
	"Земельный участок",
	"Займы другим проектам",
	"Подотчёт",
	"Прочие расходы",
];

function fmt(n: any) {
	const v = parseFloat(n);
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-RU").format(v);
}

function relDate(d: string) {
	if (!d) return "—";
	const today = new Date().toISOString().slice(0, 10);
	const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
	if (d === today) return "Сегодня";
	if (d === yest) return "Вчера";
	return d;
}

export default function ConstructionOperations() {
	const qc = useQueryClient();
	const [panelType, setPanelType] = useState<
		"income" | "expense" | "transfer" | null
	>(null);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [search, setSearch] = useState("");
	const [filterType, setFilterType] = useState<
		"all" | "month" | "income" | "expense" | "transfer"
	>("month");
	const [form, setForm] = useState({
		type: "expense" as "income" | "expense" | "transfer",
		category: "",
		description: "",
		date: new Date().toISOString().slice(0, 10),
		amount: "",
		currency: "KGS",
		exchangeRateSource: "НБКР",
		exchangeRate: "89",
		notes: "",
		projectId: "",
		accountId: "",
		fromAccountId: "",
		toAccountId: "",
		status: "approved",
	});

	const { data: opsRaw, isLoading } = useQuery({
		queryKey: ["construction-operations"],
		queryFn: () => api.get("/construction/operations").then((r) => r.data),
	});
	const ops = unwrapList<any>(opsRaw);

	const { data: projectsRaw } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const projects = unwrapList<any>(projectsRaw);

	const { data: accountsRaw } = useQuery({
		queryKey: ["construction-accounts"],
		queryFn: () => api.get("/construction/accounts").then((r) => r.data),
	});
	const accounts = unwrapList<any>(accountsRaw);

	const saveMut = useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: number | null;
			data: Record<string, unknown>;
		}) =>
			id
				? api.patch(`/construction/operations/${id}`, data).then((r) => r.data)
				: api.post("/construction/operations", data).then((r) => r.data),
		onSuccess: (_row, variables) => {
			qc.invalidateQueries({ queryKey: ["construction-operations"] });
			qc.invalidateQueries({ queryKey: ["construction-accounts"] });
			const opDate = String(variables.data.date || "").slice(0, 7);
			const monthNow = new Date().toISOString().slice(0, 7);
			if (!variables.id && filterType === "month" && opDate !== monthNow) {
				setFilterType("all");
				toast.success(
					"Операция добавлена. Показаны все операции (дата вне текущего месяца)",
				);
			} else {
				toast.success(variables.id ? "Операция обновлена" : "Операция добавлена");
			}
			closePanel();
		},
		onError: (err: Error) => {
			toast.error(err.message || "Ошибка сохранения операции");
		},
	});

	function openPanel(type: "income" | "expense" | "transfer", op?: Record<string, unknown>) {
		setEditingId(op?.id != null ? Number(op.id) : null);
		setPanelType(type);
		if (op) {
			setForm({
				type: (op.type as "income" | "expense" | "transfer") || type,
				category: String(op.category || ""),
				description: String(op.description || ""),
				date: String(op.date || "").slice(0, 10),
				amount: String(op.amount || ""),
				currency: String(op.currency || "KGS"),
				exchangeRateSource: String(op.exchangeRateSource || "НБКР"),
				exchangeRate: String(op.exchangeRate || "89"),
				notes: String(op.notes || ""),
				projectId: op.projectId ? String(op.projectId) : "none",
				accountId: op.toAccountId
					? String(op.toAccountId)
					: op.fromAccountId
						? String(op.fromAccountId)
						: "",
				fromAccountId: op.fromAccountId ? String(op.fromAccountId) : "",
				toAccountId: op.toAccountId ? String(op.toAccountId) : "",
				status: String(op.status || "approved"),
			});
		} else {
			setForm((f) => ({
				...f,
				type,
				category: "",
				description: "",
				amount: "",
				fromAccountId: "",
				toAccountId: "",
				accountId: "",
			}));
		}
	}

	function closePanel() {
		setPanelType(null);
		setEditingId(null);
		resetForm();
	}

	function resetForm() {
		setForm({
			type: panelType || "expense",
			category: "",
			description: "",
			date: new Date().toISOString().slice(0, 10),
			amount: "",
			currency: "KGS",
			exchangeRateSource: "НБКР",
			exchangeRate: "89",
			notes: "",
			projectId: "",
			accountId: "",
			fromAccountId: "",
			toAccountId: "",
			status: "approved",
		});
	}

	function openEdit(op: Record<string, unknown>) {
		const t = (op.type as "income" | "expense" | "transfer") || "expense";
		openPanel(t, op);
	}

	function buildPayload() {
		const category =
			form.category ||
			(form.type === "transfer"
				? "Перевод между счетами"
				: form.type === "income"
					? "Прочие доходы"
					: "Прочие расходы");
		const payload: Record<string, unknown> = {
			type: form.type,
			category,
			description: form.description.trim(),
			date: form.date,
			amount: form.amount,
			currency: form.currency,
			exchangeRateSource: form.exchangeRateSource,
			exchangeRate: form.exchangeRate,
			notes: form.notes || null,
			status: form.status,
			projectId:
				form.projectId && form.projectId !== "none"
					? Number(form.projectId)
					: null,
		};
		if (form.type === "transfer") {
			payload.fromAccountId =
				form.fromAccountId && form.fromAccountId !== "none"
					? Number(form.fromAccountId)
					: null;
			payload.toAccountId =
				form.toAccountId && form.toAccountId !== "none"
					? Number(form.toAccountId)
					: null;
		} else {
			payload.accountId =
				form.accountId && form.accountId !== "none"
					? Number(form.accountId)
					: null;
		}
		return payload;
	}

	const amountKgs =
		form.currency === "KGS"
			? parseFloat(form.amount || "0")
			: parseFloat(form.amount || "0") * parseFloat(form.exchangeRate || "1");

	const categories =
		form.type === "income" ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;

	const now = new Date();
	const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

	const opsList = Array.isArray(ops) ? ops : [];

	const filtered = opsList.filter((op: any) => {
		if (
			search &&
			!op.description?.toLowerCase().includes(search.toLowerCase()) &&
			!op.category?.toLowerCase().includes(search.toLowerCase())
		)
			return false;
		if (filterType === "month" && !op.date?.startsWith(currentMonth))
			return false;
		if (filterType === "income" && op.type !== "income") return false;
		if (filterType === "expense" && op.type !== "expense") return false;
		if (filterType === "transfer" && op.type !== "transfer") return false;
		return true;
	});

	const filteredArray = Array.isArray(filtered) ? filtered : [];
	const sortedOps = [...filteredArray].sort((a, b) =>
		(b.date || "").localeCompare(a.date || ""),
	);

	const expenseAccountId =
		form.type === "transfer" ? form.fromAccountId : form.accountId;
	const selectedAccount = accounts.find(
		(a: { id: number }) => String(a.id) === expenseAccountId,
	);
	const editingOp = editingId
		? sortedOps.find((o: { id: number }) => o.id === editingId)
		: null;
	let accountBalance = parseFloat(
		selectedAccount?.currentBalance?.toString() || "0",
	);
	if (
		editingOp &&
		editingOp.status === "approved" &&
		expenseAccountId &&
		String(editingOp.fromAccountId) === expenseAccountId &&
		(editingOp.type === "expense" || editingOp.type === "transfer")
	) {
		accountBalance += parseFloat(editingOp.amountKgs || "0");
	}
	const insufficientFunds =
		(form.type === "expense" || form.type === "transfer") &&
		form.status === "approved" &&
		expenseAccountId &&
		expenseAccountId !== "none" &&
		amountKgs > accountBalance + 0.01;

	const totalIncome = filteredArray
		.filter((o: any) => o.type === "income")
		.reduce((s: number, o: any) => s + parseFloat(o.amountKgs || "0"), 0);
	const totalExpense = filteredArray
		.filter((o: any) => o.type === "expense")
		.reduce((s: number, o: any) => s + parseFloat(o.amountKgs || "0"), 0);

	const periodLabel =
		filterType === "month"
			? "за текущий месяц"
			: filterType === "all"
				? "за всё время"
				: filterType === "income"
					? "— приходы"
					: filterType === "expense"
						? "— расходы"
						: "— переводы";

	return (
		<div className="flex h-full relative">
			{/* Main */}
			<div
				className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${panelType ? "mr-80" : ""}`}
			>
				<div className="mb-6">
					<h1 className="text-2xl font-bold text-gray-900">
						Операции {periodLabel}
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Управление приходами, расходами и переводами.{" "}
						<span className="text-gray-400">
							Нажмите на строку в таблице — откроется редактирование.
						</span>
					</p>
				</div>

				{/* Action buttons */}
				<div className="flex items-center gap-2 mb-4">
					<Button
						onClick={() => openPanel("income")}
						variant="outline"
						className="h-9 px-4 text-sm font-medium rounded-xl border-emerald-200 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all"
					>
						<TrendingUp className="w-4 h-4 mr-2 text-emerald-600" /> Приход
					</Button>
					<Button
						onClick={() => openPanel("expense")}
						variant="outline"
						className="h-9 px-4 text-sm font-medium rounded-xl border-rose-200 text-gray-700 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition-all"
					>
						<TrendingDown className="w-4 h-4 mr-2 text-rose-600" /> Расход
					</Button>
					<Button
						onClick={() => openPanel("transfer")}
						variant="outline"
						className="h-9 px-4 text-sm font-medium rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
					>
						<ArrowLeftRight className="w-4 h-4 mr-2 text-gray-500" /> Перевод
					</Button>
					<div className="flex-1" />
					<Button
						variant="outline"
						className="h-9 px-3 text-sm border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl"
					>
						<Filter className="w-4 h-4 mr-1.5" /> Фильтр
					</Button>
					<Button
						variant="outline"
						className="h-9 px-3 text-sm border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl"
					>
						<Upload className="w-4 h-4 mr-1.5" /> Импорт
					</Button>
					<Button
						variant="outline"
						className="h-9 px-3 text-sm border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl"
					>
						<Download className="w-4 h-4 mr-1.5" /> Экспорт
					</Button>
				</div>

				{/* Filter tabs */}
				<div className="flex items-center gap-1 mb-3 flex-wrap">
					{[
						["month", "Текущий месяц"],
						["all", "Все операции"],
						["income", "Приходы"],
						["expense", "Расходы"],
						["transfer", "Переводы"],
					].map(([v, l]) => (
						<button
							key={v}
							onClick={() => setFilterType(v as any)}
							className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${filterType === v ? "bg-gray-800 text-white border-gray-800" : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"}`}
						>
							{l}
						</button>
					))}
					<div className="flex-1" />
					<div className="relative">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
						<Input
							className="pl-8 h-7 text-xs w-44 border-gray-200"
							placeholder="Поиск по описанию"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
				</div>

				{/* Summary row */}
				{filteredArray.length > 0 && (
					<div className="grid grid-cols-4 gap-4 mb-4">
						<div className="bg-white border border-gray-200 rounded-xl p-4">
							<p className="text-xs font-medium text-gray-500 mb-1">Приходы</p>
							<p className="text-xl font-bold text-emerald-600 font-mono">
								+{fmt(totalIncome)}
							</p>
						</div>
						<div className="bg-white border border-gray-200 rounded-xl p-4">
							<p className="text-xs font-medium text-gray-500 mb-1">Расходы</p>
							<p className="text-xl font-bold text-rose-600 font-mono">
								−{fmt(totalExpense)}
							</p>
						</div>
						<div className="bg-white border border-gray-200 rounded-xl p-4">
							<p className="text-xs font-medium text-gray-500 mb-1">Баланс</p>
							<p
								className={`text-xl font-bold font-mono ${totalIncome - totalExpense >= 0 ? "text-gray-900" : "text-rose-600"}`}
							>
								{totalIncome - totalExpense >= 0 ? "+" : ""}
								{fmt(totalIncome - totalExpense)}
							</p>
						</div>
						<div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
							<p className="text-xs font-medium text-blue-700 mb-1">Операций</p>
							<p className="text-xl font-bold text-blue-900">
								{filteredArray.length}
							</p>
						</div>
					</div>
				)}

				{/* Operations list */}
				<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex-1">
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-gray-50/80 border-b border-gray-100">
								<th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 w-6">
									<input type="checkbox" className="rounded" />
								</th>
								<th className="text-left px-2 py-2.5 text-xs font-semibold text-gray-400 w-24">
									ДАТА
								</th>
								<th className="text-left px-2 py-2.5 text-xs font-semibold text-gray-400">
									ОПЕРАЦИЯ
								</th>
								<th className="text-left px-2 py-2.5 text-xs font-semibold text-gray-400">
									ПРОЕКТ
								</th>
								<th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400">
									СУММА
								</th>
							</tr>
						</thead>
						<tbody>
							{isLoading ? (
								<tr>
									<td colSpan={5} className="text-center py-16 text-gray-400">
										Загрузка...
									</td>
								</tr>
							) : sortedOps.length === 0 ? (
								<tr>
									<td colSpan={5} className="text-center py-16 text-gray-400">
										<div className="flex flex-col items-center gap-2">
											<ArrowLeftRight className="w-10 h-10 text-gray-200" />
											<span>
												Нет операций. Нажмите «Приход» или «Расход» для
												добавления.
											</span>
										</div>
									</td>
								</tr>
							) : (
								sortedOps.map((op: any) => {
									const proj = projects.find(
										(p: any) => p.id === op.projectId,
									);
									const isIncome = op.type === "income";
									const isTransfer = op.type === "transfer";
									return (
										<tr
											key={op.id}
											role="button"
											tabIndex={0}
											onClick={() => openEdit(op)}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") openEdit(op);
											}}
											className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer group"
										>
											<td
												className="px-4 py-2.5"
												onClick={(e) => e.stopPropagation()}
											>
												<input
													type="checkbox"
													className="rounded opacity-0 group-hover:opacity-100"
												/>
											</td>
											<td className="px-2 py-2.5 text-gray-400 text-xs whitespace-nowrap">
												{relDate(op.date)}
											</td>
											<td className="px-2 py-2.5">
												<div className="font-medium text-gray-900 text-sm">
													{op.description}
												</div>
												{op.category && (
													<div className="text-xs text-gray-400 mt-0.5">
														{op.category}
													</div>
												)}
											</td>
											<td className="px-2 py-2.5 text-xs text-gray-400">
												{proj?.name || "—"}
											</td>
											<td
												className={`px-4 py-2.5 text-right font-mono font-semibold text-sm ${isIncome ? "text-emerald-600" : isTransfer ? "text-blue-600" : "text-gray-700"}`}
											>
												{isIncome ? "+" : isTransfer ? "" : "−"}
												{fmt(op.amountKgs)}
												{op.currency !== "KGS" && (
													<div className="text-[10px] text-gray-400 font-normal">
														{fmt(op.amount)} {op.currency}
													</div>
												)}
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Панель через portal — не обрезается layout overflow */}
			{panelType &&
				createPortal(
					<>
						<button
							type="button"
							className="fixed inset-0 bg-black/20 z-[200]"
							aria-label="Закрыть"
							onClick={closePanel}
						/>
						<div className="fixed right-0 top-0 bottom-0 w-80 max-w-[100vw] bg-white shadow-2xl border-l border-gray-100 flex flex-col z-[210]">
					<div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
						<div className="text-sm font-semibold text-gray-800">
							{editingId ? "Редактировать" : "Добавить"} операцию{" "}
							{panelType === "income"
								? "прихода"
								: panelType === "expense"
									? "расхода"
									: "перевода"}
						</div>
						<button
							onClick={closePanel}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					<div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
						{/* Type selector */}
						<div className="grid grid-cols-3 gap-1.5">
							{(["income", "expense", "transfer"] as const).map((t) => (
								<button
									key={t}
									onClick={() => {
										setPanelType(t);
										setForm((f) => ({ ...f, type: t, category: "" }));
									}}
									className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
										panelType === t
											? t === "income"
												? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
												: t === "expense"
													? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
													: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
											: "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
									}`}
								>
									{t === "income"
										? "Приход"
										: t === "expense"
											? "Расход"
											: "Перевод"}
								</button>
							))}
						</div>

						{/* Amount */}
						<div>
							<Label className="text-xs text-gray-500">СУММА *</Label>
							<div className="flex gap-2 mt-1">
								<Input
									type="number"
									value={form.amount}
									onChange={(e) =>
										setForm((f) => ({ ...f, amount: e.target.value }))
									}
									className="flex-1 h-9 text-sm font-mono border-gray-200"
									placeholder="0,00"
									autoFocus
								/>
								<Select
									value={form.currency}
									onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
								>
									<SelectTrigger className="w-20 h-9 text-sm border-gray-200">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{["KGS", "USD", "EUR", "RUB", "CNY"].map((c) => (
											<SelectItem key={c} value={c}>
												{c}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							{form.currency !== "KGS" && (
								<div className="mt-2 space-y-1.5">
									<div className="flex gap-2">
										<Input
											type="number"
											value={form.exchangeRate}
											onChange={(e) =>
												setForm((f) => ({ ...f, exchangeRate: e.target.value }))
											}
											className="flex-1 h-8 text-xs border-gray-200"
											placeholder="Курс"
										/>
										<Select
											value={form.exchangeRateSource}
											onValueChange={(v) =>
												setForm((f) => ({ ...f, exchangeRateSource: v }))
											}
										>
											<SelectTrigger className="w-24 h-8 text-xs border-gray-200">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{RATE_SOURCES.map((s) => (
													<SelectItem key={s} value={s}>
														{s}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="text-xs text-blue-600 font-mono bg-blue-50 rounded px-2 py-1">
										≈ {fmt(amountKgs)} KGS
									</div>
								</div>
							)}
						</div>

						{panelType === "transfer" ? (
							<>
								<div>
									<Label className="text-xs text-gray-500">
										СЧЁТ СПИСАНИЯ *
									</Label>
									<Select
										value={form.fromAccountId}
										onValueChange={(v) =>
											setForm((f) => ({ ...f, fromAccountId: v }))
										}
									>
										<SelectTrigger className="mt-1 h-9 text-sm border-gray-200">
											<SelectValue placeholder="Откуда" />
										</SelectTrigger>
										<SelectContent>
											{accounts.map((a: { id: number; name: string; currentBalance: string; currency: string }) => (
												<SelectItem key={a.id} value={String(a.id)}>
													{a.name} ({fmt(a.currentBalance)} {a.currency})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label className="text-xs text-gray-500">
										СЧЁТ ЗАЧИСЛЕНИЯ *
									</Label>
									<Select
										value={form.toAccountId}
										onValueChange={(v) =>
											setForm((f) => ({ ...f, toAccountId: v }))
										}
									>
										<SelectTrigger className="mt-1 h-9 text-sm border-gray-200">
											<SelectValue placeholder="Куда" />
										</SelectTrigger>
										<SelectContent>
											{accounts.map((a: { id: number; name: string; currentBalance: string; currency: string }) => (
												<SelectItem key={a.id} value={String(a.id)}>
													{a.name} ({fmt(a.currentBalance)} {a.currency})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</>
						) : (
							<div>
								<Label className="text-xs text-gray-500">
									{panelType === "expense" ? "СЧЁТ СПИСАНИЯ *" : "СЧЁТ ЗАЧИСЛЕНИЯ"}
								</Label>
								<Select
									value={form.accountId}
									onValueChange={(v) =>
										setForm((f) => ({ ...f, accountId: v }))
									}
								>
									<SelectTrigger className="mt-1 h-9 text-sm border-gray-200">
										<SelectValue placeholder="Выберите счёт" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Не указан</SelectItem>
										{accounts.map((a: { id: number; name: string; currentBalance: string; currency: string }) => (
											<SelectItem key={a.id} value={String(a.id)}>
												{a.name} ({fmt(a.currentBalance)} {a.currency})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{selectedAccount && panelType === "expense" && (
									<p className="text-[11px] text-gray-500 mt-1">
										Доступно на счёте:{" "}
										<span className="font-mono font-medium">
											{fmt(accountBalance)} {selectedAccount.currency}
										</span>
									</p>
								)}
							</div>
						)}

						{insufficientFunds && (
							<div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-2">
								<p>
									На счёте недостаточно средств для проведения расхода (
									{fmt(amountKgs)} KGS при остатке {fmt(accountBalance)} KGS).
								</p>
								<p className="text-rose-700">
									Сначала сделайте приход или перевод с другого счёта.
								</p>
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="h-7 text-xs border-rose-300"
									onClick={() => {
										setForm((f) => ({
											...f,
											type: "transfer",
											fromAccountId: f.accountId || f.fromAccountId,
											toAccountId: "",
										}));
										setPanelType("transfer");
									}}
								>
									<ArrowLeftRight className="w-3 h-3 mr-1" />
									Перевод между счетами
								</Button>
							</div>
						)}

						{/* Category */}
						{panelType !== "transfer" && (
							<div>
								<Label className="text-xs text-gray-500">СТАТЬЯ</Label>
								<Select
									value={form.category}
									onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
								>
									<SelectTrigger className="mt-1 h-9 text-sm border-gray-200">
										<SelectValue placeholder="Выберите статью" />
									</SelectTrigger>
									<SelectContent>
										{categories.map((c) => (
											<SelectItem key={c} value={c}>
												{c}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						{/* Date */}
						<div>
							<Label className="text-xs text-gray-500">ДАТА</Label>
							<Input
								type="date"
								value={form.date}
								onChange={(e) =>
									setForm((f) => ({ ...f, date: e.target.value }))
								}
								className="mt-1 h-9 text-sm border-gray-200"
							/>
						</div>

						{/* Project */}
						<div>
							<Label className="text-xs text-gray-500">
								ПРОЕКТ ИЛИ НАПРАВЛЕНИЕ
							</Label>
							<Select
								value={form.projectId}
								onValueChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
							>
								<SelectTrigger className="mt-1 h-9 text-sm border-gray-200">
									<SelectValue placeholder="Выберите проект..." />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Не привязан</SelectItem>
									{projects.map((p: any) => (
										<SelectItem key={p.id} value={String(p.id)}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Description */}
						<div>
							<Label className="text-xs text-gray-500">ОПИСАНИЕ *</Label>
							<Textarea
								value={form.description}
								onChange={(e) =>
									setForm((f) => ({ ...f, description: e.target.value }))
								}
								className="mt-1 text-sm resize-none border-gray-200"
								rows={3}
								placeholder="Краткое описание операции..."
							/>
						</div>

						{/* Status */}
						<div>
							<Label className="text-xs text-gray-500">СТАТУС</Label>
							<div className="flex gap-2 mt-1">
								{[
									["approved", "Проведена"],
									["pending", "Плановая"],
								].map(([v, l]) => (
									<button
										key={v}
										onClick={() => setForm((f) => ({ ...f, status: v }))}
										className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.status === v ? "bg-gray-800 text-white border-gray-800" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
									>
										{l}
									</button>
								))}
							</div>
						</div>

						{/* Notes */}
						<div>
							<Label className="text-xs text-gray-500">ПРИМЕЧАНИЕ</Label>
							<Textarea
								value={form.notes}
								onChange={(e) =>
									setForm((f) => ({ ...f, notes: e.target.value }))
								}
								className="mt-1 text-sm resize-none border-gray-200"
								rows={2}
								placeholder="Дополнительно..."
							/>
						</div>
					</div>

					<div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
						<Button
							className={`w-full h-9 text-sm font-medium ${panelType === "income" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : panelType === "expense" ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
							disabled={
								saveMut.isPending ||
								!form.description.trim() ||
								!form.amount ||
								insufficientFunds ||
								(panelType === "transfer" &&
									(!form.fromAccountId || !form.toAccountId)) ||
								(panelType === "expense" &&
									form.status === "approved" &&
									(!form.accountId || form.accountId === "none"))
							}
							onClick={() =>
								saveMut.mutate({
									id: editingId,
									data: buildPayload(),
								})
							}
						>
							{saveMut.isPending
								? "Сохранение..."
								: editingId
									? "Сохранить изменения"
									: "Добавить операцию"}
						</Button>
					</div>
						</div>
					</>,
					document.body,
				)}
		</div>
	);
}
