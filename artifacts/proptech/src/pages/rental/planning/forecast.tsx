import { useQuery } from "@tanstack/react-query";
import {
	AlertTriangle,
	CalendarClock,
	CheckCircle,
	TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	MATRIX_TH_CENTER,
	MATRIX_TH_RIGHT,
	MATRIX_TH_STICKY_LEFT,
	MatrixTableFrame,
} from "@/components/matrix-table-frame";
import { api } from "@/lib/api";
import { getListLeaseContractsQueryKey, getListTenantsQueryKey } from "@/lib/rental-query-keys";

const MONTH_NAMES = [
	"Янв",
	"Фев",
	"Мар",
	"Апр",
	"Май",
	"Июн",
	"Июл",
	"Авг",
	"Сен",
	"Окт",
	"Ноя",
	"Дек",
];

function fmtKGS(v: number) {
	if (!v) return "—";
	return new Intl.NumberFormat("ru-KG", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(v);
}

function getMonthCols(
	horizonMonths: number,
): { year: number; month: number; label: string; key: string }[] {
	const cols = [];
	const now = new Date();
	for (let i = 0; i < horizonMonths; i++) {
		const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
		cols.push({
			year: d.getFullYear(),
			month: d.getMonth() + 1,
			label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
			key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
		});
	}
	return cols;
}

export default function RentalForecast() {
	const [horizon, setHorizon] = useState("6");
	const todayKey = new Date().toISOString().slice(0, 7);

	const { data: accruals = [], isLoading } = useQuery<any[]>({
		queryKey: ["rental-accruals"],
		queryFn: () => api.get("/rental/accruals").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery<any[]>({
		queryKey: getListLeaseContractsQueryKey(),
		queryFn: () => api.get("/rental/contracts").then((r) => r.data),
	});
	const { data: tenants = [] } = useQuery<any[]>({
		queryKey: getListTenantsQueryKey(),
		queryFn: () => api.get("/rental/tenants").then((r) => r.data),
	});
	const cols = useMemo(() => getMonthCols(parseInt(horizon, 10)), [horizon]);

	// Build grid: row = tenant+contract, col = month
	const rows = useMemo(() => {
		const tenantMap = new Map(tenants.map((t: any) => [t.id, t]));

		// Group accruals by contract
		const contractAccruals: Record<number, any[]> = {};
		accruals.forEach((a: any) => {
			if (!contractAccruals[a.leaseContractId])
				contractAccruals[a.leaseContractId] = [];
			contractAccruals[a.leaseContractId].push(a);
		});

		// For each active contract, build monthly cells
		const activeContracts = contracts.filter((c: any) => c.status === "active");
		return activeContracts.map((contract: any) => {
			const tenant = tenantMap.get(contract.tenantId);
			const contractAccs = contractAccruals[contract.id] || [];

			const cells: Record<
				string,
				{
					charged: number;
					paid: number;
					balance: number;
					status: "paid" | "partial" | "pending" | "overdue" | "future";
				}
			> = {};
			cols.forEach((col) => {
				const monthAccruals = contractAccs.filter((a: any) =>
					(a.period || "").startsWith(col.key),
				);
				const charged = monthAccruals.reduce(
					(s: number, a: any) => s + parseFloat(a.amount || 0),
					0,
				);
				const balance = monthAccruals.reduce(
					(s: number, a: any) => s + parseFloat(a.balance || 0),
					0,
				);
				const paid = charged - balance;

				let status: "paid" | "partial" | "pending" | "overdue" | "future" =
					"future";
				if (charged > 0) {
					if (balance <= 0) status = "paid";
					else if (paid > 0) status = "partial";
					else if (col.key < todayKey) status = "overdue";
					else status = "pending";
				} else {
					// Projected from contract rent amount
					if (col.key >= todayKey) {
						status = "future";
					}
				}

				const projectedAmount = charged || parseFloat(contract.rentAmount || 0);
				cells[col.key] = {
					charged: projectedAmount,
					paid,
					balance: charged > 0 ? balance : 0,
					status,
				};
			});

			return { contract, tenant, cells };
		});
	}, [accruals, contracts, tenants, cols, todayKey]);

	// Column totals
	const colTotals = useMemo(() => {
		const totals: Record<string, number> = {};
		cols.forEach((col) => {
			totals[col.key] = rows.reduce(
				(s, r) => s + (r.cells[col.key]?.charged || 0),
				0,
			);
		});
		return totals;
	}, [rows, cols]);

	const totalExpected = Object.values(colTotals).reduce((s, v) => s + v, 0);
	const overdueCount = rows.reduce(
		(s, r) =>
			s + cols.filter((c) => r.cells[c.key]?.status === "overdue").length,
		0,
	);
	const paidCount = rows.reduce(
		(s, r) => s + cols.filter((c) => r.cells[c.key]?.status === "paid").length,
		0,
	);

	function cellStyle(status: string) {
		switch (status) {
			case "paid":
				return "bg-emerald-100 text-emerald-800";
			case "partial":
				return "bg-amber-100 text-amber-800";
			case "overdue":
				return "bg-rose-100 text-rose-800";
			case "pending":
				return "bg-blue-100 text-blue-800";
			case "future":
				return "bg-violet-50 text-violet-800 border border-violet-200";
			default:
				return "text-gray-500";
		}
	}

	function headerStyle(colKey: string) {
		if (colKey === todayKey) return "bg-blue-50 text-blue-700";
		if (colKey > todayKey) return "bg-violet-50 text-violet-800";
		return "text-gray-700";
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Прогноз поступлений
					</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Ожидаемые поступления по месяцам
					</p>
				</div>
				<Select value={horizon} onValueChange={setHorizon}>
					<SelectTrigger className="w-40 h-8 text-sm">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="3">3 месяца</SelectItem>
						<SelectItem value="6">6 месяцев</SelectItem>
						<SelectItem value="9">9 месяцев</SelectItem>
						<SelectItem value="12">12 месяцев</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* KPIs */}
			<div className="grid grid-cols-4 gap-4 mb-6">
				<div className="bg-white border rounded-xl p-4">
					<div className="flex items-center gap-2 mb-1">
						<TrendingUp className="w-4 h-4 text-blue-500" />
						<span className="text-xs text-gray-500">
							Ожидается за {horizon} мес.
						</span>
					</div>
					<p className="text-xl font-bold text-blue-600">
						{fmtKGS(totalExpected)} сом
					</p>
				</div>
				<div className="bg-white border rounded-xl p-4">
					<div className="flex items-center gap-2 mb-1">
						<CalendarClock className="w-4 h-4 text-emerald-600" />
						<span className="text-xs text-gray-500">Активных договоров</span>
					</div>
					<p className="text-xl font-bold text-emerald-600">{rows.length}</p>
				</div>
				<div className="bg-white border rounded-xl p-4">
					<div className="flex items-center gap-2 mb-1">
						<CheckCircle className="w-4 h-4 text-emerald-600" />
						<span className="text-xs text-gray-500">Оплачено периодов</span>
					</div>
					<p className="text-xl font-bold text-emerald-600">{paidCount}</p>
				</div>
				<div className="bg-white border rounded-xl p-4">
					<div className="flex items-center gap-2 mb-1">
						<AlertTriangle className="w-4 h-4 text-rose-600" />
						<span className="text-xs text-gray-500">Просроченных</span>
					</div>
					<p className="text-xl font-bold text-rose-600">{overdueCount}</p>
				</div>
			</div>

			{/* Legend */}
			<div className="flex items-center gap-4 mb-3 text-xs">
				{[
					{ label: "Оплачено", cls: "bg-emerald-100 text-emerald-800" },
					{ label: "Частично", cls: "bg-amber-100 text-amber-800" },
					{ label: "Просрочено", cls: "bg-rose-100 text-rose-800" },
					{ label: "Ожидается", cls: "bg-blue-100 text-blue-800" },
					{ label: "Прогноз", cls: "bg-violet-50 text-violet-800 border border-violet-200" },
				].map((l) => (
					<div
						key={l.label}
						className={`px-2 py-0.5 rounded-md font-medium ${l.cls}`}
					>
						{l.label}
					</div>
				))}
			</div>

			<MatrixTableFrame
				title="Матрица по месяцам"
				maxHeight="calc(100vh - 320px)"
				onExportCsv={() => {
					const esc = (v: string) =>
						/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
					const header = [
						"Арендатор",
						"Объект",
						...cols.map((c) => c.label),
						"Итого",
					].join(";");
					const lines = rows.map((row) => {
						const name =
							row.tenant?.name ||
							row.tenant?.fullName ||
							`Дог. #${row.contract.id}`;
						const addr =
							row.contract.propertyAddress || `Договор #${row.contract.id}`;
						const vals = cols.map((c) =>
							String(row.cells[c.key]?.charged || 0),
						);
						const total = cols.reduce(
							(s, col) => s + (row.cells[col.key]?.charged || 0),
							0,
						);
						return [name, addr, ...vals, String(total)].map(esc).join(";");
					});
					const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], {
						type: "text/csv;charset=utf-8",
					});
					const a = document.createElement("a");
					a.href = URL.createObjectURL(blob);
					a.download = "prognoz-postuplenij.csv";
					a.click();
				}}
			>
				<table className="text-sm w-full min-w-max border-collapse">
					<thead>
						<tr className="border-b border-am-border">
							<th
								className={`${MATRIX_TH_STICKY_LEFT} text-left min-w-[180px]`}
							>
								Арендатор / Объект
							</th>
							{cols.map((col) => (
								<th
									key={col.key}
									className={`${MATRIX_TH_CENTER} min-w-[110px] ${headerStyle(col.key)}`}
								>
									{col.label}
									{col.key === todayKey && (
										<div className="text-[10px] text-blue-500 font-normal normal-case tracking-normal">
											текущий
										</div>
									)}
								</th>
							))}
							<th className={`${MATRIX_TH_RIGHT} min-w-[100px]`}>Итого</th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							<tr>
								<td
									colSpan={cols.length + 2}
									className="text-center py-12 text-gray-400"
								>
									Загрузка...
								</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td
									colSpan={cols.length + 2}
									className="text-center py-12 text-gray-400"
								>
									Нет активных договоров аренды
								</td>
							</tr>
						) : (
							rows.map((row, idx) => {
								const rowTotal = cols.reduce(
									(s, col) => s + (row.cells[col.key]?.charged || 0),
									0,
								);
								return (
									<tr
										key={row.contract.id}
										className={`border-b ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
									>
										<td className="p-3 sticky left-0 bg-inherit font-medium text-gray-900 border-r">
											<p className="font-medium">
												{row.tenant?.name ||
													row.tenant?.fullName ||
													`Дог. #${row.contract.id}`}
											</p>
											<p className="text-xs text-gray-400">
												{row.contract.propertyAddress ||
													`Договор #${row.contract.id}`}
											</p>
										</td>
										{cols.map((col) => {
											const cell = row.cells[col.key];
											return (
												<td
													key={col.key}
													className={`p-2 text-center ${col.key === todayKey ? "bg-blue-50/40" : col.key > todayKey ? "bg-violet-50/30" : ""}`}
												>
													{cell && cell.charged > 0 ? (
														<div
															className={`mx-auto rounded-lg px-2 py-1.5 text-xs font-medium ${cellStyle(cell.status)}`}
														>
															{fmtKGS(cell.charged)}
															{cell.status === "partial" && (
																<div className="text-[10px] opacity-70">
																	+{fmtKGS(cell.paid)} / {fmtKGS(cell.balance)}{" "}
																	долг
																</div>
															)}
														</div>
													) : (
														<div className="text-gray-300 text-xs">—</div>
													)}
												</td>
											);
										})}
										<td className="p-3 text-right font-bold text-gray-900">
											{fmtKGS(rowTotal)}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
					{/* Column totals row */}
					{rows.length > 0 && (
						<tfoot>
							<tr className="bg-gray-100 border-t-2 font-bold">
								<td className="p-3 sticky left-0 bg-gray-100 text-gray-700 border-r">
									ИТОГО
								</td>
								{cols.map((col) => (
									<td
										key={col.key}
										className={`p-3 text-center ${col.key === todayKey ? "bg-blue-100 text-blue-700" : col.key > todayKey ? "bg-violet-50 text-violet-800" : "text-blue-700"}`}
									>
										{fmtKGS(colTotals[col.key])}
									</td>
								))}
								<td className="p-3 text-right text-blue-700">
									{fmtKGS(totalExpected)}
								</td>
							</tr>
						</tfoot>
					)}
				</table>
			</MatrixTableFrame>
		</div>
	);
}
