import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	getListAccrualsQueryKey,
	getListLeaseContractsQueryKey,
	getListPaymentsQueryKey,
} from "@/lib/rental-query-keys";
import {
	AlertTriangle,
	Banknote,
	Clock,
	Receipt,
	RefreshCw,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { defaultPeriod, inPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import {
	AccrualActionButtons,
	DiscountDialog,
	fmtCurrency,
	formatDate,
	LeaseCombobox,
	QuickPayDialog,
	statusColors,
	statusLabels,
	type Accrual,
} from "@/components/rental/accrual-components";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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

	type EnrichedAccrual = (typeof enrichedAccruals)[number];

	const tableColumns = useMemo<ColumnDef<EnrichedAccrual, unknown>[]>(
		() => [
			{
				id: "projectName",
				header: "Объект",
				size: 130,
				accessorFn: (row) => row.projectName,
				meta: { exportLabel: "Объект", pinned: "left" },
				cell: ({ row }) => row.original.projectName,
			},
			{
				id: "contractLabel",
				header: "Договор",
				size: 280,
				minSize: 140,
				maxSize: 720,
				accessorFn: (row) => row.contractLabel,
				meta: { exportLabel: "Договор", grow: true },
				cell: ({ row }) => row.original.contractLabel,
			},
			{
				accessorKey: "period",
				header: "Период",
				size: 90,
				meta: { exportLabel: "Период" },
				cell: ({ row }) => row.original.period,
			},
			{
				id: "amount",
				header: "Сумма",
				size: 110,
				accessorFn: (row) => parseFloat(row.amount || "0"),
				meta: { exportLabel: "Сумма", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono">{fmtCurrency(parseFloat(row.original.amount))}</span>
				),
			},
			{
				id: "discountAmount",
				header: "Скидка",
				size: 100,
				accessorFn: (row) => parseFloat(row.discountAmount || "0"),
				meta: { exportLabel: "Скидка", align: "right" },
				cell: ({ row }) =>
					parseFloat(row.original.discountAmount || "0") > 0
						? `-${fmtCurrency(parseFloat(row.original.discountAmount!))}`
						: "—",
			},
			{
				id: "paidAmount",
				header: "Оплачено",
				size: 110,
				accessorFn: (row) => parseFloat(row.paidAmount || "0"),
				meta: { exportLabel: "Оплачено", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono text-emerald-700">
						{fmtCurrency(parseFloat(row.original.paidAmount))}
					</span>
				),
			},
			{
				id: "balance",
				header: "Остаток",
				size: 110,
				accessorFn: (row) => parseFloat(row.balance || "0"),
				meta: { exportLabel: "Остаток", align: "right" },
				cell: ({ row }) => (
					<span
						className={`font-mono font-medium ${parseFloat(row.original.balance) > 0 ? "text-rose-600" : "text-emerald-600"}`}
					>
						{fmtCurrency(parseFloat(row.original.balance))}
					</span>
				),
			},
			{
				id: "dueDate",
				header: "Срок",
				size: 100,
				accessorFn: (row) => row.dueDate,
				meta: { exportLabel: "Срок", pinned: "left" },
				cell: ({ row }) => formatDate(row.original.dueDate),
			},
			{
				id: "status",
				header: "Статус",
				size: 120,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => (
					<Badge className={statusColors[row.original.status]} variant="secondary">
						{statusLabels[row.original.status] || row.original.status}
					</Badge>
				),
			},
			{
				id: "actions",
				header: "",
				size: 50,
				enableSorting: false,
				enableResizing: false,
				meta: { align: "center" },
				cell: ({ row }) => (
					<AccrualActionButtons
						accrual={row.original}
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

				<p className="text-xs text-gray-500 ml-auto">{enrichedAccruals.length} записей</p>
			</div>

			<DataTable
					tableId="rental-accruals"
					columns={tableColumns}
					data={enrichedAccruals}
					isLoading={isLoading}
					enableSearch
					searchPlaceholder="Поиск по объекту, договору…"
					initialSorting={[{ id: "dueDate", desc: true }]}
					emptyState={
						<div className="py-8 text-center text-sm text-muted-foreground">
							{accruals?.length
								? "Начисления не соответствуют фильтру"
								: "Начисления не найдены. Создайте договор аренды — начисления появятся автоматически."}
						</div>
					}
					footer={
						!isLoading && filtered.length > 0 ? (
							<tr className="bg-gray-50 font-semibold border-t-2">
								<td colSpan={3} className="px-3 py-2 text-sm text-gray-600">
									Итого: {filtered.length}
								</td>
								<td className="px-3 py-2 font-mono text-right">
									{fmtCurrency(filteredAmount)}
								</td>
								<td />
								<td className="px-3 py-2 font-mono text-right text-emerald-700">
									{fmtCurrency(
										filtered.reduce((s, a) => s + (parseFloat(a.paidAmount) || 0), 0),
									)}
								</td>
								<td className="px-3 py-2 font-mono text-right text-rose-700">
									{fmtCurrency(filteredBalance)}
								</td>
								<td colSpan={3} />
							</tr>
						) : undefined
					}
				/>

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
