import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	FileText,
	Printer,
	RefreshCw,
	X,
} from "lucide-react";
import { useState } from "react";
import { useListProperties } from "@/api-client";
import { defaultPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
import { useSortable } from "@/lib/use-sortable";
import { SortHead } from "@/components/sort-head";
import { Button } from "@/components/ui/button";
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

interface OwnerStatement {
	id: number;
	propertyId: number;
	period: string;
	rentCharged: string;
	rentReceived: string;
	expenses: string;
	netIncome: string;
	currency: string;
	generatedAt: string;
	unitNumber?: string;
}

async function fetchStatements(
	propertyId?: string,
	month?: string,
): Promise<OwnerStatement[]> {
	const params = new URLSearchParams();
	if (propertyId && propertyId !== "all") params.set("propertyId", propertyId);
	if (month) params.set("month", month);
	const token = localStorage.getItem("auth_token");
	const res = await fetch(`${BASE}/rental/statements?${params}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok) throw new Error("Ошибка загрузки актов");
	return res.json();
}

async function generateStatement(
	propertyId: number,
	period: string,
): Promise<OwnerStatement> {
	const token = localStorage.getItem("auth_token");
	const res = await fetch(`${BASE}/rental/statements/generate`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ propertyId, period }),
	});
	if (!res.ok) throw new Error("Ошибка генерации акта");
	return res.json();
}

function fmtKGS(amount: string | number) {
	const num = typeof amount === "string" ? parseFloat(amount) : amount;
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: "KGS",
		minimumFractionDigits: 2,
	}).format(num);
}

function fmtPeriod(period: string) {
	if (!period) return "—";
	const [year, month] = period.split("-");
	const months = [
		"Январь",
		"Февраль",
		"Март",
		"Апрель",
		"Май",
		"Июнь",
		"Июль",
		"Август",
		"Сентябрь",
		"Октябрь",
		"Ноябрь",
		"Декабрь",
	];
	return `${months[parseInt(month, 10) - 1]} ${year}`;
}

export default function OwnerStatements() {
	const [propertyFilter, setPropertyFilter] = useState("all");
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
	const monthFilter = period.from.slice(0, 7);
	const [isGenerating, setIsGenerating] = useState(false);
	const [selectedStatement, setSelectedStatement] =
		useState<OwnerStatement | null>(null);
	const { data: properties } = useListProperties();
	const propertiesArray = Array.isArray(properties) ? properties : [];
	const { toast } = useToast();
	const queryClient = useQueryClient();

	const { data: statements, isLoading } = useQuery({
		queryKey: ["owner-statements", propertyFilter, monthFilter],
		queryFn: () => fetchStatements(propertyFilter, monthFilter),
	});
	const statementsArray = Array.isArray(statements) ? statements : [];
	const { sorted: sortedStatements, sortKey, sortDir, toggle } = useSortable(statementsArray, "period");

	const { data: expenses = [] } = useQuery<any[]>({
		queryKey: ["rental-expenses"],
		queryFn: () => api.get("/rental/expenses").then((r) => r.data),
	});
	const expensesArray = Array.isArray(expenses) ? expenses : [];

	const handleGenerate = async () => {
		if (propertyFilter === "all") {
			toast({
				title: "Выберите конкретный объект",
				description: "Для формирования акта выберите объект из списка",
				variant: "destructive",
			});
			return;
		}
		setIsGenerating(true);
		try {
			await generateStatement(parseInt(propertyFilter, 10), monthFilter);
			toast({ title: "Акт сформирован" });
			queryClient.invalidateQueries({ queryKey: ["owner-statements"] });
		} catch {
			toast({
				title: "Ошибка",
				description: "Не удалось сформировать акт",
				variant: "destructive",
			});
		} finally {
			setIsGenerating(false);
		}
	};

	const totalCharged = statementsArray.reduce(
		(s, r) => s + parseFloat(String(r.rentCharged || 0)),
		0,
	);
	const totalReceived = statementsArray.reduce(
		(s, r) => s + parseFloat(String(r.rentReceived || 0)),
		0,
	);
	const totalExpenses = statementsArray.reduce(
		(s, r) => s + parseFloat(String(r.expenses || 0)),
		0,
	);
	const totalNet = statementsArray.reduce(
		(s, r) => s + parseFloat(String(r.netIncome || 0)),
		0,
	);

	return (
		<div className="space-y-5">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Акты собственников
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Ежемесячные отчёты о доходах и расходах по объектам
					</p>
				</div>
			</div>

			{/* Unified filters + generate row */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
				<p className="text-sm font-semibold text-gray-700 mb-3">
					Фильтр и формирование актов
				</p>
				<div className="flex flex-wrap gap-3 items-center">
					<Select value={propertyFilter} onValueChange={setPropertyFilter}>
						<SelectTrigger className="w-56">
							<SelectValue placeholder="Все объекты" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Все объекты</SelectItem>
							{propertiesArray.map((p) => (
								<SelectItem key={p.id} value={String(p.id)}>
									{p.projectName} — {p.unitNumber}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<PeriodPicker value={period} onChange={setPeriod} />

					<div className="flex-1" />

					<Button
						onClick={handleGenerate}
						disabled={isGenerating || propertyFilter === "all"}
						className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
					>
						<RefreshCw
							className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`}
						/>
						{isGenerating ? "Формирование..." : "Сформировать акт"}
					</Button>
				</div>
				{propertyFilter === "all" && (
					<p className="text-xs text-amber-600 mt-2">
						Для формирования нового акта выберите конкретный объект
					</p>
				)}
			</div>

			{/* KPIs */}
			{!isLoading && statementsArray.length > 0 && (
				<div className="grid grid-cols-4 gap-4">
					{[
						{
							label: "Начислено",
							value: totalCharged,
							color: "text-blue-600",
							bg: "bg-blue-50",
						},
						{
							label: "Собрано",
							value: totalReceived,
							color: "text-emerald-600",
							bg: "bg-emerald-50",
						},
						{
							label: "Расходы",
							value: totalExpenses,
							color: "text-rose-600",
							bg: "bg-rose-50",
						},
						{
							label: "Чистый доход",
							value: totalNet,
							color: totalNet >= 0 ? "text-emerald-700" : "text-rose-600",
							bg: totalNet >= 0 ? "bg-emerald-50" : "bg-rose-50",
						},
					].map((stat, i) => (
						<div
							key={i}
							className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
						>
							<p className="text-xs text-gray-500 mb-1">{stat.label}</p>
							<p className={`text-lg font-bold ${stat.color}`}>
								{fmtKGS(stat.value)}
							</p>
						</div>
					))}
				</div>
			)}

			{/* Table */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							<SortHead label="Объект" sortKey="propertyId" currentKey={sortKey} dir={sortDir} onToggle={toggle} />
							<SortHead label="Период" sortKey="period" currentKey={sortKey} dir={sortDir} onToggle={toggle} />
							<SortHead label="Начислено" sortKey="totalCharged" currentKey={sortKey} dir={sortDir} onToggle={toggle} className="text-right" />
							<SortHead label="Собрано" sortKey="totalReceived" currentKey={sortKey} dir={sortDir} onToggle={toggle} className="text-right" />
							<SortHead label="Расходы" sortKey="totalExpenses" currentKey={sortKey} dir={sortDir} onToggle={toggle} className="text-right" />
							<SortHead label="Чистый доход" sortKey="netIncome" currentKey={sortKey} dir={sortDir} onToggle={toggle} className="text-right" />
							<TableHead>Сформирован</TableHead>
							<TableHead></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 4 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 8 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : !statementsArray.length ? (
							<TableRow>
								<TableCell
									colSpan={8}
									className="text-center text-gray-400 py-14 text-sm"
								>
									<FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
									Актов не найдено. Выберите объект и нажмите «Сформировать
									акт».
								</TableCell>
							</TableRow>
						) : (
							sortedStatements.map((s) => {
								const charged = parseFloat(s.rentCharged);
								const received = parseFloat(s.rentReceived);
								const exp = parseFloat(s.expenses);
								const net = parseFloat(s.netIncome);
								const collectionPct =
									charged > 0 ? ((received / charged) * 100).toFixed(0) : "0";
								return (
									<TableRow
										key={s.id}
										className="hover:bg-blue-50/30 cursor-pointer"
										onClick={() => setSelectedStatement(s)}
									>
										<TableCell className="font-medium">
											{s.unitNumber || `Объект #${s.propertyId}`}
										</TableCell>
										<TableCell className="text-gray-600">
											{fmtPeriod(s.period)}
										</TableCell>
										<TableCell className="text-right text-blue-600 font-medium">
											{fmtKGS(charged)}
										</TableCell>
										<TableCell className="text-right">
											<span className="text-emerald-600 font-medium">
												{fmtKGS(received)}
											</span>
											<span className="text-xs text-gray-400 ml-1">
												{collectionPct}%
											</span>
										</TableCell>
										<TableCell className="text-right text-rose-600">
											{fmtKGS(exp)}
										</TableCell>
										<TableCell
											className={`text-right font-semibold ${net >= 0 ? "text-emerald-700" : "text-rose-600"}`}
										>
											{net >= 0 ? "+" : ""}
											{fmtKGS(net)}
										</TableCell>
										<TableCell className="text-xs text-gray-400">
											{new Date(s.generatedAt).toLocaleDateString("ru-KG")}
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												onClick={(e) => {
													e.stopPropagation();
													setSelectedStatement(s);
												}}
												className="gap-1 text-xs"
											>
												<FileText className="w-3.5 h-3.5" /> Акт
											</Button>
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</div>

			{/* Reconciliation act modal */}
			{selectedStatement && (
				<div className="fixed inset-0 bg-slate-950/50 z-50 flex items-start justify-center p-4 pt-12 overflow-auto">
					<div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
						<div className="flex items-center justify-between px-6 py-4 border-b no-print">
							<h2 className="font-bold text-gray-900">Акт сверки расчётов</h2>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => window.print()}
									className="gap-1.5 text-xs"
								>
									<Printer className="w-3.5 h-3.5" /> Печать
								</Button>
								<button
									onClick={() => setSelectedStatement(null)}
									className="text-gray-400 hover:text-gray-600"
								>
									<X className="w-5 h-5" />
								</button>
							</div>
						</div>

						<div className="px-6 py-5 space-y-5 print-content">
							{/* Header */}
							<div className="border-b pb-4">
								<h3 className="text-lg font-bold text-center text-gray-900">
									АКТ СВЕРКИ РАСЧЁТОВ
								</h3>
								<p className="text-center text-sm text-gray-500 mt-1">
									Период: {fmtPeriod(selectedStatement.period)}
								</p>
								<p className="text-center text-sm text-gray-600 font-medium mt-0.5">
									Объект:{" "}
									{selectedStatement.unitNumber ||
										`#${selectedStatement.propertyId}`}
								</p>
							</div>

							{/* Main reconciliation table */}
							<table className="w-full text-sm">
								<thead>
									<tr className="bg-gray-50 text-xs text-gray-500 uppercase">
										<th className="text-left px-3 py-2 font-medium">Статья</th>
										<th className="text-right px-3 py-2 font-medium">
											Сумма (KGS)
										</th>
									</tr>
								</thead>
								<tbody>
									<tr className="border-b">
										<td className="px-3 py-3 text-gray-700 font-medium">
											Начислено аренды
										</td>
										<td className="px-3 py-3 text-right font-bold text-blue-700">
											{fmtKGS(selectedStatement.rentCharged)}
										</td>
									</tr>
									<tr className="border-b bg-emerald-50/30">
										<td className="px-3 py-3 text-gray-700">
											Оплачено (собрано)
										</td>
										<td className="px-3 py-3 text-right font-bold text-emerald-700">
											+{fmtKGS(selectedStatement.rentReceived)}
										</td>
									</tr>
									<tr className="border-b">
										<td className="px-3 py-3 text-gray-500 pl-8 text-xs">
											— Задолженность арендатора
										</td>
										<td className="px-3 py-3 text-right text-xs text-amber-600">
											{fmtKGS(
												parseFloat(selectedStatement.rentCharged) -
													parseFloat(selectedStatement.rentReceived),
											)}
										</td>
									</tr>
									<tr className="border-b bg-rose-50/30">
										<td className="px-3 py-3 text-gray-700">
											Расходы по объекту
										</td>
										<td className="px-3 py-3 text-right font-bold text-rose-600">
											-{fmtKGS(selectedStatement.expenses)}
										</td>
									</tr>
									{/* Expense breakdown from rental expenses */}
									{expensesArray
										.filter((e: any) => {
											const [year, month] = selectedStatement.period.split("-");
											const eDate = e.expenseDate || e.createdAt || "";
											return eDate.startsWith(`${year}-${month}`);
										})
										.map((e: any) => (
											<tr key={e.id} className="border-b text-xs">
												<td className="px-3 py-2 text-gray-400 pl-8">
													— {e.description || e.category || "Расход"}
												</td>
												<td className="px-3 py-2 text-right text-rose-600">
													{fmtKGS(e.amount)}
												</td>
											</tr>
										))}
									<tr className="bg-gray-100 border-t-2">
										<td className="px-3 py-3 font-bold text-gray-900">
											ЧИСТЫЙ ДОХОД
										</td>
										<td
											className={`px-3 py-3 text-right font-bold text-lg ${parseFloat(selectedStatement.netIncome) >= 0 ? "text-emerald-700" : "text-rose-600"}`}
										>
											{parseFloat(selectedStatement.netIncome) >= 0 ? "+" : ""}
											{fmtKGS(selectedStatement.netIncome)}
										</td>
									</tr>
								</tbody>
							</table>

							{/* Collection rate */}
							<div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-blue-900">
										Процент сбора аренды
									</p>
									<p className="text-xs text-blue-600 mt-0.5">
										Собрано от начисленного
									</p>
								</div>
								<p className="text-2xl font-bold text-blue-700">
									{parseFloat(selectedStatement.rentCharged) > 0
										? (
												(parseFloat(selectedStatement.rentReceived) /
													parseFloat(selectedStatement.rentCharged)) *
												100
											).toFixed(1)
										: "0"}
									%
								</p>
							</div>

							<div className="text-center text-xs text-gray-400 pt-2">
								Сформирован:{" "}
								{new Date(selectedStatement.generatedAt).toLocaleString(
									"ru-KG",
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
