import { useQuery } from "@tanstack/react-query";
import {
	ArrowRight,
	BarChart2,
	Building2,
	CheckCircle,
	DollarSign,
	Download,
	Package,
	TrendingDown,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { AreaChart, PieChart, SparkLine } from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";

function fmtShort(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0";
	if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} млн`;
	if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} тыс`;
	return String(Math.round(v));
}

export default function EnhancedConstructionDashboardV2() {
	const [selectedProject, setSelectedProject] = useState<string>("all");

	const { data: projects = [] } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});

	const { data: units = [] } = useQuery({
		queryKey: ["construction-units"],
		queryFn: () => api.get("/construction/units").then((r) => r.data),
	});

	const { data: expenses = [] } = useQuery({
		queryKey: ["construction-expenses"],
		queryFn: () => api.get("/construction/expenses").then((r) => r.data),
	});

	const projectsArray = Array.isArray(projects) ? projects : [];
	const unitsArray = Array.isArray(units) ? units : [];
	const expensesArray = Array.isArray(expenses) ? expenses : [];

	// Calculate statistics
	const overallStats = {
		totalProjects: projectsArray.length,
		activeProjects: projectsArray.filter(
			(p: any) => p.status === "active" || p.status === "planning",
		).length,
		totalUnits: unitsArray.length,
		soldUnits: unitsArray.filter(
			(u: any) => u.status === "sold" || u.status === "registered",
		).length,
		totalBudget: projectsArray.reduce(
			(sum: number, p: any) => sum + parseFloat(p.totalBudget || "0"),
			0,
		),
		totalSpent: expensesArray.reduce(
			(sum: number, e: any) => sum + parseFloat(e.amountKgs || "0"),
			0,
		),
		totalRevenue: unitsArray
			.filter((u: any) => u.status === "sold" || u.status === "registered")
			.reduce(
				(sum: number, u: any) => sum + parseFloat(u.totalPrice || "0"),
				0,
			),
	};

	const overallProfit = overallStats.totalRevenue - overallStats.totalSpent;
	const budgetProgress =
		overallStats.totalBudget > 0
			? (overallStats.totalSpent / overallStats.totalBudget) * 100
			: 0;
	const salesProgress =
		overallStats.totalUnits > 0
			? (overallStats.soldUnits / overallStats.totalUnits) * 100
			: 0;

	// Mock data for charts (в реальном приложении будет из API)
	const monthlyExpenses = [
		{ name: "Янв", value: 2400000 },
		{ name: "Фев", value: 1398000 },
		{ name: "Мар", value: 9800000 },
		{ name: "Апр", value: 3908000 },
		{ name: "Май", value: 4800000 },
		{ name: "Июн", value: 3800000 },
	];

	const budgetByCategory = [
		{ name: "Материалы", value: 4500000, color: "#8b5cf6" },
		{ name: "Работы", value: 3200000, color: "#14b8a6" },
		{ name: "Техника", value: 1800000, color: "#fb923c" },
		{ name: "Зарплаты", value: 2500000, color: "#ef4444" },
		{ name: "Прочее", value: 800000, color: "#eab308" },
	];

	const sparklineData = [2.4, 1.4, 9.8, 3.9, 4.8, 3.8, 5.2, 6.1];

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-teal-50/20 p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-4xl font-extrabold text-gray-900">
						Контроль строительства
					</h1>
					<p className="text-gray-600 mt-2 text-lg">
						Аналитика в реальном времени
					</p>
				</div>
				<select
					value={selectedProject}
					onChange={(e) => setSelectedProject(e.target.value)}
					className="px-5 py-3 border-2 border-blue-200 rounded-xl font-medium text-gray-700 hover:border-purple-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
				>
					<option value="all">📊 Все проекты</option>
					{projectsArray.map((p: any) => (
						<option key={p.id} value={p.id}>
							🏗️ {p.name}
						</option>
					))}
				</select>
			</div>

			{/* KPI Cards with Gradients */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{/* Card 1 - Projects */}
				<div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-purple-700 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
					<div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
					<div className="relative z-10">
						<div className="flex items-center justify-between mb-4">
							<Building2 className="w-10 h-10 opacity-80" />
							<Badge className="bg-white/20 text-white border-0">Активно</Badge>
						</div>
						<div className="text-5xl font-bold mb-2">
							{overallStats.totalProjects}
						</div>
						<div className="text-purple-100 text-sm mb-3">Всего проектов</div>
						<div className="flex items-center gap-2 text-xs">
							<CheckCircle className="w-4 h-4" />
							<span>{overallStats.activeProjects} в работе</span>
						</div>
					</div>
				</div>

				{/* Card 2 - Budget */}
				<div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
					<div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
					<div className="relative z-10">
						<div className="flex items-center justify-between mb-4">
							<Wallet className="w-10 h-10 opacity-80" />
							<Badge className="bg-white/20 text-white border-0">
								{Math.round(budgetProgress)}%
							</Badge>
						</div>
						<div className="text-4xl font-bold mb-2">
							{fmtShort(overallStats.totalBudget)}
						</div>
						<div className="text-teal-100 text-sm mb-3">Общий бюджет</div>
						<div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
							<div
								className="bg-white h-full rounded-full transition-all duration-500"
								style={{ width: `${Math.min(budgetProgress, 100)}%` }}
							/>
						</div>
					</div>
				</div>

				{/* Card 3 - Sales */}
				<div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
					<div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
					<div className="relative z-10">
						<div className="flex items-center justify-between mb-4">
							<Package className="w-10 h-10 opacity-80" />
							<Badge className="bg-white/20 text-white border-0">
								{Math.round(salesProgress)}%
							</Badge>
						</div>
						<div className="text-4xl font-bold mb-2">
							{overallStats.soldUnits}/{overallStats.totalUnits}
						</div>
						<div className="text-orange-100 text-sm mb-3">Продано юнитов</div>
						<div className="h-12">
							<SparkLine data={sparklineData} color="#ffffff" height={48} />
						</div>
					</div>
				</div>

				{/* Card 4 - Profit */}
				<div
					className={`group relative overflow-hidden rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 ${
						overallProfit >= 0
							? "bg-gradient-to-br from-green-500 to-green-700"
							: "bg-gradient-to-br from-red-500 to-red-700"
					}`}
				>
					<div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
					<div className="relative z-10">
						<div className="flex items-center justify-between mb-4">
							{overallProfit >= 0 ? (
								<TrendingUp className="w-10 h-10 opacity-80" />
							) : (
								<TrendingDown className="w-10 h-10 opacity-80" />
							)}
							<Badge className="bg-white/20 text-white border-0">
								{overallStats.totalSpent > 0
									? Math.round((overallProfit / overallStats.totalSpent) * 100)
									: 0}
								%
							</Badge>
						</div>
						<div className="text-4xl font-bold mb-2">
							{fmtShort(Math.abs(overallProfit))}
						</div>
						<div
							className={`${overallProfit >= 0 ? "text-green-100" : "text-red-100"} text-sm mb-3`}
						>
							{overallProfit >= 0 ? "Прибыль" : "Убыток"}
						</div>
						<div className="flex items-center gap-2 text-xs">
							<DollarSign className="w-4 h-4" />
							<span>Доход: {fmtShort(overallStats.totalRevenue)}</span>
						</div>
					</div>
				</div>
			</div>

			{/* Charts Section */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Monthly Expenses Chart */}
				<Card className="p-6 rounded-2xl shadow-lg border-0 bg-white/80 backdrop-blur">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="text-xl font-bold text-gray-900">
								Расходы по месяцам
							</h3>
							<p className="text-sm text-gray-500 mt-1">Динамика затрат</p>
						</div>
						<Button variant="outline" size="sm" className="gap-2">
							<Download className="w-4 h-4" />
							Экспорт
						</Button>
					</div>
					<AreaChart data={monthlyExpenses} color="#8b5cf6" height={280} />
				</Card>

				{/* Budget by Category */}
				<Card className="p-6 rounded-2xl shadow-lg border-0 bg-white/80 backdrop-blur">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="text-xl font-bold text-gray-900">
								Бюджет по категориям
							</h3>
							<p className="text-sm text-gray-500 mt-1">Распределение затрат</p>
						</div>
						<Button variant="outline" size="sm" className="gap-2">
							<BarChart2 className="w-4 h-4" />
							Детали
						</Button>
					</div>
					<PieChart data={budgetByCategory} height={280} showLegend={false} />
				</Card>
			</div>

			{/* Projects List */}
			<Card className="p-6 rounded-2xl shadow-lg border-0 bg-white/80 backdrop-blur">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h3 className="text-xl font-bold text-gray-900">
							Активные проекты
						</h3>
						<p className="text-sm text-gray-500 mt-1">Статус и прогресс</p>
					</div>
					<Link href="/construction/projects">
						<Button className="bg-gradient-to-r from-purple-600 to-teal-600 text-white gap-2 hover:shadow-lg transition-shadow">
							Все проекты
							<ArrowRight className="w-4 h-4" />
						</Button>
					</Link>
				</div>

				<div className="space-y-4">
					{projectsArray.slice(0, 5).map((project: any) => {
						const projectUnits = unitsArray.filter(
							(u: any) => String(u.projectId) === String(project.id),
						);
						const soldCount = projectUnits.filter(
							(u: any) => u.status === "sold" || u.status === "registered",
						).length;
						const salesPct =
							projectUnits.length > 0
								? (soldCount / projectUnits.length) * 100
								: 0;
						const budget = parseFloat(project.totalBudget || "0");
						const spent = expensesArray
							.filter((e: any) => String(e.projectId) === String(project.id))
							.reduce(
								(sum: number, e: any) => sum + parseFloat(e.amountKgs || "0"),
								0,
							);
						const budgetPct = budget > 0 ? (spent / budget) * 100 : 0;

						return (
							<Link
								key={project.id}
								href={`/construction/projects/${project.id}`}
							>
								<div className="group p-5 rounded-xl border-2 border-gray-100 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer bg-gradient-to-r hover:from-purple-50/50 hover:to-teal-50/50">
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center gap-3">
											<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
												{project.name.charAt(0)}
											</div>
											<div>
												<h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
													{project.name}
												</h4>
												<p className="text-sm text-gray-500">
													{project.address}
												</p>
											</div>
										</div>
										<Badge
											className={`${
												project.status === "active"
													? "bg-emerald-100 text-emerald-700"
													: project.status === "planning"
														? "bg-blue-100 text-blue-700"
														: "bg-gray-100 text-gray-700"
											}`}
										>
											{project.status === "active"
												? "🟢 Активен"
												: project.status === "planning"
													? "🔵 Планирование"
													: "⚫ Завершен"}
										</Badge>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<div className="flex items-center justify-between text-xs text-gray-500 mb-2">
												<span>Продажи</span>
												<span className="font-semibold text-gray-900">
													{Math.round(salesPct)}%
												</span>
											</div>
											<Progress value={salesPct} className="h-2" />
											<p className="text-xs text-gray-500 mt-1">
												{soldCount} из {projectUnits.length} юнитов
											</p>
										</div>
										<div>
											<div className="flex items-center justify-between text-xs text-gray-500 mb-2">
												<span>Бюджет</span>
												<span className="font-semibold text-gray-900">
													{Math.round(budgetPct)}%
												</span>
											</div>
											<Progress value={budgetPct} className="h-2" />
											<p className="text-xs text-gray-500 mt-1">
												{fmtShort(spent)} из {fmtShort(budget)}
											</p>
										</div>
									</div>
								</div>
							</Link>
						);
					})}
				</div>
			</Card>
		</div>
	);
}
