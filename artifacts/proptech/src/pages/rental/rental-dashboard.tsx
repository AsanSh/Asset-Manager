import {
	AlertTriangle,
	Building2,
	CheckCircle2,
	Clock,
	FileText,
	Receipt,
	TrendingUp,
	Users,
} from "lucide-react";
import { Link } from "wouter";
import {
	useListAccruals,
	useListLeaseContracts,
	useListPayments,
	useListProperties,
	useListTenants,
} from "@/api-client";
import { Skeleton } from "@/components/ui/skeleton";

function formatCurrency(amount: number | string) {
	const num = typeof amount === "string" ? parseFloat(amount) : amount;
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: "KGS",
		maximumFractionDigits: 0,
	}).format(num || 0);
}

function KpiCard({
	label,
	value,
	sub,
	icon: Icon,
	color = "blue",
	loading = false,
}: {
	label: string;
	value: string | number;
	sub?: string;
	icon: React.ElementType;
	color?: string;
	loading?: boolean;
}) {
	const colors: Record<string, { bg: string; icon: string }> = {
		blue: { bg: "bg-blue-50", icon: "text-blue-600" },
		green: { bg: "bg-emerald-50", icon: "text-emerald-600" },
		yellow: { bg: "bg-amber-50", icon: "text-amber-600" },
		red: { bg: "bg-rose-50", icon: "text-rose-600" },
		purple: { bg: "bg-blue-50", icon: "text-blue-600" },
	};
	const c = colors[color] || colors.blue;
	return (
		<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
			<div className="flex items-start justify-between mb-3">
				<p className="text-xs font-medium text-gray-500">{label}</p>
				<div
					className={`w-8 h-8 ${c.bg} rounded-lg flex items-center justify-center`}
				>
					<Icon className={`w-4 h-4 ${c.icon}`} />
				</div>
			</div>
			{loading ? (
				<Skeleton className="h-7 w-24 mb-1" />
			) : (
				<>
					<p className="text-2xl font-bold text-gray-900">{value}</p>
					{sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
				</>
			)}
		</div>
	);
}

export default function RentalDashboard() {
	const { data: leases, isLoading: leasesLoading } = useListLeaseContracts();
	const { data: accruals, isLoading: accrualsLoading } = useListAccruals();
	const { data: payments, isLoading: paymentsLoading } = useListPayments();
	const { data: tenants, isLoading: tenantsLoading } = useListTenants();
	const { data: properties } = useListProperties();

	// Безопасное преобразование данных в массивы
	const leasesArray = Array.isArray(leases) ? leases : [];
	const accrualsArray = Array.isArray(accruals) ? accruals : [];
	const paymentsArray = Array.isArray(payments) ? payments : [];
	const tenantsArray = Array.isArray(tenants) ? tenants : [];
	const propertiesArray = Array.isArray(properties) ? properties : [];

	const activeLeases = leasesArray.filter((l) => l.status === "active");
	const pendingAccruals = accrualsArray.filter((a) => a.status === "pending");
	const overdueAccruals = accrualsArray.filter((a) => a.status === "overdue");
	const totalCharged = accrualsArray.reduce(
		(s, a) => s + parseFloat(String(a.amount || 0)),
		0,
	);
	const totalPaid = paymentsArray.reduce(
		(s, p) => s + parseFloat(String(p.amount || 0)),
		0,
	);
	const totalBalance = accrualsArray.reduce(
		(s, a) => s + parseFloat(String(a.balance || 0)),
		0,
	);
	const rentedProps = propertiesArray.filter(
		(p) => p.rentalStatus === "rented",
	).length;

	const recentPayments = [...paymentsArray]
		.sort(
			(a, b) =>
				new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
		)
		.slice(0, 5);

	const leaseMap = Object.fromEntries(
		leasesArray.map((l) => [l.id, l.contractNumber]),
	);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Дашборд аренды</h1>
				<p className="text-sm text-gray-500 mt-1">
					Сводная информация по арендному портфелю
				</p>
			</div>

			{/* KPI Row 1 */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<KpiCard
					label="Активных договоров"
					value={activeLeases.length}
					sub={`из ${leasesArray.length} всего`}
					icon={FileText}
					color="blue"
					loading={leasesLoading}
				/>
				<KpiCard
					label="Арендаторов"
					value={tenantsArray.filter((t) => t.status === "active").length}
					sub="активных"
					icon={Users}
					color="purple"
					loading={tenantsLoading}
				/>
				<KpiCard
					label="Сдаётся объектов"
					value={rentedProps}
					sub={`из ${propertiesArray.length} в портфеле`}
					icon={Building2}
					color="green"
				/>
				<KpiCard
					label="Просроченных начислений"
					value={overdueAccruals.length}
					sub={
						overdueAccruals.length > 0 ? "требуют внимания" : "всё в порядке"
					}
					icon={AlertTriangle}
					color={overdueAccruals.length > 0 ? "red" : "green"}
					loading={accrualsLoading}
				/>
			</div>

			{/* KPI Row 2 - Financial */}
			<div className="grid grid-cols-3 gap-4">
				<KpiCard
					label="Начислено всего"
					value={formatCurrency(totalCharged)}
					sub="за всё время"
					icon={Receipt}
					color="blue"
					loading={accrualsLoading}
				/>
				<KpiCard
					label="Получено платежей"
					value={formatCurrency(totalPaid)}
					sub="за всё время"
					icon={TrendingUp}
					color="green"
					loading={paymentsLoading}
				/>
				<KpiCard
					label="Общая задолженность"
					value={formatCurrency(totalBalance)}
					sub={totalBalance > 0 ? "к погашению" : "задолженности нет"}
					icon={totalBalance > 0 ? AlertTriangle : CheckCircle2}
					color={totalBalance > 0 ? "red" : "green"}
					loading={accrualsLoading}
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				{/* Pending Accruals */}
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
					<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
						<h2 className="text-sm font-semibold text-gray-900">
							Ожидают подтверждения
						</h2>
						<span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
							{pendingAccruals.length}
						</span>
					</div>
					{accrualsLoading ? (
						<div className="p-5 space-y-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : pendingAccruals.length === 0 ? (
						<div className="py-10 text-center text-gray-400 text-sm">
							<CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
							Все начисления подтверждены
						</div>
					) : (
						<ul className="divide-y divide-gray-50">
							{pendingAccruals.slice(0, 5).map((a) => (
								<li
									key={a.id}
									className="flex items-center justify-between px-5 py-3"
								>
									<div>
										<p className="text-sm text-gray-800">
											Договор #{a.leaseContractId} — {a.period}
										</p>
										<p className="text-xs text-gray-400">
											До {new Date(a.dueDate).toLocaleDateString("ru-KG")}
										</p>
									</div>
									<p className="text-sm font-semibold text-amber-600">
										{formatCurrency(parseFloat(String(a.amount)))}
									</p>
								</li>
							))}
							{pendingAccruals.length > 5 && (
								<li className="px-5 py-3 text-center">
									<Link
										href="/rental/accruals"
										className="text-xs text-blue-600 hover:underline"
									>
										Показать все {pendingAccruals.length} →
									</Link>
								</li>
							)}
						</ul>
					)}
				</div>

				{/* Recent Payments */}
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
					<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
						<h2 className="text-sm font-semibold text-gray-900">
							Последние платежи
						</h2>
						<Link
							href="/rental/payments"
							className="text-xs text-blue-600 hover:underline"
						>
							Все →
						</Link>
					</div>
					{paymentsLoading ? (
						<div className="p-5 space-y-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : recentPayments.length === 0 ? (
						<div className="py-10 text-center text-gray-400 text-sm">
							<Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
							Платежей пока нет
						</div>
					) : (
						<ul className="divide-y divide-gray-50">
							{recentPayments.map((p) => (
								<li
									key={p.id}
									className="flex items-center justify-between px-5 py-3"
								>
									<div>
										<p className="text-sm text-gray-800">
											{leaseMap[p.leaseContractId] ||
												`Договор #${p.leaseContractId}`}
										</p>
										<p className="text-xs text-gray-400">
											{new Date(p.paymentDate).toLocaleDateString("ru-KG")}
										</p>
									</div>
									<p className="text-sm font-semibold text-emerald-600">
										+{formatCurrency(parseFloat(String(p.amount)))}
									</p>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			{/* Active Leases Table */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
				<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
					<h2 className="text-sm font-semibold text-gray-900">
						Активные договоры
					</h2>
					<Link
						href="/rental/contracts"
						className="text-xs text-blue-600 hover:underline"
					>
						Все договоры →
					</Link>
				</div>
				{leasesLoading ? (
					<div className="p-5 space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				) : activeLeases.length === 0 ? (
					<div className="py-10 text-center text-gray-400 text-sm">
						Нет активных договоров аренды
					</div>
				) : (
					<div className="divide-y divide-gray-50">
						{activeLeases.slice(0, 6).map((l) => (
							<div
								key={l.id}
								className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/40 transition-colors"
							>
								<div>
									<p className="text-sm font-medium text-gray-800">
										{l.contractNumber}
									</p>
									<p className="text-xs text-gray-400">
										{l.tenantName || `Арендатор #${l.tenantId}`} ·{" "}
										{l.propertyUnitNumber || `Объект #${l.propertyId}`}
									</p>
								</div>
								<div className="text-right">
									<p className="text-sm font-semibold text-gray-900">
										{formatCurrency(parseFloat(String(l.rentAmount)))}
									</p>
									<p className="text-xs text-gray-400">
										{l.endDate
											? `до ${new Date(l.endDate).toLocaleDateString("ru-KG")}`
											: "бессрочный"}
									</p>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
