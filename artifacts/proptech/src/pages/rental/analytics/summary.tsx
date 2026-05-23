import { useQuery } from "@tanstack/react-query";
import { Home, Percent, TrendingUp, Users } from "lucide-react";
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

export default function RentalSummary() {
	const { data: properties = [] } = useQuery<any[]>({
		queryKey: ["rental-properties"],
		queryFn: () => api.get("/rental/properties").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery<any[]>({
		queryKey: ["rental-contracts"],
		queryFn: () => api.get("/rental/contracts").then((r) => r.data),
	});
	const { data: payments = [] } = useQuery<any[]>({
		queryKey: ["rental-payments-all"],
		queryFn: () => api.get("/rental/payments").then((r) => r.data),
	});
	const { data: tenants = [] } = useQuery<any[]>({
		queryKey: ["rental-tenants"],
		queryFn: () => api.get("/rental/tenants").then((r) => r.data),
	});

	const propertiesArray = Array.isArray(properties) ? properties : [];
	const contractsArray = Array.isArray(contracts) ? contracts : [];
	const paymentsArray = Array.isArray(payments) ? payments : [];
	const tenantsArray = Array.isArray(tenants) ? tenants : [];

	const total = propertiesArray.length;
	const rented = propertiesArray.filter(
		(p: any) => p.rentalStatus === "rented",
	).length;
	const vacant = propertiesArray.filter(
		(p: any) => p.rentalStatus === "vacant",
	).length;
	const occupancy = total > 0 ? Math.round((rented / total) * 100) : 0;

	const activeContracts = contractsArray.filter(
		(c: any) => c.status === "active",
	);

	const curYear = new Date().getFullYear().toString();
	const curMonth = new Date().getMonth() + 1;

	const thisMonthPayments = paymentsArray.filter((p: any) => {
		const d = p.paymentDate || "";
		return d.startsWith(curYear) && parseInt(d.slice(5, 7), 10) === curMonth;
	});
	const thisMonthIncome = thisMonthPayments.reduce(
		(s: number, p: any) => s + (parseFloat(p.amount || "0") || 0),
		0,
	);

	const yearPayments = paymentsArray.filter((p: any) =>
		(p.paymentDate || "").startsWith(curYear),
	);
	const yearIncome = yearPayments.reduce(
		(s: number, p: any) => s + (parseFloat(p.amount || "0") || 0),
		0,
	);

	const avgRent =
		activeContracts.length > 0
			? activeContracts.reduce(
					(s: number, c: any) => s + (parseFloat(c.rentAmount || "0") || 0),
					0,
				) / activeContracts.length
			: 0;

	// Top properties by revenue
	const propRevenue: Record<number, { address: string; total: number }> = {};
	paymentsArray.forEach((p: any) => {
		const contract = contractsArray.find(
			(c: any) => c.id === p.leaseContractId,
		);
		if (!contract) return;
		const prop = propertiesArray.find(
			(pr: any) => pr.id === contract.propertyId,
		);
		if (!prop) return;
		if (!propRevenue[prop.id])
			propRevenue[prop.id] = { address: prop.address, total: 0 };
		propRevenue[prop.id].total += parseFloat(p.amount || "0");
	});
	const topProps = Object.values(propRevenue)
		.sort((a, b) => b.total - a.total)
		.slice(0, 5);

	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Сводный отчёт</h1>
				<p className="text-gray-500 text-sm mt-0.5">
					Общая статистика арендного портфеля
				</p>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<div className="bg-white border rounded-lg p-4">
					<div className="flex items-center gap-2 mb-1">
						<Home className="w-4 h-4 text-blue-600" />
						<span className="text-xs text-gray-500">Всего объектов</span>
					</div>
					<p className="text-2xl font-bold text-gray-900">{total}</p>
					<p className="text-xs text-gray-400 mt-0.5">
						{rented} арендуется · {vacant} свободно
					</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<div className="flex items-center gap-2 mb-1">
						<Percent className="w-4 h-4 text-emerald-600" />
						<span className="text-xs text-gray-500">Заполняемость</span>
					</div>
					<p className="text-2xl font-bold text-gray-900">{occupancy}%</p>
					<div className="mt-2 bg-gray-100 rounded-full h-1.5">
						<div
							className="bg-emerald-700 h-1.5 rounded-full"
							style={{ width: `${occupancy}%` }}
						/>
					</div>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<div className="flex items-center gap-2 mb-1">
						<TrendingUp className="w-4 h-4 text-blue-600" />
						<span className="text-xs text-gray-500">Доход в этом месяце</span>
					</div>
					<p className="text-2xl font-bold text-blue-600">
						{fmtFull(thisMonthIncome)}
					</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<div className="flex items-center gap-2 mb-1">
						<Users className="w-4 h-4 text-amber-600" />
						<span className="text-xs text-gray-500">Арендаторов</span>
					</div>
					<p className="text-2xl font-bold text-gray-900">
						{tenantsArray.length}
					</p>
					<p className="text-xs text-gray-400 mt-0.5">
						{activeContracts.length} активных дог.
					</p>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4 mb-4">
				<div className="bg-white border rounded-lg p-5">
					<h3 className="font-semibold text-gray-800 mb-4">
						Ключевые показатели
					</h3>
					<div className="space-y-3">
						{[
							{
								label: "Доход за год",
								val: fmtFull(yearIncome),
								color: "text-blue-600",
							},
							{
								label: "Средняя аренда",
								val: `${fmtFull(avgRent)}/мес`,
								color: "text-gray-900",
							},
							{
								label: "Активных договоров",
								val: String(activeContracts.length),
								color: "text-emerald-600",
							},
							{
								label: "Всего арендаторов",
								val: String(tenantsArray.length),
								color: "text-gray-900",
							},
						].map(({ label, val, color }) => (
							<div
								key={label}
								className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
							>
								<span className="text-sm text-gray-500">{label}</span>
								<span className={`text-sm font-semibold ${color}`}>{val}</span>
							</div>
						))}
					</div>
				</div>
				<div className="bg-white border rounded-lg p-5">
					<h3 className="font-semibold text-gray-800 mb-4">
						Топ объектов по выручке
					</h3>
					{topProps.length === 0 ? (
						<p className="text-sm text-gray-400 text-center py-6">
							Нет данных о платежах
						</p>
					) : (
						<div className="space-y-3">
							{topProps.map((p, idx) => (
								<div key={idx} className="flex items-center gap-3">
									<div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
										{idx + 1}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-gray-800 truncate">
											{p.address}
										</p>
										<div className="mt-1 bg-gray-100 rounded-full h-1">
											<div
												className="bg-blue-600 h-1 rounded-full"
												style={{
													width: `${Math.round((p.total / (topProps[0]?.total || 1)) * 100)}%`,
												}}
											/>
										</div>
									</div>
									<span className="text-sm font-semibold text-gray-700 flex-shrink-0">
										{fmtFull(p.total)}
									</span>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			<div className="bg-white border rounded-lg p-5">
				<h3 className="font-semibold text-gray-800 mb-4">Статусы объектов</h3>
				<div className="flex gap-3 flex-wrap">
					{[
						{
							label: "Арендуется",
							count: rented,
							color: "bg-emerald-100 text-emerald-800",
						},
						{
							label: "Свободно",
							count: vacant,
							color: "bg-gray-100 text-gray-700",
						},
						{
							label: "На обслуживании",
							count: propertiesArray.filter(
								(p: any) => p.rentalStatus === "maintenance",
							).length,
							color: "bg-amber-100 text-amber-800",
						},
					].map(({ label, count, color }) => (
						<div
							key={label}
							className={`px-4 py-2 rounded-lg ${color} text-sm`}
						>
							<span className="font-semibold">{count}</span> {label}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
