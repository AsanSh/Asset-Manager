import { AlertTriangle, Mail, Phone, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import { RentalDebtMatrix } from "@/components/rental/rental-debt-matrix";
import { RentalExcelTable, type RentalExcelColumn } from "@/components/rental/rental-excel-table";
import { RentalViewModeToggle } from "@/components/rental/rental-view-mode-toggle";
import { useToast } from "@/hooks/use-toast";
import { useRentalViewMode } from "@/hooks/use-rental-view-mode";
import {
	fmtCurrency,
	fmtDate,
	fmtNum,
	periodLabel,
	sortDebtRows,
	useRentalOverdueSearch,
	type ContractDebtRow,
	type OverdueItem,
} from "@/lib/rental-overdue";
import { useSortable } from "@/lib/use-sortable";

function debtColor(days: number) {
	if (days > 60) return "bg-rose-100 text-rose-800";
	if (days > 30) return "bg-amber-100 text-amber-800";
	if (days > 14) return "bg-amber-100 text-amber-800";
	return "bg-blue-100 text-blue-800";
}

export default function RentalOverdue() {
	const { toast } = useToast();
	const [viewMode, setViewMode] = useRentalViewMode("overdue");
	const {
		isLoading,
		overdueItems,
		contractRows,
		periodColumns,
		totalDebt,
		debtorCount,
		criticalCount,
		search,
		setSearch,
	} = useRentalOverdueSearch();

	const [matrixSortKey, setMatrixSortKey] = useState("total");
	const [matrixSortDir, setMatrixSortDir] = useState<"asc" | "desc">("desc");

	const sortedMatrix = useMemo(
		() => sortDebtRows(contractRows, matrixSortKey, matrixSortDir),
		[contractRows, matrixSortKey, matrixSortDir],
	);

	const matrixToggleSort = (key: string) => {
		if (matrixSortKey === key) setMatrixSortDir((d) => (d === "asc" ? "desc" : "asc"));
		else {
			setMatrixSortKey(key);
			setMatrixSortDir(key === "tenantName" || key === "propertyLabel" ? "asc" : "desc");
		}
	};

	const flatItems = useMemo(
		() =>
			overdueItems.map((i) => ({
				...i,
				tenantName: i.tenant?.fullName || i.tenant?.name || "",
				balanceNum: parseFloat(i.balance || "0") || 0,
			})),
		[overdueItems],
	);

	const { sorted: sortedItems, sortKey, sortDir, toggle } = useSortable(flatItems, "days");

	function notifyTenant(row: ContractDebtRow) {
		toast({
			title: `Уведомление отправлено`,
			description: row.tenantName,
		});
	}

	function notifyItem(item: OverdueItem) {
		toast({
			title: `Уведомление отправлено`,
			description: item.tenant?.fullName || item.tenant?.name || "арендатору",
		});
	}

	const classicColumns: RentalExcelColumn<(typeof flatItems)[number]>[] = [
		{
			key: "tenantName",
			label: "Арендатор",
			width: 160,
			render: (r) => (
				<div>
					<p className="font-medium truncate">{r.tenant?.fullName || r.tenant?.name || "—"}</p>
					<p className="text-[10px] text-gray-400 truncate">{r.contract?.propertyAddress || `Дог. #${r.leaseContractId}`}</p>
					{r.tenant?.phone && (
						<p className="text-[10px] text-blue-500 flex items-center gap-0.5 mt-0.5">
							<Phone className="w-2.5 h-2.5" />
							{r.tenant.phone}
						</p>
					)}
				</div>
			),
		},
		{ key: "period", label: "Период", width: 90, render: (r) => periodLabel(r.period) },
		{
			key: "balanceNum",
			label: "Долг",
			width: 100,
			align: "right",
			render: (r) => <span className="font-bold text-rose-600">{fmtCurrency(r.balance, r.currency)}</span>,
		},
		{ key: "dueDate", label: "Срок", width: 90, render: (r) => fmtDate(r.dueDate) },
		{
			key: "days",
			label: "Просрочка",
			width: 80,
			align: "center",
			render: (r) => <Badge className={debtColor(r.days)}>{r.days} дн.</Badge>,
		},
		{
			key: "actions",
			label: "",
			width: 90,
			align: "center",
			sortable: false,
			resizable: false,
			render: (r) => (
				<Button
					variant="outline"
					size="sm"
					className="h-6 text-[10px] gap-1 px-2"
					onClick={() => notifyItem(r)}
				>
					<Mail className="w-3 h-3" />
					Уведомить
				</Button>
			),
		},
	];

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Просроченные платежи</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Реестр должников по периодам · рассылка уведомлений
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Input
						className="w-48 h-8 text-sm"
						placeholder="Поиск..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<RentalViewModeToggle mode={viewMode} onChange={setViewMode} />
				</div>
			</div>

			<KpiRow cols={4}>
				<KpiCard variant="strip" label="Общий долг" value={fmtCurrency(totalDebt)} icon={AlertTriangle} color="red" loading={isLoading} />
				<KpiCard variant="strip" label="Должников" value={debtorCount} sub={`${overdueItems.length} начисл.`} icon={Users} color="yellow" loading={isLoading} />
				<KpiCard variant="strip" label="Критич. 60+ дн." value={criticalCount} icon={AlertTriangle} color="red" loading={isLoading} />
				<KpiCard variant="strip" label="Периодов" value={periodColumns.length} sub="в матрице" icon={Mail} color="purple" loading={isLoading} />
			</KpiRow>

			{viewMode === "report" ? (
				<>
					<p className="text-xs text-gray-500">
						Строки — арендаторы · столбцы — неоплаченные периоды · «—» = нет долга за месяц
					</p>
					<RentalDebtMatrix
						mode="period"
						rows={sortedMatrix}
						periodColumns={periodColumns}
						isLoading={isLoading}
						sortKey={matrixSortKey}
						sortDir={matrixSortDir}
						onSort={matrixToggleSort}
						footerTotal={totalDebt}
						emptyMessage="Просроченных долгов нет"
						trailingColumn={{
							label: "Действ.",
							width: 72,
							render: (row) => (
								<Button
									variant="outline"
									size="sm"
									className="h-6 text-[10px] gap-1 px-1.5"
									onClick={() => notifyTenant(row)}
								>
									<Mail className="w-3 h-3" />
								</Button>
							),
						}}
					/>
				</>
			) : (
				<RentalExcelTable
					columns={classicColumns}
					rows={sortedItems}
					sortKey={sortKey}
					sortDir={sortDir}
					onSort={toggle}
					isLoading={isLoading}
					emptyMessage="Просроченных долгов нет"
					footer={[
						{ colSpan: 2, content: `Итого: ${overdueItems.length}` },
						{ content: fmtNum(totalDebt), align: "right", className: "font-bold text-rose-700" },
						{ colSpan: 3, content: "" },
					]}
				/>
			)}
		</div>
	);
}
