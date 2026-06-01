import { useQuery } from "@tanstack/react-query";
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
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

const methodLabels: Record<string, string> = {
	cash: "Наличные",
	bank_transfer: "Перевод",
	card: "Карта",
	online: "Онлайн",
	other: "Другое",
};

function fmtFull(n: unknown) {
	const v = parseFloat(String(n ?? "0"));
	if (Number.isNaN(v)) return "0 сом";
	return `${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(v)} сом`;
}

export default function RentalHistory() {
	const [period, setPeriod] = useState("all");
	const [method, setMethod] = useState("all");

	const { data: payments = [], isLoading } = useQuery<any[]>({
		queryKey: getRentalPaymentsAllQueryKey(),
		queryFn: () => api.get("/rental/payments").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery<any[]>({
		queryKey: getListLeaseContractsQueryKey(),
		queryFn: () => api.get("/rental/contracts").then((r) => r.data),
	});
	const { data: tenants = [] } = useQuery<any[]>({
		queryKey: getListTenantsQueryKey(),
		queryFn: () => api.get("/rental/tenants").then((r) => r.data),
	});
	const { data: accounts = [] } = useQuery<any[]>({
		queryKey: getRentalAccountsQueryKey(),
		queryFn: () => api.get("/rental/accounts").then((r) => r.data),
	});

	const paymentsArray = Array.isArray(payments) ? payments : [];
	const contractsArray = Array.isArray(contracts) ? contracts : [];
	const tenantsArray = Array.isArray(tenants) ? tenants : [];
	const accountsArray = Array.isArray(accounts) ? accounts : [];

	const now = new Date();
	const filtered = paymentsArray
		.map((p: any) => {
			const contract = contractsArray.find(
				(c: any) => c.id === p.leaseContractId,
			);
			const tenant = contract
				? tenantsArray.find((t: any) => t.id === contract.tenantId)
				: null;
			const account = accountsArray.find((a: any) => a.id === p.accountId);
			return { ...p, contract, tenant, account };
		})
		.filter((p: any) => {
			if (method !== "all" && p.paymentMethod !== method) return false;
			if (period !== "all") {
				const d = new Date(p.paymentDate);
				if (
					period === "month" &&
					(d.getMonth() !== now.getMonth() ||
						d.getFullYear() !== now.getFullYear())
				)
					return false;
				if (period === "quarter") {
					const q = Math.floor(now.getMonth() / 3);
					if (
						Math.floor(d.getMonth() / 3) !== q ||
						d.getFullYear() !== now.getFullYear()
					)
						return false;
				}
				if (period === "year" && d.getFullYear() !== now.getFullYear())
					return false;
			}
			return true;
		})
		.sort((a: any, b: any) =>
			(b.paymentDate || "").localeCompare(a.paymentDate || ""),
		);

	const total = filtered.reduce(
		(s: number, p: any) => s + parseFloat(p.amount || "0"),
		0,
	);

	type HistoryRow = (typeof filtered)[number];

	const columns = useMemo<ColumnDef<HistoryRow, unknown>[]>(
		() => [
			{
				id: "tenant",
				header: "Арендатор",
				size: 220,
				minSize: 160,
				maxSize: 400,
				accessorFn: (row) => row.tenant?.name || "",
				meta: { exportLabel: "Арендатор", grow: true },
				cell: ({ row }) => (
					<div className="min-w-0">
						<p className="font-medium truncate" title={row.original.tenant?.name}>
							{row.original.tenant?.name || "—"}
						</p>
						<p
							className="text-xs text-am-text-muted truncate"
							title={
								row.original.contract?.propertyAddress ||
								`Дог. #${row.original.leaseContractId}`
							}
						>
							{row.original.contract?.propertyAddress ||
								`Дог. #${row.original.leaseContractId}`}
						</p>
					</div>
				),
			},
			{
				id: "paymentDate",
				header: "Дата",
				size: 110,
				accessorFn: (row) => row.paymentDate || "",
				meta: { exportLabel: "Дата" },
				cell: ({ row }) =>
					row.original.paymentDate
						? new Date(row.original.paymentDate).toLocaleDateString("ru-KG")
						: "—",
			},
			{
				id: "amount",
				header: "Сумма",
				size: 120,
				accessorFn: (row) => parseFloat(row.amount || "0"),
				meta: { exportLabel: "Сумма", align: "right", financeAmount: true },
				cell: ({ row }) => (
					<span className="text-emerald-600 font-semibold tabular-nums">
						{fmtFull(row.original.amount)}
					</span>
				),
			},
			{
				id: "method",
				header: "Способ",
				size: 120,
				accessorFn: (row) =>
					methodLabels[row.paymentMethod] || row.paymentMethod || "",
				meta: { exportLabel: "Способ" },
				cell: ({ row }) => (
					<Badge className="bg-gray-100 text-gray-700 font-normal">
						{methodLabels[row.original.paymentMethod] ||
							row.original.paymentMethod ||
							"—"}
					</Badge>
				),
			},
			{
				id: "account",
				header: "Счёт",
				size: 140,
				accessorFn: (row) => row.account?.name || "",
				meta: { exportLabel: "Счёт" },
				cell: ({ row }) => row.original.account?.name || "—",
			},
			{
				id: "note",
				header: "Примечание",
				size: 180,
				minSize: 100,
				maxSize: 360,
				accessorFn: (row) => row.note || "",
				meta: { exportLabel: "Примечание", grow: true },
				cell: ({ row }) => (
					<span className="truncate block" title={row.original.note || undefined}>
						{row.original.note || "—"}
					</span>
				),
			},
		],
		[],
	);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">История платежей</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Все поступления по договорам аренды
					</p>
				</div>
				<Button variant="outline" size="sm" className="gap-1.5 h-8">
					<Download className="w-3.5 h-3.5" /> Экспорт
				</Button>
			</div>

			<div className="flex gap-2 mb-4 flex-wrap">
				<Select value={period} onValueChange={setPeriod}>
					<SelectTrigger className="w-36 h-8 text-sm">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все периоды</SelectItem>
						<SelectItem value="month">Этот месяц</SelectItem>
						<SelectItem value="quarter">Квартал</SelectItem>
						<SelectItem value="year">Этот год</SelectItem>
					</SelectContent>
				</Select>
				<Select value={method} onValueChange={setMethod}>
					<SelectTrigger className="w-36 h-8 text-sm">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все способы</SelectItem>
						<SelectItem value="cash">Наличные</SelectItem>
						<SelectItem value="bank_transfer">Перевод</SelectItem>
						<SelectItem value="card">Карта</SelectItem>
						<SelectItem value="online">Онлайн</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 flex items-center justify-between">
				<span className="text-sm text-blue-700">
					Отфильтровано: {filtered.length} записей
				</span>
				<span className="text-sm font-semibold text-blue-800">
					Итого: {fmtFull(total)}
				</span>
			</div>

			<DataTable
				tableId="rental-payment-history"
				columns={columns}
				data={filtered}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по арендатору или адресу…"
				initialSorting={[{ id: "paymentDate", desc: true }]}
				emptyState={<p className="py-8 text-center text-am-text-muted">Нет платежей</p>}
			/>
		</div>
	);
}
