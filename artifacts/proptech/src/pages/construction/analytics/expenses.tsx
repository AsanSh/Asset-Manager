import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { api } from "@/lib/api";

function fmtFull(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-RU").format(v);
}

export default function ConstructionExpenseAnalysis() {
	const { data: ops = [] } = useQuery({
		queryKey: ["construction-operations"],
		queryFn: () => api.get("/construction/operations").then((r) => r.data),
	});
	const { data: projects = [] } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});

	const expenses = ops.filter((o: any) => o.type === "expense");
	const totalExpense = expenses.reduce(
		(s: number, o: any) => s + parseFloat(o.amountKgs || "0"),
		0,
	);

	// Group by category
	const byCategory: Record<string, number> = {};
	expenses.forEach((o: any) => {
		const cat = o.category || "Прочие";
		byCategory[cat] = (byCategory[cat] || 0) + parseFloat(o.amountKgs || "0");
	});
	const categorySorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

	// Group by project
	const byProject: Record<number, number> = {};
	expenses.forEach((o: any) => {
		if (o.projectId)
			byProject[o.projectId] =
				(byProject[o.projectId] || 0) + parseFloat(o.amountKgs || "0");
	});

	const expenseColumns = useMemo<ColumnDef<(typeof expenses)[number], unknown>[]>(
		() => [
			{
				id: "date",
				header: "Дата",
				size: 100,
				accessorKey: "date",
				meta: { exportLabel: "Дата", pinned: "left" },
			},
			{
				id: "description",
				header: "Описание",
				size: 220,
				minSize: 140,
				maxSize: 480,
				accessorKey: "description",
				meta: { exportLabel: "Описание", grow: true },
				cell: ({ row }) => (
					<span className="font-medium truncate block" title={row.original.description}>
						{row.original.description}
					</span>
				),
			},
			{
				id: "category",
				header: "Статья",
				size: 140,
				accessorKey: "category",
				meta: { exportLabel: "Статья" },
				cell: ({ row }) => (
					<span className="text-xs text-am-text-muted">{row.original.category}</span>
				),
			},
			{
				id: "amountKgs",
				header: "Сумма",
				size: 120,
				accessorFn: (row) => parseFloat(row.amountKgs || "0"),
				meta: { exportLabel: "Сумма", align: "right", financeAmount: true, pinned: "right" },
				cell: ({ row }) => (
					<span className="tabular-nums text-rose-700 font-medium">
						−{fmtFull(row.original.amountKgs)} сом
					</span>
				),
			},
		],
		[],
	);

	const COLORS = [
		"bg-orange-400",
		"bg-blue-400",
		"bg-emerald-600",
		"bg-indigo-400",
		"bg-rose-600",
		"bg-yellow-400",
		"bg-gray-400",
	];

	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Анализ расходов</h1>
				<p className="text-gray-500 text-sm mt-0.5">
					Детальная аналитика трат по статьям, проектам и контрагентам
				</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				{/* By category */}
				<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
					<div className="text-sm font-semibold text-gray-700 mb-4">
						По статьям расходов
					</div>
					{categorySorted.length === 0 ? (
						<div className="text-center py-8 text-gray-600 text-sm">
							Нет расходных операций
						</div>
					) : (
						<div className="space-y-3">
							{categorySorted.map(([cat, amount], i) => {
								const pct =
									totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
								return (
									<div key={cat}>
										<div className="flex items-center justify-between text-sm mb-1">
											<div className="flex items-center gap-2">
												<div
													className={`w-2.5 h-2.5 rounded-full ${COLORS[i % COLORS.length]}`}
												/>
												<span>{cat}</span>
											</div>
											<div className="text-right">
												<span className="font-mono font-medium">
													{fmtFull(amount)}
												</span>
												<span className="text-xs text-gray-600 ml-2">
													{pct.toFixed(1)}%
												</span>
											</div>
										</div>
										<div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
											<div
												className={`h-full ${COLORS[i % COLORS.length]} rounded-full transition-all`}
												style={{ width: `${pct}%` }}
											/>
										</div>
									</div>
								);
							})}
							<div className="pt-2 border-t border-gray-100 flex justify-between font-semibold text-sm">
								<span>Итого расходов</span>
								<span className="font-mono text-rose-700">
									{fmtFull(totalExpense)}
								</span>
							</div>
						</div>
					)}
				</div>

				{/* By project */}
				<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
					<div className="text-sm font-semibold text-gray-700 mb-4">
						По проектам
					</div>
					{Object.keys(byProject).length === 0 ? (
						<div className="text-center py-8 text-gray-600 text-sm">
							Нет расходов по проектам
						</div>
					) : (
						<div className="space-y-3">
							{Object.entries(byProject)
								.sort((a, b) => b[1] - a[1])
								.map(([projId, amount], i) => {
									const proj = projects.find(
										(p: any) => p.id === Number(projId),
									);
									const pct =
										totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
									return (
										<div key={projId}>
											<div className="flex items-center justify-between text-sm mb-1">
												<span>{proj?.name || `Проект #${projId}`}</span>
												<div>
													<span className="font-mono font-medium">
														{fmtFull(amount)}
													</span>
													<span className="text-xs text-gray-600 ml-2">
														{pct.toFixed(1)}%
													</span>
												</div>
											</div>
											<div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
												<div
													className={`h-full ${COLORS[i % COLORS.length]} rounded-full`}
													style={{ width: `${pct}%` }}
												/>
											</div>
										</div>
									);
								})}
						</div>
					)}
				</div>
			</div>

			<div className="mt-6 space-y-2">
				<p className="text-sm font-semibold text-gray-700 px-1">Детализация расходов</p>
				<DataTable
					tableId="construction-expense-detail"
					columns={expenseColumns}
					data={expenses}
					enableSearch
					searchPlaceholder="Поиск по описанию или статье…"
					initialSorting={[{ id: "date", desc: true }]}
					emptyState={
						<p className="py-8 text-center text-am-text-muted">Нет расходных операций</p>
					}
				/>
			</div>
		</div>
	);
}
