import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, TrendingDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

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
function daysOverdue(dueDate: string) {
	const today = new Date();
	const due = new Date(dueDate);
	return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export default function RentalDebt() {
	const [search, setSearch] = useState("");

	const { data: accruals = [], isLoading } = useQuery<any[]>({
		queryKey: ["rental-accruals"],
		queryFn: () => api.get("/rental/accruals").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery<any[]>({
		queryKey: ["rental-contracts"],
		queryFn: () => api.get("/rental/contracts").then((r) => r.data),
	});
	const { data: tenants = [] } = useQuery<any[]>({
		queryKey: ["rental-tenants"],
		queryFn: () => api.get("/rental/tenants").then((r) => r.data),
	});

	const accrualsArray = Array.isArray(accruals) ? accruals : [];
	const contractsArray = Array.isArray(contracts) ? contracts : [];
	const tenantsArray = Array.isArray(tenants) ? tenants : [];

	const today = new Date().toISOString().split("T")[0];

	const overdue = accrualsArray
		.filter((a) => parseFloat(a.balance || "0") > 0 && a.dueDate < today)
		.map((a) => {
			const contract = contractsArray.find(
				(c: any) => c.id === a.leaseContractId,
			);
			const tenant = contract
				? tenantsArray.find((t: any) => t.id === contract.tenantId)
				: null;
			const days = daysOverdue(a.dueDate);
			return { ...a, contract, tenant, days };
		})
		.filter((a) => {
			if (!search) return true;
			const q = search.toLowerCase();
			return (
				a.tenant?.name?.toLowerCase().includes(q) ||
				a.contract?.propertyAddress?.toLowerCase().includes(q) ||
				a.period?.toLowerCase().includes(q)
			);
		})
		.sort((a, b) => b.days - a.days);

	const totalDebt = overdue.reduce(
		(s, a) => s + (parseFloat(a.balance || "0") || 0),
		0,
	);
	const critical = overdue.filter((a) => a.days > 30).length;
	const mild = overdue.filter((a) => a.days <= 10).length;

	function debtBadge(days: number) {
		if (days > 60)
			return (
				<Badge className="bg-rose-100 text-rose-800">Критично 60+ дн.</Badge>
			);
		if (days > 30)
			return <Badge className="bg-amber-100 text-amber-800">30+ дн.</Badge>;
		if (days > 14)
			return <Badge className="bg-amber-100 text-amber-800">14+ дн.</Badge>;
		return <Badge className="bg-blue-100 text-blue-800">до 14 дн.</Badge>;
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Дебиторская задолженность
					</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Просроченные начисления по арендаторам
					</p>
				</div>
				<Input
					className="w-56 h-8 text-sm"
					placeholder="Поиск по арендатору..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
			</div>

			<div className="grid grid-cols-3 gap-4 mb-6">
				<div className="bg-white border rounded-lg p-4">
					<div className="flex items-center gap-2 mb-1">
						<TrendingDown className="w-4 h-4 text-rose-600" />
						<span className="text-sm text-gray-500">Общий долг</span>
					</div>
					<p className="text-xl font-bold text-rose-700">
						{fmtFull(totalDebt)}
					</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<div className="flex items-center gap-2 mb-1">
						<AlertTriangle className="w-4 h-4 text-amber-600" />
						<span className="text-sm text-gray-500">Критичных (30+ дн.)</span>
					</div>
					<p className="text-xl font-bold text-amber-600">{critical}</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<div className="flex items-center gap-2 mb-1">
						<Clock className="w-4 h-4 text-blue-600" />
						<span className="text-sm text-gray-500">Недавних (до 10 дн.)</span>
					</div>
					<p className="text-xl font-bold text-blue-600">{mild}</p>
				</div>
			</div>

			<div className="bg-white border rounded-lg overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="text-left p-3 font-medium text-gray-600">
								Арендатор
							</th>
							<th className="text-left p-3 font-medium text-gray-600">
								Период
							</th>
							<th className="text-right p-3 font-medium text-gray-600">
								Начислено
							</th>
							<th className="text-right p-3 font-medium text-gray-600">
								Остаток
							</th>
							<th className="text-left p-3 font-medium text-gray-600">
								Срок оплаты
							</th>
							<th className="text-center p-3 font-medium text-gray-600">
								Просрочка
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
						) : overdue.length === 0 ? (
							<tr>
								<td colSpan={6} className="p-12 text-center text-gray-400">
									<AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
									<p className="text-sm">Просроченных долгов нет</p>
								</td>
							</tr>
						) : (
							overdue.map((a) => (
								<tr key={a.id} className="border-t hover:bg-gray-50">
									<td className="p-3">
										<p className="font-medium text-gray-900">
											{a.tenant?.name || "Неизвестный"}
										</p>
										<p className="text-xs text-gray-400">
											{a.contract?.propertyAddress ||
												`Дог. #${a.leaseContractId}`}
										</p>
									</td>
									<td className="p-3 text-gray-600">{a.period}</td>
									<td className="p-3 text-right text-gray-700">
										{fmtFull(a.amount)}
									</td>
									<td className="p-3 text-right font-semibold text-rose-700">
										{fmtFull(a.balance)}
									</td>
									<td className="p-3 text-gray-600">
										{new Date(a.dueDate).toLocaleDateString("ru-KG")}
									</td>
									<td className="p-3 text-center">
										{debtBadge(a.days)}
										<p className="text-xs text-gray-400 mt-0.5">{a.days} дн.</p>
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
