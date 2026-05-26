import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	getListAccrualsQueryKey,
	getListLeaseContractsQueryKey,
	getListPaymentsQueryKey,
} from "@/lib/rental-query-keys";
import {
	AlertTriangle,
	Banknote,
	Building2,
	ChevronDown,
	Clock,
	List,
	Receipt,
	RefreshCw,
} from "lucide-react";
import { useMemo, useState } from "react";
import { defaultPeriod, inPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import {
	AccrualActionButtons,
	AccrualRow,
	AccrualsTableHeader,
	DiscountDialog,
	fmtCurrency,
	formatDate,
	LeaseCombobox,
	QuickPayDialog,
	statusColors,
	statusLabels,
	type Accrual,
} from "@/components/rental/accrual-components";
import { RentalExcelTable, type RentalExcelColumn } from "@/components/rental/rental-excel-table";
import { RentalViewModeToggle } from "@/components/rental/rental-view-mode-toggle";
import { useRentalViewMode } from "@/hooks/use-rental-view-mode";
import { useSortable } from "@/lib/use-sortable";
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
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiBase } from "@/lib/api-base";
import { cn } from "@/lib/utils";

const BASE = getApiBase();
const authHeaders = () => {
	const token = localStorage.getItem("auth_token");
	return {
		"Content-Type": "application/json",
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};
};

async function patchAccrual(id: number, body: Record<string, unknown>) {
	const res = await fetch(`${BASE}/rental/accruals/${id}`, {
		method: "PATCH",
		headers: authHeaders(),
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error("Ошибка обновления начисления");
	return res.json();
}

export default function Accruals() {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [leaseFilter, setLeaseFilter] = useState<string>("all");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
	const [loadingId, setLoadingId] = useState<number | null>(null);
	const [discountAccrual, setDiscountAccrual] = useState<Accrual | null>(null);
	const [quickPayAccrual, setQuickPayAccrual] = useState<Accrual | null>(null);
	const [recalcLoading, setRecalcLoading] = useState(false);
	const [groupByObject, setGroupByObject] = useState(true);
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
	const [viewMode, setViewMode] = useRentalViewMode("accruals");

	const toggleGroup = (key: string) => {
		setExpandedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const { data: accruals, isLoading } = useQuery<Accrual[]>({
		queryKey: getListAccrualsQueryKey(),
		queryFn: () => api.get("/rental/accruals").then((r) => r.data),
	});

	const { data: leases } = useQuery<any[]>({
		queryKey: getListLeaseContractsQueryKey(),
		queryFn: () => api.get("/rental/contracts").then((r) => r.data),
	});

	// Build a rich lease info map
	const leaseInfoMap = useMemo(() => {
		const leasesArray = Array.isArray(leases) ? leases : [];
		const map: Record<
			number,
			{
				label: string;
				projectName: string;
				unitNumber: string;
				contractNumber: string;
				tenantName: string;
			}
		> = {};
		for (const l of leasesArray) {
			map[l.id] = {
				label: `${l.contractNumber} — ${l.tenantName || ""}`.trim(),
				projectName: l.propertyProjectName || "Без проекта",
				unitNumber: l.propertyUnitNumber || "",
				contractNumber: l.contractNumber || "",
				tenantName: l.tenantName || "",
			};
		}
		return map;
	}, [leases]);

	const filtered = useMemo(() => {
		const accrualsArray = Array.isArray(accruals) ? accruals : [];
		return accrualsArray.filter((a) => {
			if (leaseFilter !== "all" && String(a.leaseContractId) !== leaseFilter)
				return false;
			if (statusFilter !== "all" && a.status !== statusFilter) return false;
			if (!inPeriod(a.dueDate, period)) return false;
			return true;
		});
	}, [accruals, leaseFilter, statusFilter, period]);

	// Group by project name
	const grouped = useMemo(() => {
		if (!groupByObject) return null;
		const map = new Map<string, Accrual[]>();
		for (const a of filtered) {
			const key = leaseInfoMap[a.leaseContractId]?.projectName || "Без проекта";
			if (!map.has(key)) map.set(key, []);
			map.get(key)?.push(a);
		}
		return map;
	}, [filtered, leaseInfoMap, groupByObject]);

	const enrichedAccruals = useMemo(
		() =>
			filtered.map((a) => {
				const info = leaseInfoMap[a.leaseContractId];
				return {
					...a,
					projectName: info?.projectName || "Без проекта",
					contractLabel: info?.label || `#${a.leaseContractId}`,
					tenantName: info?.tenantName || "",
				};
			}),
		[filtered, leaseInfoMap],
	);
	const { sorted: sortedAccruals, sortKey, sortDir, toggle } = useSortable(
		enrichedAccruals,
		"dueDate",
	);

	const filteredBalance = filtered.reduce(
		(s, a) => s + (parseFloat(a.balance) || 0),
		0,
	);
	const filteredAmount = filtered.reduce(
		(s, a) => s + (parseFloat(a.amount) || 0),
		0,
	);
	const filteredPending = filtered.filter((a) => a.status === "pending").length;
	const filteredOverdue = filtered.filter((a) => a.status === "overdue").length;

	const handleStatusChange = async (id: number, newStatus: string) => {
		setLoadingId(id);
		try {
			await patchAccrual(id, { status: newStatus });
			toast({
				title:
					newStatus === "approved"
						? "Начисление подтверждено"
						: "Начисление отменено",
			});
			queryClient.invalidateQueries({ queryKey: getListAccrualsQueryKey() });
		} catch {
			toast({
				title: "Ошибка",
				description: "Не удалось обновить начисление",
				variant: "destructive",
			});
		} finally {
			setLoadingId(null);
		}
	};

	const accrualColumns: RentalExcelColumn<(typeof enrichedAccruals)[number]>[] = useMemo(
		() => [
		{ key: "projectName", label: "Объект", width: 130, render: (r) => r.projectName },
		{ key: "contractLabel", label: "Договор", width: 160, render: (r) => r.contractLabel },
		{ key: "period", label: "Период", width: 90, render: (r) => r.period },
		{ key: "amount", label: "Сумма", width: 100, align: "right", render: (r) => fmtCurrency(parseFloat(r.amount)) },
		{
			key: "discountAmount", label: "Скидка", width: 90, align: "right",
			render: (r) =>
				parseFloat(r.discountAmount || "0") > 0
					? `-${fmtCurrency(parseFloat(r.discountAmount!))}`
					: "—",
		},
		{ key: "paidAmount", label: "Оплачено", width: 100, align: "right", render: (r) => fmtCurrency(parseFloat(r.paidAmount)) },
		{
			key: "balance", label: "Остаток", width: 100, align: "right",
			render: (r) => (
				<span className={parseFloat(r.balance) > 0 ? "text-rose-600 font-medium" : "text-emerald-600"}>
					{fmtCurrency(parseFloat(r.balance))}
				</span>
			),
		},
		{ key: "dueDate", label: "Срок", width: 90, render: (r) => formatDate(r.dueDate) },
		{
			key: "status", label: "Статус", width: 100, align: "center",
			render: (r) => (
				<span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[r.status] || "bg-gray-100"}`}>
					{statusLabels[r.status] || r.status}
				</span>
			),
		},
		{
			key: "actions",
			label: "",
			width: 44,
			align: "center",
			sortable: false,
			render: (r) => (
				<AccrualActionButtons
					accrual={r}
					loadingId={loadingId}
					onAccept={setQuickPayAccrual}
					onStatusChange={handleStatusChange}
					onDiscount={setDiscountAccrual}
				/>
			),
		},
	],
		[loadingId],
	);

	const accrualsArray = Array.isArray(accruals) ? accruals : [];
	const pendingCount = accrualsArray.filter(
		(a) => a.status === "pending",
	).length;

	const handleRecalculate = async () => {
		if (leaseFilter === "all") return;
		setRecalcLoading(true);
		try {
			const res = await fetch(`${BASE}/rental/accruals/recalculate`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({ leaseContractId: parseInt(leaseFilter, 10) }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || "Ошибка пересчёта");
			}
			const data = await res.json();
			toast({
				title: "Начисления пересчитаны",
				description: `Добавлено ${data.inserted} новых начислений с учётом пропорций`,
			});
			queryClient.invalidateQueries({ queryKey: getListAccrualsQueryKey() });
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err?.message,
				variant: "destructive",
			});
		} finally {
			setRecalcLoading(false);
		}
	};

	return (
		<div className="space-y-3">
			<KpiRow>
				<KpiCard variant="strip" label="Начислений" value={filtered.length} sub="за период" icon={Receipt} color="blue" loading={isLoading} />
				<KpiCard variant="strip" label="Ожидают" value={filteredPending} sub={filteredOverdue > 0 ? `${filteredOverdue} просрочено` : "подтверждения"} icon={Clock} color="yellow" loading={isLoading} />
				<KpiCard variant="strip" label="Начислено" value={fmtCurrency(filteredAmount)} sub="за период" icon={Banknote} color="purple" loading={isLoading} />
				<KpiCard variant="strip" label="Остаток" value={fmtCurrency(filteredBalance)} sub="к оплате" icon={AlertTriangle} color="red" loading={isLoading} />
			</KpiRow>

			<div className="flex justify-between items-start flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Начисления</h1>
					<p className="text-sm text-gray-500 mt-1">
						Ежемесячные начисления по договорам аренды
						{pendingCount > 0 && (
							<span className="ml-2 text-amber-600 font-medium">
								· {pendingCount} ожидают
							</span>
						)}
					</p>
				</div>
				<RentalViewModeToggle mode={viewMode} onChange={setViewMode} />
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<PeriodPicker value={period} onChange={setPeriod} />
				<LeaseCombobox
					value={leaseFilter}
					onValueChange={setLeaseFilter}
					leases={leases || []}
				/>

				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-44 h-9">
						<SelectValue placeholder="Все статусы" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все статусы</SelectItem>
						<SelectItem value="pending">Ожидает</SelectItem>
						<SelectItem value="approved">Подтверждено</SelectItem>
						<SelectItem value="partial">Частично</SelectItem>
						<SelectItem value="paid">Оплачено</SelectItem>
						<SelectItem value="overdue">Просрочено</SelectItem>
						<SelectItem value="cancelled">Отменено</SelectItem>
					</SelectContent>
				</Select>

				{viewMode === "classic" && (
					<Button
						variant={groupByObject ? "default" : "outline"}
						size="sm"
						onClick={() => setGroupByObject(!groupByObject)}
						className="gap-2"
					>
						{groupByObject ? (
							<>
								<Building2 className="w-4 h-4" /> По объектам
							</>
						) : (
							<>
								<List className="w-4 h-4" /> Списком
							</>
						)}
					</Button>
				)}

				{leaseFilter !== "all" && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleRecalculate}
						disabled={recalcLoading}
						className="gap-2 text-blue-700 border-blue-300 hover:bg-blue-50"
					>
						<RefreshCw
							className={cn("w-4 h-4", recalcLoading && "animate-spin")}
						/>
						{recalcLoading ? "Пересчёт..." : "Пересчитать начисления"}
					</Button>
				)}

				<p className="text-xs text-gray-500 ml-auto">{sortedAccruals.length} записей</p>
			</div>

			{isLoading ? (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<Table>
						<AccrualsTableHeader />
						<TableBody>
							{Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 9 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			) : !filtered.length ? (
				<div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
					{accruals?.length
						? "Начисления не соответствуют фильтру"
						: "Начисления не найдены. Создайте договор аренды — начисления появятся автоматически."}
				</div>
			) : viewMode === "report" ? (
				<RentalExcelTable
					columns={accrualColumns}
					rows={sortedAccruals}
					sortKey={sortKey}
					sortDir={sortDir}
					onSort={toggle}
					emptyMessage="Начисления не найдены"
					rowKey={(r) => r.id}
					footer={[
						{ colSpan: 3, content: `Итого: ${filtered.length}` },
						{ content: fmtCurrency(filteredAmount), align: "right" },
						{ content: "—", align: "right" },
						{
							content: fmtCurrency(
								filtered.reduce((s, a) => s + (parseFloat(a.paidAmount) || 0), 0),
							),
							align: "right",
						},
						{ content: fmtCurrency(filteredBalance), align: "right", className: "text-rose-700" },
						{ colSpan: 3, content: "" },
					]}
				/>
			) : groupByObject && grouped ? (
				<div className="space-y-4">
					{Array.from(grouped.entries()).map(([projectName, rows]) => {
						const rowsArray = Array.isArray(rows) ? rows : [];
						const groupBalance = rowsArray.reduce(
							(s, a) => s + (parseFloat(a.balance) || 0),
							0,
						);
						const groupPending = rowsArray.filter(
							(a) => a.status === "pending",
						).length;
						const isExpanded = expandedGroups.has(projectName);
						return (
							<div
								key={projectName}
								className="bg-white rounded-xl border border-gray-200 overflow-hidden"
							>
								<button
									type="button"
									className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
									onClick={() => toggleGroup(projectName)}
								>
									<div className="flex items-center gap-2">
										<ChevronDown
											className={cn(
												"w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200",
												!isExpanded && "-rotate-90",
											)}
										/>
										<Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
										<span className="font-semibold text-gray-800 text-sm">
											{projectName}
										</span>
										<span className="text-gray-400 text-xs">
											· {rowsArray.length} начисл.
										</span>
										{groupPending > 0 && (
											<span className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
												{groupPending} ожидают
											</span>
										)}
									</div>
									{groupBalance > 0 && (
										<span className="text-sm font-bold text-rose-600">
											Долг: {fmtCurrency(groupBalance)}
										</span>
									)}
								</button>

								{isExpanded && (
									<Table>
										<AccrualsTableHeader label="Помещение / Договор" />
										<TableBody>
											{rowsArray.map((accrual) => {
												const info = leaseInfoMap[accrual.leaseContractId];
												const rowLabel = info
													? `${info.unitNumber ? `кв. ${info.unitNumber}` : ""} ${info.tenantName ? `— ${info.tenantName}` : ""}`.trim() ||
														info.label
													: `#${accrual.leaseContractId}`;
												return (
													<AccrualRow
														key={accrual.id}
														accrual={accrual}
														label={rowLabel}
														loadingId={loadingId}
														onAccept={setQuickPayAccrual}
														onStatusChange={handleStatusChange}
														onDiscount={setDiscountAccrual}
													/>
												);
											})}
										</TableBody>
									</Table>
								)}
							</div>
						);
					})}
				</div>
			) : (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<Table>
						<AccrualsTableHeader />
						<TableBody>
							{filtered.map((accrual) => (
								<AccrualRow
									key={accrual.id}
									accrual={accrual}
									label={
										leaseInfoMap[accrual.leaseContractId]?.label ||
										`#${accrual.leaseContractId}`
									}
									loadingId={loadingId}
									onAccept={setQuickPayAccrual}
									onStatusChange={handleStatusChange}
									onDiscount={setDiscountAccrual}
								/>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			<DiscountDialog
				accrual={discountAccrual}
				onClose={() => setDiscountAccrual(null)}
				onSaved={() =>
					queryClient.invalidateQueries({ queryKey: getListAccrualsQueryKey() })
				}
			/>

			<QuickPayDialog
				accrual={quickPayAccrual}
				leaseContractId={quickPayAccrual?.leaseContractId ?? null}
				onClose={() => setQuickPayAccrual(null)}
				onSaved={() => {
					queryClient.invalidateQueries({ queryKey: getListAccrualsQueryKey() });
					queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
				}}
			/>
		</div>
	);
}
