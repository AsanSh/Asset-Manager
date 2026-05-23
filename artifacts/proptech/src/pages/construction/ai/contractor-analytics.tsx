import { useQuery } from "@tanstack/react-query";
import {
	AlertTriangle,
	CheckCircle2,
	Loader2,
	RefreshCw,
	TrendingUp,
	Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";

interface ContractorAnalysis {
	id: number;
	name: string;
	totalPaid: number;
	contractAmount: number | null;
	utilizationPct: number;
	riskLevel: "low" | "medium" | "high";
	insight: string;
}

interface AnalyticsResult {
	summary: string;
	contractors: ContractorAnalysis[];
	topRisks: string[];
	recommendations: string[];
}

function riskBadge(level: string) {
	if (level === "low")
		return (
			<Badge className="bg-green-100 text-green-700 border-green-200">
				Низкий
			</Badge>
		);
	if (level === "medium")
		return (
			<Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
				Средний
			</Badge>
		);
	return (
		<Badge className="bg-red-100 text-red-700 border-red-200">Высокий</Badge>
	);
}

export default function ContractorAnalytics() {
	const { data, isLoading, isError, refetch, isFetching } =
		useQuery<AnalyticsResult>({
			queryKey: ["contractor-analytics"],
			queryFn: async () => {
				const { data } = await api.get("/ai/contractor-analytics");
				return data;
			},
			staleTime: 5 * 60 * 1000,
		});

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
				<Loader2 className="w-8 h-8 animate-spin" />
				<p className="text-sm">AI анализирует данные подрядчиков...</p>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="p-6 text-center">
				<p className="text-muted-foreground">
					Ошибка загрузки.{" "}
					<Button variant="link" onClick={() => refetch()}>
						Повторить
					</Button>
				</p>
			</div>
		);
	}

	const counts = data
		? {
				low: data.contractors.filter((c) => c.riskLevel === "low").length,
				medium: data.contractors.filter((c) => c.riskLevel === "medium").length,
				high: data.contractors.filter((c) => c.riskLevel === "high").length,
			}
		: { low: 0, medium: 0, high: 0 };

	return (
		<div className="p-6 max-w-5xl mx-auto space-y-6">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-bold">Аналитика подрядчиков</h1>
					<p className="text-muted-foreground text-sm mt-1">
						AI-анализ рентабельности и рисков по каждому подрядчику
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => refetch()}
					disabled={isFetching}
				>
					{isFetching ? (
						<Loader2 className="w-4 h-4 animate-spin" />
					) : (
						<RefreshCw className="w-4 h-4" />
					)}
					<span className="ml-2">Обновить</span>
				</Button>
			</div>

			{/* Сводка */}
			<div className="grid grid-cols-3 gap-4">
				<Card className="border-green-200 bg-green-50 dark:bg-green-950">
					<CardContent className="pt-4 text-center">
						<p className="text-3xl font-bold text-green-600">{counts.low}</p>
						<p className="text-sm text-green-700 mt-1">Надёжные</p>
					</CardContent>
				</Card>
				<Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
					<CardContent className="pt-4 text-center">
						<p className="text-3xl font-bold text-yellow-600">
							{counts.medium}
						</p>
						<p className="text-sm text-yellow-700 mt-1">Под наблюдением</p>
					</CardContent>
				</Card>
				<Card className="border-red-200 bg-red-50 dark:bg-red-950">
					<CardContent className="pt-4 text-center">
						<p className="text-3xl font-bold text-red-600">{counts.high}</p>
						<p className="text-sm text-red-700 mt-1">Высокий риск</p>
					</CardContent>
				</Card>
			</div>

			{/* Резюме */}
			{data?.summary && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base flex items-center gap-2">
							<TrendingUp className="w-4 h-4" />
							Общий вывод AI
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm">{data.summary}</p>
					</CardContent>
				</Card>
			)}

			{/* Список подрядчиков */}
			{data?.contractors?.length ? (
				<Card>
					<CardHeader>
						<CardTitle className="text-base flex items-center gap-2">
							<Users className="w-4 h-4" />
							Подрядчики
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{data.contractors.map((c) => (
							<div key={c.id} className="border rounded-xl p-4 space-y-3">
								<div className="flex items-center justify-between gap-2">
									<div>
										<p className="font-semibold">{c.name}</p>
										<p className="text-xs text-muted-foreground italic mt-0.5">
											{c.insight}
										</p>
									</div>
									{riskBadge(c.riskLevel)}
								</div>
								<div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
									<div>
										<p className="text-xs text-muted-foreground">Выплачено</p>
										<p className="font-medium">
											{Number(c.totalPaid || 0).toLocaleString("ru-RU")} ₽
										</p>
									</div>
									{c.contractAmount && (
										<div>
											<p className="text-xs text-muted-foreground">
												По контракту
											</p>
											<p className="font-medium">
												{Number(c.contractAmount).toLocaleString("ru-RU")} ₽
											</p>
										</div>
									)}
									{c.contractAmount && (
										<div>
											<p className="text-xs text-muted-foreground">Освоено</p>
											<p className="font-medium">
												{(c.utilizationPct ?? 0).toFixed(1)}%
											</p>
										</div>
									)}
								</div>
								{c.contractAmount && (
									<div className="space-y-1">
										<Progress
											value={Math.min(c.utilizationPct ?? 0, 100)}
											className="h-1.5"
										/>
									</div>
								)}
							</div>
						))}
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardContent className="pt-6 text-center text-muted-foreground">
						<Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
						<p>Подрядчики не найдены. Добавьте их в разделе "Подрядчики".</p>
					</CardContent>
				</Card>
			)}

			{/* Риски и рекомендации */}
			{data?.topRisks?.length || data?.recommendations?.length ? (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{data?.topRisks?.length ? (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm text-red-600">
									Ключевые риски
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								{data.topRisks.map((r, i) => (
									<div key={i} className="flex items-start gap-2 text-sm">
										<AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
										<span>{r}</span>
									</div>
								))}
							</CardContent>
						</Card>
					) : null}
					{data?.recommendations?.length ? (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm text-green-600">
									Рекомендации
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								{data.recommendations.map((r, i) => (
									<div key={i} className="flex items-start gap-2 text-sm">
										<CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
										<span>{r}</span>
									</div>
								))}
							</CardContent>
						</Card>
					) : null}
				</div>
			) : null}
		</div>
	);
}
