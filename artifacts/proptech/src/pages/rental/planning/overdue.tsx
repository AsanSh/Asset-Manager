import { useQuery, } from "@tanstack/react-query";
import { AlertTriangle, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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

function daysOverdue(d: string) {
	const today = new Date();
	return Math.floor(
		(today.getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24),
	);
}

export default function RentalOverdue() {
	const [search, setSearch] = useState("");
	const { toast } = useToast();

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

	const today = new Date().toISOString().split("T")[0];

	const overdue = accruals
		.filter(
			(a: any) => parseFloat(a.balance || "0") > 0 && (a.dueDate || "") < today,
		)
		.map((a: any) => {
			const contract = contracts.find((c: any) => c.id === a.leaseContractId);
			const tenant = contract
				? tenants.find((t: any) => t.id === contract.tenantId)
				: null;
			return { ...a, contract, tenant, days: daysOverdue(a.dueDate) };
		})
		.filter((a: any) => {
			if (!search) return true;
			const q = search.toLowerCase();
			return (
				a.tenant?.name?.toLowerCase().includes(q) ||
				a.contract?.propertyAddress?.toLowerCase().includes(q)
			);
		})
		.sort((a: any, b: any) => b.days - a.days);

	const totalDebt = overdue.reduce(
		(s: number, a: any) => s + parseFloat(a.balance || "0"),
		0,
	);

	function notifyTenant(a: any) {
		toast({
			title: `Уведомление отправлено ${a.tenant?.name || "арендатору"}`,
		});
	}

	function debtColor(days: number) {
		if (days > 60) return "bg-rose-100 text-rose-800";
		if (days > 30) return "bg-amber-100 text-amber-800";
		if (days > 14) return "bg-amber-100 text-amber-800";
		return "bg-blue-100 text-blue-800";
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Просроченные платежи
					</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Управление должниками и рассылка уведомлений
					</p>
				</div>
				<Input
					className="w-56 h-8 text-sm"
					placeholder="Поиск арендатора..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
			</div>

			<div className="grid grid-cols-3 gap-4 mb-6">
				<div className="bg-rose-50 border border-rose-100 rounded-lg p-4">
					<p className="text-sm text-rose-600">Общий долг</p>
					<p className="text-2xl font-bold text-rose-700">
						{fmtFull(totalDebt)}
					</p>
				</div>
				<div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
					<p className="text-sm text-amber-600">Должников</p>
					<p className="text-2xl font-bold text-amber-700">
						{new Set(overdue.map((a: any) => a.leaseContractId)).size}
					</p>
				</div>
				<div className="bg-rose-50 border border-rose-100 rounded-lg p-4">
					<p className="text-sm text-rose-600">Критичных (60+ дн.)</p>
					<p className="text-2xl font-bold text-rose-700">
						{overdue.filter((a: any) => a.days > 60).length}
					</p>
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
							<th className="text-right p-3 font-medium text-gray-600">Долг</th>
							<th className="text-left p-3 font-medium text-gray-600">Срок</th>
							<th className="text-center p-3 font-medium text-gray-600">
								Просрочка
							</th>
							<th className="text-right p-3 font-medium text-gray-600">
								Действия
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
									<AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
									<p className="text-sm">Просроченных долгов нет</p>
								</td>
							</tr>
						) : (
							overdue.map((a: any) => (
								<tr key={a.id} className="border-t hover:bg-gray-50">
									<td className="p-3">
										<p className="font-medium text-gray-900">
											{a.tenant?.name || "—"}
										</p>
										<p className="text-xs text-gray-400">
											{a.contract?.propertyAddress ||
												`Дог. #${a.leaseContractId}`}
										</p>
										{a.tenant?.phone && (
											<p className="text-xs text-blue-500 flex items-center gap-0.5 mt-0.5">
												<Phone className="w-3 h-3" />
												{a.tenant.phone}
											</p>
										)}
									</td>
									<td className="p-3 text-gray-600">{a.period}</td>
									<td className="p-3 text-right font-bold text-rose-600">
										{fmtFull(a.balance)}
									</td>
									<td className="p-3 text-gray-600">
										{a.dueDate
											? new Date(a.dueDate).toLocaleDateString("ru-KG")
											: "—"}
									</td>
									<td className="p-3 text-center">
										<Badge className={debtColor(a.days)}>{a.days} дн.</Badge>
									</td>
									<td className="p-3">
										<div className="flex items-center gap-1 justify-end">
											<Button
												variant="outline"
												size="sm"
												className="h-7 text-xs gap-1"
												onClick={() => notifyTenant(a)}
											>
												<Mail className="w-3 h-3" /> Уведомить
											</Button>
										</div>
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
