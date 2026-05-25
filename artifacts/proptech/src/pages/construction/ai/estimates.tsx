import { useQuery } from "@tanstack/react-query";
import {
	AlertTriangle,
	BarChart3,
	ChevronDown,
	ChevronRight,
	FileSpreadsheet,
	RefreshCw,
	TrendingDown,
	TrendingUp,
	Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { flattenProjectBudgetResponse } from "@/lib/construction-budget";
import { cn } from "@/lib/utils";

interface BudgetItem {
	id: number;
	projectId: number;
	stageId?: number;
	category: string;
	name: string;
	plannedAmount: string;
	actualAmount: string;
	currency: string;
	exchangeRate?: string;
	notes?: string;
}

interface Project {
	id: number;
	name: string;
}

function fmt(v: number) {
	return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(v || 0);
}

function DeviationBadge({ pct }: { pct: number }) {
	if (Math.abs(pct) < 0.5) {
		return <span className="text-xs text-gray-400">±0%</span>;
	}
	const over = pct > 0;
	return (
		<span className={cn("text-xs font-medium flex items-center gap-0.5", over ? "text-rose-600" : "text-emerald-600")}>
			{over ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
			{over ? "+" : ""}{pct.toFixed(1)}%
		</span>
	);
}

function CategoryBlock({ category, items }: { category: string; items: BudgetItem[] }) {
	const [open, setOpen] = useState(true);

	const planned = items.reduce((s, i) => s + parseFloat(i.plannedAmount || "0"), 0);
	const actual = items.reduce((s, i) => s + parseFloat(i.actualAmount || "0"), 0);
	const pct = planned > 0 ? ((actual - planned) / planned) * 100 : 0;

	return (
		<div className="border border-gray-100 rounded-xl overflow-hidden">
			<button
				onClick={() => setOpen((p) => !p)}
				className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
			>
				<div className="flex items-center gap-2">
					{open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
					<span className="text-sm font-semibold text-gray-800">{category}</span>
					<span className="text-xs text-gray-400">({items.length} позиций)</span>
				</div>
				<div className="flex items-center gap-6 text-right">
					<div>
						<p className="text-xs text-gray-400">План</p>
						<p className="text-sm font-medium text-gray-700">{fmt(planned)}</p>
					</div>
					<div>
						<p className="text-xs text-gray-400">Факт</p>
						<p className="text-sm font-medium text-gray-700">{fmt(actual)}</p>
					</div>
					<div className="w-20 text-right">
						<DeviationBadge pct={pct} />
					</div>
				</div>
			</button>

			{open && (
				<div className="divide-y divide-gray-50">
					{items.map((item) => {
						const p = parseFloat(item.plannedAmount || "0");
						const a = parseFloat(item.actualAmount || "0");
						const itemPct = p > 0 ? ((a - p) / p) * 100 : 0;
						return (
							<div key={item.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50/60">
								<div className="min-w-0 flex-1">
									<p className="text-sm text-gray-700 truncate">{item.name}</p>
									{item.currency !== "KGS" && (
										<p className="text-xs text-blue-500">
											{item.currency} × {parseFloat(item.exchangeRate || "1").toFixed(2)}
										</p>
									)}
								</div>
								<div className="flex items-center gap-6 text-right flex-shrink-0">
									<div className="w-24">
										<p className="text-sm text-gray-600">{fmt(p)}</p>
									</div>
									<div className="w-24">
										<p className={cn("text-sm", a > p ? "text-rose-600" : a < p ? "text-emerald-600" : "text-gray-600")}>
											{fmt(a)}
										</p>
									</div>
									<div className="w-20 text-right">
										{p > 0 ? <DeviationBadge pct={itemPct} /> : <span className="text-xs text-gray-300">—</span>}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

export default function AIEstimates() {
	const [projectId, setProjectId] = useState<string>("");

	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects-all"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});

	const { data: items = [], isLoading, refetch } = useQuery<BudgetItem[]>({
		queryKey: ["construction-budget", projectId],
		queryFn: () =>
			api
				.get(`/construction/projects/${projectId}/budget`)
				.then((r) => flattenProjectBudgetResponse(r.data)),
		enabled: !!projectId,
	});

	// set default project once loaded
	useMemo(() => {
		if (!projectId && projects.length > 0) {
			setProjectId(String(projects[0].id));
		}
	}, [projects, projectId]);

	const categories = useMemo(() => {
		const map: Record<string, BudgetItem[]> = {};
		for (const item of items) {
			const cat = item.category || "Прочее";
			(map[cat] ??= []).push(item);
		}
		return Object.entries(map);
	}, [items]);

	const totalPlanned = items.reduce((s, i) => s + parseFloat(i.plannedAmount || "0"), 0);
	const totalActual = items.reduce((s, i) => s + parseFloat(i.actualAmount || "0"), 0);
	const totalPct = totalPlanned > 0 ? ((totalActual - totalPlanned) / totalPlanned) * 100 : 0;

	const overBudget = items.filter(
		(i) => parseFloat(i.actualAmount || "0") > parseFloat(i.plannedAmount || "0"),
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">AI Смета</h1>
					<p className="text-sm text-gray-500 mt-1">Анализ и отклонения бюджета по проекту</p>
				</div>
				<div className="flex items-center gap-2">
					<Select value={projectId} onValueChange={setProjectId}>
						<SelectTrigger className="w-52">
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
					<Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
						<RefreshCw className={cn("w-4 h-4 mr-1.5", isLoading && "animate-spin")} />
						Обновить
					</Button>
					<Button variant="outline" size="sm" disabled title="Загрузка Excel — в разработке">
						<Upload className="w-4 h-4 mr-1.5" />
						Загрузить смету
					</Button>
				</div>
			</div>

			{/* Summary cards */}
			{projectId && (
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
					<div className="bg-white rounded-xl border border-gray-200 p-4">
						<p className="text-xs text-gray-500 mb-1">Позиций в смете</p>
						<p className="text-2xl font-bold text-gray-900">{items.length}</p>
					</div>
					<div className="bg-white rounded-xl border border-gray-200 p-4">
						<p className="text-xs text-gray-500 mb-1">Плановый бюджет</p>
						<p className="text-xl font-bold text-gray-900">{fmt(totalPlanned)} с</p>
					</div>
					<div className="bg-white rounded-xl border border-gray-200 p-4">
						<p className="text-xs text-gray-500 mb-1">Фактически</p>
						<p className={cn("text-xl font-bold", totalActual > totalPlanned ? "text-rose-600" : "text-emerald-600")}>
							{fmt(totalActual)} с
						</p>
					</div>
					<div className={cn(
						"rounded-xl border p-4",
						totalPct > 0 ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"
					)}>
						<p className="text-xs text-gray-500 mb-1">Отклонение</p>
						<p className={cn("text-xl font-bold", totalPct > 0 ? "text-rose-700" : "text-emerald-700")}>
							{totalPct > 0 ? "+" : ""}{totalPct.toFixed(1)}%
						</p>
						<p className="text-xs text-gray-500 mt-0.5">
							{totalPct > 0 ? "перерасход" : "экономия"} {fmt(Math.abs(totalActual - totalPlanned))} с
						</p>
					</div>
				</div>
			)}

			{/* Over-budget alert */}
			{overBudget.length > 0 && (
				<div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
					<AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
					<div>
						<p className="text-sm font-semibold text-amber-800">
							{overBudget.length} позиций превышают план
						</p>
						<p className="text-xs text-amber-600 mt-0.5">
							{overBudget.slice(0, 3).map((i) => i.name).join(", ")}
							{overBudget.length > 3 ? ` и ещё ${overBudget.length - 3}` : ""}
						</p>
					</div>
				</div>
			)}

			{/* Categories */}
			{isLoading ? (
				<div className="flex items-center justify-center py-20">
					<RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
				</div>
			) : !projectId ? (
				<div className="text-center py-20 text-gray-400">
					<FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-gray-300" />
					<p>Выберите проект для анализа сметы</p>
				</div>
			) : categories.length === 0 ? (
				<div className="text-center py-20 text-gray-400">
					<BarChart3 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
					<p className="font-medium">Нет данных бюджета</p>
					<p className="text-sm mt-1">Добавьте позиции в разделе «Бюджет»</p>
				</div>
			) : (
				<div className="space-y-3">
					{/* Table header */}
					<div className="flex items-center gap-6 px-4 text-xs text-gray-400 font-medium">
						<div className="flex-1">Наименование</div>
						<div className="w-24 text-right">План</div>
						<div className="w-24 text-right">Факт</div>
						<div className="w-20 text-right">Откл.</div>
					</div>
					{categories.map(([cat, catItems]) => (
						<CategoryBlock key={cat} category={cat} items={catItems} />
					))}

					{/* % by category chart */}
					<div className="bg-white rounded-xl border border-gray-200 p-5 mt-2">
						<h3 className="text-sm font-semibold text-gray-800 mb-4">Структура по разделам (% от плана)</h3>
						<div className="space-y-2.5">
							{categories.map(([cat, catItems]) => {
								const p = catItems.reduce((s, i) => s + parseFloat(i.plannedAmount || "0"), 0);
								const share = totalPlanned > 0 ? (p / totalPlanned) * 100 : 0;
								const a = catItems.reduce((s, i) => s + parseFloat(i.actualAmount || "0"), 0);
								return (
									<div key={cat} className="flex items-center gap-3">
										<div className="w-36 text-xs text-gray-500 truncate text-right flex-shrink-0">
											{cat}
										</div>
										<div className="flex-1 relative">
											<div className="h-5 bg-gray-100 rounded overflow-hidden">
												<div
													className="h-full bg-blue-400 rounded"
													style={{ width: `${Math.min(share, 100)}%` }}
												/>
											</div>
										</div>
										<div className="w-12 text-xs text-right text-gray-500 flex-shrink-0">
											{share.toFixed(1)}%
										</div>
										<div className={cn("w-20 text-xs text-right flex-shrink-0", a > p ? "text-rose-500" : "text-gray-400")}>
											{a > p ? `+${fmt(a - p)}` : a < p ? `-${fmt(p - a)}` : "="}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
