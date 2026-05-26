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
import { Download, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function fmtFull(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0 ₸";
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: "KGS",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(v);
}

export default function RentalHistory() {
	const [search, setSearch] = useState("");
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
			if (search) {
				const q = search.toLowerCase();
				if (
					!p.tenant?.name?.toLowerCase().includes(q) &&
					!p.contract?.propertyAddress?.toLowerCase().includes(q)
				)
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

			<div className="flex gap-2 mb-4">
				<div className="relative flex-1">
					<Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
					<Input
						className="pl-8 h-8 text-sm"
						placeholder="Поиск по арендатору или адресу..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
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

			<div className="bg-white border rounded-lg overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="text-left p-3 font-medium text-gray-600">
								Арендатор
							</th>
							<th className="text-left p-3 font-medium text-gray-600">Дата</th>
							<th className="text-right p-3 font-medium text-gray-600">
								Сумма
							</th>
							<th className="text-left p-3 font-medium text-gray-600">
								Способ
							</th>
							<th className="text-left p-3 font-medium text-gray-600">Счёт</th>
							<th className="text-left p-3 font-medium text-gray-600">
								Примечание
							</th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							<tr>
								<td colSpan={6} className="p-8 text-center text-gray-400">
									Загрузка...
								</td>
							</tr>
						) : filtered.length === 0 ? (
							<tr>
								<td
									colSpan={6}
									className="p-10 text-center text-gray-400 text-sm"
								>
									Нет платежей
								</td>
							</tr>
						) : (
							filtered.map((p: any) => (
								<tr key={p.id} className="border-t hover:bg-gray-50">
									<td className="p-3">
										<p className="font-medium text-gray-900">
											{p.tenant?.name || "—"}
										</p>
										<p className="text-xs text-gray-400">
											{p.contract?.propertyAddress ||
												`Дог. #${p.leaseContractId}`}
										</p>
									</td>
									<td className="p-3 text-gray-600">
										{p.paymentDate
											? new Date(p.paymentDate).toLocaleDateString("ru-KG")
											: "—"}
									</td>
									<td className="p-3 text-right font-semibold text-emerald-600">
										{fmtFull(p.amount)}
									</td>
									<td className="p-3">
										<Badge className="bg-gray-100 text-gray-700 font-normal">
											{methodLabels[p.paymentMethod] || p.paymentMethod || "—"}
										</Badge>
									</td>
									<td className="p-3 text-gray-500 text-xs">
										{p.account?.name || "—"}
									</td>
									<td className="p-3 text-gray-400 text-xs max-w-xs truncate">
										{p.note || "—"}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
