import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	getListAccrualsQueryKey,
	getListLeaseContractsQueryKey,
	getListPaymentsQueryKey,
	getListRentalPropertiesQueryKey,
	getListTenantsQueryKey,
	getRentalAccountsQueryKey,
	getDistributionsQueryKey,
	getRentalPaymentsAllQueryKey,
	getRentalExpensesAllQueryKey,
	getAccrualsOpenQueryKey,
} from "@/lib/rental-query-keys";
import { Banknote, CheckCircle2, Plus, Shield, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { defaultPeriod, inPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import {
	getListDepositsQueryKey,
	useListDeposits,
	useListLeaseContracts,
} from "@/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const statusColors: Record<string, string> = {
	held: "bg-blue-100 text-blue-800",
	partially_returned: "bg-amber-100 text-amber-800",
	returned: "bg-emerald-100 text-emerald-800",
	forfeited: "bg-rose-100 text-rose-800",
};

const statusLabels: Record<string, string> = {
	held: "Удерживается",
	partially_returned: "Частично возвращён",
	returned: "Возвращён",
	forfeited: "Удержан",
};

function formatCurrency(amount: number | string, currency: string) {
	const num = typeof amount === "string" ? parseFloat(amount) : amount;
	const cur = currency === "KGS" ? "KGS" : currency === "USD" ? "USD" : "KGS";
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: cur,
	}).format(num);
}

function formatDate(date: string) {
	return new Date(date).toLocaleDateString("ru-KG");
}

interface DepositDialogProps {
	open: boolean;
	onClose: () => void;
}

function DepositDialog({ open, onClose }: DepositDialogProps) {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const { data: leases } = useListLeaseContracts();
	const leasesArray = Array.isArray(leases) ? leases : [];
	const [loading, setLoading] = useState(false);

	const { data: accounts = [] } = useQuery<any[]>({
		queryKey: getRentalAccountsQueryKey(),
		queryFn: () => api.get("/rental/accounts").then((r) => r.data),
	});

	const accountsArray = Array.isArray(accounts) ? accounts : [];

	const [formData, setFormData] = useState({
		leaseContractId: "",
		amount: "",
		currency: "KGS",
		receivedDate: new Date().toISOString().split("T")[0],
		accountId: "",
		note: "",
	});

	useEffect(() => {
		if (!open) return;
		setFormData({
			leaseContractId: "",
			amount: "",
			currency: "KGS",
			receivedDate: new Date().toISOString().split("T")[0],
			accountId: accountsArray[0] ? String(accountsArray[0].id) : "",
			note: "",
		});
	}, [open, accountsArray]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.accountId) {
			toast({
				title: "Выберите расчётный счёт",
				description: "Депозит должен быть привязан к счёту",
				variant: "destructive",
			});
			return;
		}
		setLoading(true);
		try {
			await api.post("/rental/deposits", {
				leaseContractId: parseInt(formData.leaseContractId, 10),
				amount: parseFloat(formData.amount),
				currency: formData.currency,
				receivedDate: formData.receivedDate,
				accountId: parseInt(formData.accountId, 10),
				note: formData.note || null,
			});
			toast({ title: "Депозит зарегистрирован" });
			queryClient.invalidateQueries({ queryKey: getListDepositsQueryKey() });
			onClose();
		} catch {
			toast({
				title: "Ошибка",
				description: "Не удалось зарегистрировать депозит",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Зарегистрировать депозит</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label>Договор аренды *</Label>
						<Select
							value={formData.leaseContractId}
							onValueChange={(v) =>
								setFormData({ ...formData, leaseContractId: v })
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Выберите договор" />
							</SelectTrigger>
							<SelectContent>
								{leasesArray.map((l) => (
									<SelectItem key={l.id} value={String(l.id)}>
										{l.contractNumber} — {l.tenantName || `#${l.tenantId}`}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
						<div className="col-span-2 flex flex-col">
							<Label className="leading-tight mb-1.5">Сумма *</Label>
							<Input
								className="mt-auto"
								type="number"
								value={formData.amount}
								onChange={(e) =>
									setFormData({ ...formData, amount: e.target.value })
								}
								placeholder="300000"
								required
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Валюта</Label>
							<Select
								value={formData.currency}
								onValueChange={(v) => setFormData({ ...formData, currency: v })}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="KGS">Сом (KGS)</SelectItem>
									<SelectItem value="USD">Доллар (USD)</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div>
						<Label>Дата получения *</Label>
						<Input
							type="date"
							value={formData.receivedDate}
							onChange={(e) =>
								setFormData({ ...formData, receivedDate: e.target.value })
							}
							required
						/>
					</div>
					<div>
						<Label>Расчётный счёт *</Label>
						<Select
							value={formData.accountId}
							onValueChange={(v) =>
								setFormData({ ...formData, accountId: v })
							}
							required
						>
							<SelectTrigger className="mt-1">
								<SelectValue placeholder="Выберите счёт" />
							</SelectTrigger>
							<SelectContent>
								{accountsArray.length === 0 ? (
									<SelectItem value="_empty" disabled>
										Сначала создайте счёт в разделе «Расчётные счета»
									</SelectItem>
								) : (
									(accounts as any[]).map((a: any) => (
										<SelectItem key={a.id} value={String(a.id)}>
											{a.name}
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>Примечание</Label>
						<Input
							value={formData.note}
							onChange={(e) =>
								setFormData({ ...formData, note: e.target.value })
							}
						/>
					</div>
					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Отмена
						</Button>
						<Button type="submit" disabled={loading || !formData.accountId}>
							{loading ? "Сохранение..." : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function Deposits() {
	const { data: deposits, isLoading } = useListDeposits();
	const { data: leases } = useListLeaseContracts();
	const leasesArray = Array.isArray(leases) ? leases : [];
	const depositsArray = Array.isArray(deposits) ? deposits : [];
	const [dialogOpen, setDialogOpen] = useState(false);
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
	const leaseLabel = useMemo(() => {
		const map: Record<number, string> = {};
		for (const l of leasesArray) {
			map[l.id] = `${l.contractNumber} — ${l.tenantName || ""}`.trim();
		}
		return map;
	}, [leasesArray]);

	const filteredDeposits = depositsArray.filter((d) => inPeriod(d.receivedDate, period));
	const enriched = useMemo(
		() =>
			filteredDeposits.map((d) => ({
				...d,
				contractLabel: leaseLabel[d.leaseContractId] || `Договор #${d.leaseContractId}`,
			})),
		[filteredDeposits, leaseLabel],
	);
	const totalAmount = filteredDeposits.reduce((s, d) => s + parseFloat(String(d.amount || "0")), 0);
	const totalReturned = filteredDeposits.reduce((s, d) => s + parseFloat(String(d.returnedAmount || "0")), 0);
	const heldCount = filteredDeposits.filter((d) => d.status === "held").length;

	type EnrichedDeposit = (typeof enriched)[number];

	const tableColumns = useMemo<ColumnDef<EnrichedDeposit, unknown>[]>(
		() => [
			{
				id: "contractLabel",
				header: "Договор",
				size: 200,
				accessorFn: (row) => row.contractLabel,
				meta: { exportLabel: "Договор" },
				cell: ({ row }) => row.original.contractLabel,
			},
			{
				id: "receivedDate",
				header: "Получен",
				size: 110,
				accessorFn: (row) => row.receivedDate,
				meta: { exportLabel: "Получен" },
				cell: ({ row }) => formatDate(row.original.receivedDate),
			},
			{
				id: "amount",
				header: "Сумма",
				size: 130,
				accessorFn: (row) => parseFloat(String(row.amount || "0")),
				meta: { exportLabel: "Сумма", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono font-medium">
						{formatCurrency(row.original.amount, row.original.currency)}
					</span>
				),
			},
			{
				id: "returnedAmount",
				header: "Возвращено",
				size: 130,
				accessorFn: (row) => parseFloat(String(row.returnedAmount || "0")),
				meta: { exportLabel: "Возвращено", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono text-blue-700">
						{row.original.returnedAmount
							? formatCurrency(
									row.original.returnedAmount,
									row.original.currency,
								)
							: "—"}
					</span>
				),
			},
			{
				id: "status",
				header: "Статус",
				size: 140,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => (
					<Badge
						className={statusColors[row.original.status]}
						variant="secondary"
					>
						{statusLabels[row.original.status] || row.original.status}
					</Badge>
				),
			},
		],
		[],
	);

	return (
		<div className="p-6 space-y-3">
			<KpiRow>
				<KpiCard variant="strip" label="Записей" value={filteredDeposits.length} sub="за период" icon={Banknote} color="blue" loading={isLoading} />
				<KpiCard variant="strip" label="Сумма депозитов" value={new Intl.NumberFormat("ru-RU").format(totalAmount)} sub="KGS экв." icon={Wallet} color="purple" loading={isLoading} />
				<KpiCard variant="strip" label="Возвращено" value={new Intl.NumberFormat("ru-RU").format(totalReturned)} sub="за период" icon={CheckCircle2} color="green" loading={isLoading} />
				<KpiCard variant="strip" label="Удерживается" value={heldCount} sub="активных депозитов" icon={Shield} color="yellow" loading={isLoading} />
			</KpiRow>

			<div className="flex justify-between items-center flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold">Депозиты</h1>
					<p className="text-muted-foreground text-sm">
						Учёт залоговых депозитов арендаторов
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button onClick={() => setDialogOpen(true)}>
						<Plus className="w-4 h-4 mr-2" />
						Добавить
					</Button>
				</div>
			</div>

			<div className="flex items-center justify-between flex-wrap gap-2">
				<PeriodPicker value={period} onChange={setPeriod} />
				<p className="text-xs text-gray-500">{enriched.length} записей</p>
			</div>

			<DataTable
					tableId="rental-deposits"
					columns={tableColumns}
					data={enriched}
					isLoading={isLoading}
					initialSorting={[{ id: "receivedDate", desc: true }]}
					emptyState={
						<div className="flex flex-col items-center gap-2 text-muted-foreground">
							<Banknote className="h-8 w-8 opacity-30" />
							<span>Депозиты не найдены</span>
						</div>
					}
					footer={
						!isLoading && filteredDeposits.length > 0 ? (
							<div className="grid grid-cols-5 gap-2 px-4 py-2 text-sm font-semibold border-t bg-gray-50">
								<span className="col-span-2 text-gray-600">
									Итого: {filteredDeposits.length}
								</span>
								<span className="font-mono text-right tabular-nums">
									{new Intl.NumberFormat("ru-KG").format(totalAmount)} сом
								</span>
								<span className="font-mono text-right tabular-nums text-blue-700">
									{totalReturned > 0
										? `${new Intl.NumberFormat("ru-KG").format(totalReturned)} сом`
										: "—"}
								</span>
								<span />
							</div>
						) : undefined
					}
				/>

			<DepositDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
		</div>
	);
}
