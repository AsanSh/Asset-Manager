import { AlertTriangle, Mail, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import { RentalDebtMatrix } from "@/components/rental/rental-debt-matrix";
import { useToast } from "@/hooks/use-toast";
import {
	fmtCurrency,
	fmtNum,
	sortDebtRows,
	useRentalOverdueSearch,
	type ContractDebtRow,
} from "@/lib/rental-overdue";
export default function RentalOverdue() {
	const { toast } = useToast();
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

	function notifyTenant(row: ContractDebtRow) {
		toast({
			title: `Уведомление отправлено`,
			description: row.tenantName,
		});
	}

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
				</div>
			</div>

			<KpiRow cols={4}>
				<KpiCard variant="strip" label="Общий долг" value={fmtCurrency(totalDebt)} icon={AlertTriangle} color="red" loading={isLoading} />
				<KpiCard variant="strip" label="Должников" value={debtorCount} sub={`${overdueItems.length} начисл.`} icon={Users} color="yellow" loading={isLoading} />
				<KpiCard variant="strip" label="Критич. 60+ дн." value={criticalCount} icon={AlertTriangle} color="red" loading={isLoading} />
				<KpiCard variant="strip" label="Периодов" value={periodColumns.length} sub="в матрице" icon={Mail} color="purple" loading={isLoading} />
			</KpiRow>

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
		</div>
	);
}
