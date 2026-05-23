import {
	Activity,
	Calendar,
	DollarSign,
	Target,
	TrendingUp,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface DashboardData {
	activeLeads: number;
	conversionRate: number;
	pipelineByStage: Array<{ stage: string; count: number; label: string }>;
	dealsByStage: Array<{
		stage: string;
		count: number;
		amount: number;
		label: string;
	}>;
	revenueForecast: { total: number; currency: string };
	recentActivities: Array<{
		id: number;
		type: string;
		description: string;
		date: string;
	}>;
}

const STAGE_COLORS: Record<string, string> = {
	lead: "bg-blue-100 text-blue-700",
	viewing: "bg-amber-100 text-amber-700",
	negotiation: "bg-amber-100 text-amber-700",
	contract: "bg-blue-100 text-blue-700",
	closed_won: "bg-emerald-100 text-emerald-700",
	closed_lost: "bg-rose-100 text-rose-700",
};

export default function CRMDashboard() {
	const [data, setData] = useState<DashboardData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const { toast } = useToast();

	const loadDashboard = async () => {
		try {
			setIsLoading(true);
			const response = await api.get<DashboardData>("/crm/dashboard");
			setData(response.data);
		} catch (err: any) {
			toast({
				title: "Ошибка загрузки",
				description: err.message || "Не удалось загрузить данные дашборда",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadDashboard();
	}, []);

	if (isLoading) {
		return (
			<div className="space-y-5">
				<h1 className="text-2xl font-bold">CRM Дашборд</h1>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Card key={i}>
							<CardHeader>
								<Skeleton className="h-4 w-24" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-8 w-16" />
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	}

	if (!data) {
		return <div className="text-center py-12 text-gray-500">Нет данных</div>;
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
					<Target className="w-6 h-6 text-blue-600" /> CRM Дашборд
				</h1>
				<p className="text-sm text-gray-500 mt-1">
					Обзор продаж и воронки лидов
				</p>
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Активные лиды</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{data.activeLeads}</div>
						<p className="text-xs text-muted-foreground">В работе</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Конверсия</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{data?.conversionRate?.toFixed(1) || "0"}%
						</div>
						<p className="text-xs text-muted-foreground">Лид → Клиент</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Прогноз выручки
						</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{data?.revenueForecast?.total
								? formatCurrency(
										data.revenueForecast.total,
										data.revenueForecast.currency,
									)
								: "0"}
						</div>
						<p className="text-xs text-muted-foreground">Взвешенный прогноз</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Сделки в работе
						</CardTitle>
						<Activity className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{data?.dealsByStage?.reduce((sum, s) => sum + s.count, 0) || 0}
						</div>
						<p className="text-xs text-muted-foreground">Всего сделок</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Pipeline by Stage */}
				<Card>
					<CardHeader>
						<CardTitle>Воронка продаж</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{Array.isArray(data?.pipelineByStage) &&
							data.pipelineByStage.length > 0 ? (
								data.pipelineByStage.map((stage) => {
									const maxCount = Math.max(
										...(data?.pipelineByStage?.map((s) => s.count) || [1]),
									);
									return (
										<div
											key={stage.stage}
											className="flex items-center justify-between"
										>
											<div className="flex items-center gap-3 flex-1">
												<div
													className={`text-xs font-medium px-2.5 py-1 rounded ${STAGE_COLORS[stage.stage] || "bg-gray-100 text-gray-800"}`}
												>
													{stage.label}
												</div>
												<div className="flex-1 bg-gray-200 rounded-full h-2">
													<div
														className="bg-blue-600 h-2 rounded-full transition-all"
														style={{
															width: `${Math.min(100, (stage.count / maxCount) * 100)}%`,
														}}
													/>
												</div>
											</div>
											<div className="text-sm font-semibold text-gray-900 ml-3">
												{stage.count}
											</div>
										</div>
									);
								})
							) : (
								<p className="text-sm text-gray-500 text-center py-4">
									Нет данных по воронке
								</p>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Deals by Stage */}
				<Card>
					<CardHeader>
						<CardTitle>Сделки по этапам</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{Array.isArray(data?.dealsByStage) &&
							data.dealsByStage.length > 0 ? (
								data.dealsByStage.map((stage) => (
									<div
										key={stage.stage}
										className="flex items-center justify-between border-b border-gray-100 pb-2"
									>
										<div>
											<div
												className={`text-xs font-medium px-2.5 py-1 rounded inline-block ${STAGE_COLORS[stage.stage] || "bg-gray-100 text-gray-800"}`}
											>
												{stage.label}
											</div>
											<div className="text-xs text-gray-500 mt-1">
												{stage.count} сделок
											</div>
										</div>
										<div className="text-right">
											<div className="text-sm font-semibold text-gray-900">
												{formatCurrency(stage.amount, "KGS")}
											</div>
										</div>
									</div>
								))
							) : (
								<p className="text-sm text-gray-500 text-center py-4">
									Нет активных сделок
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Recent Activities */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Calendar className="w-5 h-5" />
						Последняя активность
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{Array.isArray(data?.recentActivities) &&
						data.recentActivities.length > 0 ? (
							data.recentActivities.map((activity) => (
								<div
									key={activity.id}
									className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0"
								>
									<div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
									<div className="flex-1">
										<p className="text-sm text-gray-900">
											{activity.description}
										</p>
										<p className="text-xs text-gray-500 mt-1">
											{new Date(activity.date).toLocaleString("ru-RU", {
												day: "2-digit",
												month: "2-digit",
												year: "numeric",
												hour: "2-digit",
												minute: "2-digit",
											})}
										</p>
									</div>
								</div>
							))
						) : (
							<p className="text-sm text-gray-500 text-center py-4">
								Нет активности
							</p>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
