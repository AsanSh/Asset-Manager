import { useQuery } from "@tanstack/react-query";
import { ArrowRight, PiggyBank, TrendingUp, Users } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export default function InvestorsDashboardTab() {
	const { data: investors = [], isLoading } = useQuery({
		queryKey: ["rental-investors-dashboard"],
		queryFn: () => api.get("/rental/investors").then((r) => r.data),
	});

	const list = Array.isArray(investors) ? investors : [];
	const active = list.filter((i: { isActive?: boolean }) => i.isActive !== false);

	return (
		<div className="space-y-4">
			<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 gap-3">
				<div className="bg-white rounded-xl border p-4">
					<Users className="w-4 h-4 text-blue-600 mb-2" />
					{isLoading ? (
						<Skeleton className="h-7 w-16" />
					) : (
						<p className="text-2xl font-bold">{active.length}</p>
					)}
					<p className="text-xs text-gray-500">Активных инвесторов</p>
				</div>
				<div className="bg-white rounded-xl border p-4">
					<PiggyBank className="w-4 h-4 text-emerald-600 mb-2" />
					<p className="text-2xl font-bold">{list.length}</p>
					<p className="text-xs text-gray-500">Всего в реестре</p>
				</div>
				<div className="bg-white rounded-xl border p-4">
					<TrendingUp className="w-4 h-4 text-amber-600 mb-2" />
					<p className="text-sm font-medium text-gray-700">Выплаты и доли</p>
					<p className="text-xs text-gray-600 mt-1">Детали в модуле</p>
				</div>
			</div>

			<Link href="/rental/investors">
				<div className="flex items-center justify-between bg-white border rounded-xl p-4 hover:border-amber-200 transition-colors">
					<span className="font-medium text-gray-900">Реестр инвесторов</span>
					<span className="text-amber-600 text-sm inline-flex items-center gap-1">
						Открыть <ArrowRight className="w-4 h-4" />
					</span>
				</div>
			</Link>
			<Link href="/rental/distributions">
				<div className="flex items-center justify-between bg-white border rounded-xl p-4 hover:border-amber-200 transition-colors">
					<span className="font-medium text-gray-900">Выплаты инвесторам</span>
					<span className="text-amber-600 text-sm inline-flex items-center gap-1">
						Открыть <ArrowRight className="w-4 h-4" />
					</span>
				</div>
			</Link>

			{!isLoading && list.length === 0 && (
				<p className="text-sm text-gray-600 text-center py-8">
					Инвесторы не добавлены. Перейдите в модуль «Аренда» → Инвесторы.
				</p>
			)}
		</div>
	);
}
