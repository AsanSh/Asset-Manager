import { useQueryClient } from "@tanstack/react-query";
import { useSortable } from "@/lib/use-sortable";
import { CalendarClock, CheckCircle2, FileText, Plus, Wallet } from "lucide-react";
import { useState } from "react";
import {
	getListAccrualsQueryKey,
	getListLeaseContractsQueryKey,
	getListRentalPropertiesQueryKey,
	type LeaseContract,
	useListLeaseContracts,
} from "@/api-client";
import {
	CreateLeaseDialog,
	EditLeaseDialog,
	LeaseTable,
	RecalcDialog,
	TerminateLeaseDialog,
} from "@/components/rental/lease-dialogs";
import { RentalQueryState } from "@/components/rental/rental-query-state";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format-currency";
import { useToast } from "@/hooks/use-toast";

export default function RentalContracts() {
	const { data: leases, isLoading, isError, error, refetch } = useListLeaseContracts();
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const leasesArray = Array.isArray(leases) ? leases : [];
	const { sorted: sortedLeases, sortKey, sortDir, toggle } = useSortable(leasesArray, "contractNumber");
	const activeCount = leasesArray.filter((l) => l.status === "active").length;
	const draftCount = leasesArray.filter((l) => l.status === "draft").length;
	const totalRent = leasesArray.reduce(
		(s, l) => s + parseFloat(String((l as any).rentAmount || "0")),
		0,
	);
	const activeRent = leasesArray
		.filter((l) => l.status === "active")
		.reduce((s, l) => s + parseFloat(String((l as any).rentAmount || "0")), 0);
	const expiringSoon = leasesArray.filter((l) => {
		if (l.status !== "active" || !l.endDate) return false;
		const end = new Date(l.endDate);
		if (Number.isNaN(end.getTime())) return false;
		const days = (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
		return days >= 0 && days <= 60;
	}).length;
	const [createOpen, setCreateOpen] = useState(false);
	const [editLease, setEditLease] = useState<LeaseContract | null>(null);
	const [recalcLease, setRecalcLease] = useState<LeaseContract | null>(null);
	const [terminateLease, setTerminateLease] = useState<LeaseContract | null>(null);

	const invalidateLeases = () => {
		queryClient.invalidateQueries({ queryKey: getListLeaseContractsQueryKey() });
		queryClient.invalidateQueries({ queryKey: getListRentalPropertiesQueryKey() });
		queryClient.invalidateQueries({ queryKey: getListAccrualsQueryKey() });
	};

	const handleDeleteLease = async (lease: LeaseContract) => {
		const warn =
			lease.status === "draft"
				? `Удалить черновик договора ${lease.contractNumber}?\n\nДействие необратимо.`
				: `Удалить договор ${lease.contractNumber}?\n\nМожно удалить только без платежей и задолженности.`;
		if (!confirm(warn)) return;
		try {
			await api.delete(`/rental/contracts/${lease.id}`);
			toast({ title: "Договор удалён" });
			invalidateLeases();
		} catch (e: unknown) {
			const msg =
				e && typeof e === "object" && "response" in e
					? getApiErrorMessage(e)
					: null;
			toast({
				title: "Не удалось удалить",
				description: msg || "Сначала расторгните договор и погасите долг",
				variant: "destructive",
			});
		}
	};

	return (
		<div className="p-6 space-y-3">
			<KpiRow>
				<KpiCard variant="strip" label="Всего договоров" value={leasesArray.length} sub={`${draftCount} черновиков`} icon={FileText} color="blue" loading={isLoading} />
				<KpiCard variant="strip" label="Активных" value={activeCount} sub="действующих договоров" icon={CheckCircle2} color="green" loading={isLoading} />
				<KpiCard variant="strip" label="Аренда / мес." value={formatCurrency(activeRent)} sub={`всего ${formatCurrency(totalRent)}`} icon={Wallet} color="purple" loading={isLoading} />
				<KpiCard variant="strip" label="Истекают" value={expiringSoon} sub="в ближайшие 60 дней" icon={CalendarClock} color={expiringSoon > 0 ? "yellow" : "green"} loading={isLoading} />
			</KpiRow>

			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold">Договоры аренды</h1>
					<p className="text-muted-foreground text-sm">
						Управление договорами · пропорциональный расчёт первого и последнего
						месяца
					</p>
				</div>
				<Button onClick={() => setCreateOpen(true)}>
					<Plus className="w-4 h-4 mr-2" />
					Новый договор
				</Button>
			</div>

			<RentalQueryState isLoading={isLoading} isError={isError} error={error} onRetry={() => refetch()}>
			<LeaseTable
				isLoading={isLoading}
				leasesArray={leasesArray}
				sortedLeases={sortedLeases}
				sortKey={sortKey}
				sortDir={sortDir}
				toggle={toggle}
				activeCount={activeCount}
				totalRent={totalRent}
				setEditLease={setEditLease}
				setRecalcLease={setRecalcLease}
				setTerminateLease={setTerminateLease}
				onDeleteLease={handleDeleteLease}
			/>
			</RentalQueryState>

			<CreateLeaseDialog
				open={createOpen}
				onClose={() => setCreateOpen(false)}
			/>

			{editLease && (
				<EditLeaseDialog
					lease={editLease}
					open={!!editLease}
					onClose={() => setEditLease(null)}
				/>
			)}

			{recalcLease && (
				<RecalcDialog
					lease={recalcLease}
					open={!!recalcLease}
					onClose={() => setRecalcLease(null)}
				/>
			)}

			<TerminateLeaseDialog
				lease={terminateLease}
				open={!!terminateLease}
				onClose={() => setTerminateLease(null)}
				onDone={invalidateLeases}
			/>
		</div>
	);
}
