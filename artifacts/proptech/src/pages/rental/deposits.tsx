import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { defaultPeriod, inPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
import { useSortable } from "@/lib/use-sortable";
import { SortHead } from "@/components/sort-head";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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
		queryKey: ["rental-accounts"],
		queryFn: () => api.get("/rental/accounts").then((r) => r.data),
	});

	const [formData, setFormData] = useState({
		leaseContractId: "",
		amount: "",
		currency: "KGS",
		receivedDate: new Date().toISOString().split("T")[0],
		accountId: "",
		note: "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			await api.post("/rental/deposits", {
				leaseContractId: parseInt(formData.leaseContractId, 10),
				amount: parseFloat(formData.amount),
				currency: formData.currency,
				receivedDate: formData.receivedDate,
				accountId: formData.accountId ? parseInt(formData.accountId, 10) : null,
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
					<div className="grid grid-cols-3 gap-3">
						<div className="col-span-2">
							<Label>Сумма *</Label>
							<Input
								type="number"
								value={formData.amount}
								onChange={(e) =>
									setFormData({ ...formData, amount: e.target.value })
								}
								placeholder="300000"
								required
							/>
						</div>
						<div>
							<Label>Валюта</Label>
							<Select
								value={formData.currency}
								onValueChange={(v) => setFormData({ ...formData, currency: v })}
							>
								<SelectTrigger>
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
						<Label>Расчётный счёт</Label>
						<Select
							value={formData.accountId || "none"}
							onValueChange={(v) =>
								setFormData({ ...formData, accountId: v === "none" ? "" : v })
							}
						>
							<SelectTrigger className="mt-1">
								<SelectValue placeholder="Выберите счёт (необязательно)" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">— Без привязки к счёту —</SelectItem>
								{(accounts as any[]).map((a: any) => (
									<SelectItem key={a.id} value={String(a.id)}>
										{a.name}
									</SelectItem>
								))}
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
						<Button type="submit" disabled={loading}>
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
	const depositsArray = Array.isArray(deposits) ? deposits : [];
	const [dialogOpen, setDialogOpen] = useState(false);
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
	const filteredDeposits = depositsArray.filter((d) => inPeriod(d.receivedDate, period));
	const { sorted, sortKey, sortDir, toggle } = useSortable(filteredDeposits, "receivedDate");

	const totalAmount = filteredDeposits.reduce((s, d) => s + parseFloat(String(d.amount || "0")), 0);
	const totalReturned = filteredDeposits.reduce((s, d) => s + parseFloat(String(d.returnedAmount || "0")), 0);

	return (
		<div className="p-6 space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold">Депозиты</h1>
					<p className="text-muted-foreground text-sm">
						Учёт залоговых депозитов арендаторов
					</p>
				</div>
				<Button onClick={() => setDialogOpen(true)}>
					<Plus className="w-4 h-4 mr-2" />
					Добавить
				</Button>
			</div>

			<PeriodPicker value={period} onChange={setPeriod} />

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<SortHead label="Договор" sortKey="leaseContractId" currentKey={sortKey} dir={sortDir} onToggle={toggle} />
							<SortHead label="Получен" sortKey="receivedDate" currentKey={sortKey} dir={sortDir} onToggle={toggle} />
							<SortHead label="Сумма" sortKey="amount" currentKey={sortKey} dir={sortDir} onToggle={toggle} />
							<SortHead label="Возвращено" sortKey="returnedAmount" currentKey={sortKey} dir={sortDir} onToggle={toggle} />
							<SortHead label="Статус" sortKey="status" currentKey={sortKey} dir={sortDir} onToggle={toggle} />
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 3 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 5 }).map((_, j) => (
										<TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
									))}
								</TableRow>
							))
						) : !filteredDeposits.length ? (
							<TableRow>
								<TableCell colSpan={5} className="text-center text-muted-foreground py-8">Депозиты не найдены</TableCell>
							</TableRow>
						) : (
							sorted.map((deposit) => (
								<TableRow key={deposit.id}>
									<TableCell>Договор #{deposit.leaseContractId}</TableCell>
									<TableCell>{formatDate(deposit.receivedDate)}</TableCell>
									<TableCell className="font-medium">{formatCurrency(deposit.amount, deposit.currency)}</TableCell>
									<TableCell>{deposit.returnedAmount ? formatCurrency(deposit.returnedAmount, deposit.currency) : "—"}</TableCell>
									<TableCell>
										<Badge className={statusColors[deposit.status]} variant="secondary">
											{statusLabels[deposit.status] || deposit.status}
										</Badge>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
					{!isLoading && filteredDeposits.length > 0 && (
						<tfoot>
							<TableRow className="bg-gray-50 font-semibold border-t-2">
								<TableCell colSpan={2} className="text-sm text-gray-600">Итого: {filteredDeposits.length}</TableCell>
								<TableCell className="text-sm tabular-nums">{new Intl.NumberFormat("ru-RU").format(totalAmount)}</TableCell>
								<TableCell className="text-sm tabular-nums">{totalReturned > 0 ? new Intl.NumberFormat("ru-RU").format(totalReturned) : "—"}</TableCell>
								<TableCell />
							</TableRow>
						</tfoot>
					)}
				</Table>
			</div>

			<DepositDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
		</div>
	);
}
