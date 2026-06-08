import { useQuery } from "@tanstack/react-query";
import {
	BarChart3,
	Building2,
	Download,
	PieChart,
	TrendingDown,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiBase } from "@/lib/api-base";

function fmtKgs(v: number) {
	if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} млн с`;
	if (v >= 1_000) return `${(v / 1_000).toFixed(0)} тыс с`;
	return `${v.toFixed(0)} с`;
}

export default function ConstructionReports() {
	const [selectedProject, setSelectedProject] = useState<string>("");
	const { toast } = useToast();
	const BASE = getApiBase();

	const { data: projects = [] } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});

	const { data: dash, isLoading } = useQuery({
		queryKey: ["construction-dashboard"],
		queryFn: () => api.get("/construction/dashboard").then((r) => r.data),
	});

	const spentPct =
		dash?.totalBudget > 0 ? (dash.totalSpent / dash.totalBudget) * 100 : 0;
	const soldPct =
		dash?.totalUnits > 0 ? (dash.soldUnits / dash.totalUnits) * 100 : 0;

	const handleExportBudget = () => {
		if (!selectedProject) {
			toast({
				title: "Выберите проект",
				description: "Для экспорта бюджета необходимо выбрать проект",
				variant: "destructive",
			});
			return;
		}
		window.open(
			`${BASE}/construction/projects/${selectedProject}/reports/budget/excel`,
			"_blank",
		);
	};

	const handleExportCost = () => {
		if (!selectedProject) {
			toast({
				title: "Выберите проект",
				description: "Для экспорта себестоимости необходимо выбрать проект",
				variant: "destructive",
			});
			return;
		}
		window.open(
			`${BASE}/construction/projects/${selectedProject}/reports/cost-analysis/excel`,
			"_blank",
		);
	};

	const projectsArray = Array.isArray(projects) ? projects : [];

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Отчёты строительства
					</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Финансовые и операционные показатели
					</p>
				</div>
				<div className="flex gap-3 items-center">
					<Select value={selectedProject} onValueChange={setSelectedProject}>
						<SelectTrigger className="w-full sm:w-56">
							<SelectValue placeholder="Выберите проект" />
						</SelectTrigger>
						<SelectContent>
							{projectsArray.map((p: any) => (
								<SelectItem key={p.id} value={String(p.id)}>
									{p.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						variant="outline"
						onClick={handleExportBudget}
						className="gap-2"
					>
						<Download className="w-4 h-4" /> Бюджет
					</Button>
					<Button
						variant="outline"
						onClick={handleExportCost}
						className="gap-2"
					>
						<Download className="w-4 h-4" /> Себестоимость
					</Button>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				{/* Budget vs Actual */}
				<div className="bg-white rounded-xl border border-gray-200 p-5 sm:col-span-2">
					<h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
						<BarChart3 className="w-4 h-4 text-amber-600" /> Бюджет vs Факт
					</h3>
					{isLoading ? (
						<Skeleton className="h-24" />
					) : (
						<div className="space-y-4">
							<div className="flex justify-between items-center">
								<div className="space-y-1">
									<div className="flex gap-8">
										<div>
											<p className="text-xs text-gray-600">Плановый бюджет</p>
											<p className="text-2xl font-bold text-blue-600">
												{fmtKgs(dash?.totalBudget || 0)}
											</p>
										</div>
										<div>
											<p className="text-xs text-gray-600">Потрачено</p>
											<p className="text-2xl font-bold text-amber-600">
												{fmtKgs(dash?.totalSpent || 0)}
											</p>
										</div>
										<div>
											<p className="text-xs text-gray-600">Остаток</p>
											<p
												className={`text-2xl font-bold ${(dash?.budgetRemaining || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}
											>
												{fmtKgs(dash?.budgetRemaining || 0)}
											</p>
										</div>
									</div>
								</div>
								<div className="text-right">
									<p className="text-xs text-gray-600">Освоение</p>
									<p
										className={`text-3xl font-bold ${spentPct > 90 ? "text-rose-600" : spentPct > 70 ? "text-amber-600" : "text-emerald-700"}`}
									>
										{spentPct.toFixed(1)}%
									</p>
								</div>
							</div>
							<div>
								<div className="h-4 bg-gray-100 rounded-full overflow-hidden">
									<div
										className={`h-full rounded-full transition-all ${spentPct > 100 ? "bg-rose-600" : spentPct > 80 ? "bg-amber-500" : "bg-emerald-600"}`}
										style={{ width: `${Math.min(100, spentPct)}%` }}
									/>
								</div>
								<div className="flex justify-between text-xs text-gray-600 mt-1">
									<span>0</span>
									<span>{fmtKgs(dash?.totalBudget || 0)}</span>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Tasks */}
				<div className="bg-white rounded-xl border border-gray-200 p-5">
					<h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
						<TrendingDown className="w-4 h-4 text-blue-500" /> Задачи
					</h3>
					{isLoading ? (
						<Skeleton className="h-20" />
					) : (
						<div className="space-y-3">
							<div className="flex justify-between items-end">
								<div>
									<p className="text-xs text-gray-600">Выполнено</p>
									<p className="text-3xl font-bold text-emerald-600">
										{dash?.doneTasks || 0}
									</p>
								</div>
								<div className="text-right">
									<p className="text-xs text-gray-600">Всего</p>
									<p className="text-xl font-bold text-gray-700">
										{dash?.totalTasks || 0}
									</p>
								</div>
							</div>
							<div className="h-3 bg-gray-100 rounded-full overflow-hidden">
								<div
									className="h-full bg-emerald-600 rounded-full"
									style={{
										width: `${dash?.totalTasks > 0 ? (dash.doneTasks / dash.totalTasks) * 100 : 0}%`,
									}}
								/>
							</div>
						</div>
					)}
				</div>

				{/* Sales */}
				<div className="bg-white rounded-xl border border-gray-200 p-5">
					<h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
						<PieChart className="w-4 h-4 text-indigo-500" /> Продажи
					</h3>
					{isLoading ? (
						<Skeleton className="h-20" />
					) : (
						<div className="space-y-3">
							<div className="flex justify-between items-end">
								<div>
									<p className="text-xs text-gray-600">Продано</p>
									<p className="text-3xl font-bold text-indigo-600">
										{dash?.soldUnits || 0}
									</p>
								</div>
								<div className="text-right">
									<p className="text-xs text-gray-600">Выручка</p>
									<p className="text-base font-bold text-emerald-600">
										{fmtKgs(dash?.soldRevenue || 0)}
									</p>
								</div>
							</div>
							<div className="h-3 bg-gray-100 rounded-full overflow-hidden">
								<div
									className="h-full bg-indigo-500 rounded-full"
									style={{ width: `${soldPct}%` }}
								/>
							</div>
							<p className="text-xs text-gray-600">
								{soldPct.toFixed(1)}% от {dash?.totalUnits || 0} юнитов
							</p>
						</div>
					)}
				</div>

				{/* Projects */}
				<div className="bg-white rounded-xl border border-gray-200 p-5 sm:col-span-2">
					<h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
						<Building2 className="w-4 h-4 text-amber-600" /> Сводка по проектам
					</h3>
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{[
							{
								label: "Всего проектов",
								value: dash?.totalProjects || 0,
								color: "text-gray-800",
							},
							{
								label: "Активных",
								value: dash?.activeProjects || 0,
								color: "text-blue-600",
							},
							{
								label: "Завершённых",
								value: dash?.completedProjects || 0,
								color: "text-emerald-600",
							},
						].map((s) => (
							<div
								key={s.label}
								className="text-center p-4 bg-gray-50 rounded-xl"
							>
								<p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
								<p className="text-xs text-gray-600 mt-1">{s.label}</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
