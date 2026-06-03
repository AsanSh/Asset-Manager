import { BarChart2, BarChart3, FileText, TrendingUp } from "lucide-react";
import { Link } from "wouter";

const REPORT_LINKS = [
	{
		href: "/reports/directions",
		label: "Расчёты с контрагентами",
		icon: BarChart3,
	},
	{ href: "/reports/debt", label: "Задолженность", icon: FileText },
	{ href: "/reports/cashflow", label: "Денежный поток", icon: TrendingUp },
	{ href: "/reports/rental", label: "Сводка аренды", icon: BarChart2 },
	{ href: "/reports/payments", label: "История платежей", icon: TrendingUp },
];

export default function AnalyticsDashboardTab() {
	return (
		<div className="space-y-4">
			<p className="text-sm text-gray-500">
				Углублённые отчёты и выгрузки. Оперативные решения — во вкладке «Центр
				управления».
			</p>
			<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{REPORT_LINKS.map((r) => {
					const Icon = r.icon;
					return (
						<Link key={r.href} href={r.href}>
							<div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-amber-200 hover:shadow-sm transition-all cursor-pointer h-full">
								<Icon className="w-5 h-5 text-amber-600 mb-2" />
								<p className="font-medium text-gray-900 text-sm">{r.label}</p>
							</div>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
