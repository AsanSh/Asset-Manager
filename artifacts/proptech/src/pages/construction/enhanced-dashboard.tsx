import { useQuery } from "@tanstack/react-query";
import {
	ArrowRight,
	BarChart2,
	Building2,
	CheckCircle,
	Package,
	TrendingDown,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";

function fmt(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-RU").format(Math.round(v));
}

function fmtShort(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0";
	if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} млн`;
	if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} тыс`;
	return String(Math.round(v));
}

export default function EnhancedConstructionDashboard() {
	const [selectedProject, setSelectedProject] = useState<string>("all");

	// Data fetching
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

	// Safe arrays
	const projectsArray = Array.isArray(projects) ? projects : [];
	const unitsArray = Array.isArray(units) ? units : [];
	const expensesArray = Array.isArray(expenses) ? expenses : [];
	// Calculate project statistics
	const calculateProjectStats = (projectId: number | string) => {
		const proj = projectsArray.find(
			(p: any) => String(p.id) === String(projectId),
		);
		if (!proj) return null;

		const projectUnits = unitsArray.filter(
			(u: any) => String(u.projectId) === String(projectId),
		);
		const projectExpenses = expensesArray.filter(
			(e: any) => String(e.projectId) === String(projectId),
		);

		const totalArea = parseFloat(proj.totalArea || "0");
		const totalBudget = parseFloat(proj.totalBudget || "0");
		const spentAmount = projectExpenses.reduce(
			(sum: number, e: any) => sum + parseFloat(e.amountKgs || "0"),
			0,
		);

		// Cost per sqm calculation
		const actualCostPerSqm = totalArea > 0 ? spentAmount / totalArea : 0;
		const plannedCostPerSqm = parseFloat(proj.costPerSqm || "0");

		// Sales statistics
		const soldUnits = projectUnits.filter(
			(u: any) => u.status === "sold" || u.status === "registered",
		);
		const availableUnits = projectUnits.filter(
			(u: any) => u.status === "available",
		);
		const reservedUnits = projectUnits.filter(
			(u: any) => u.status === "reserved",
		);

		const totalRevenue = soldUnits.reduce(
			(sum: number, u: any) => sum + parseFloat(u.totalPrice || "0"),
			0,
		);
		const expectedRevenue = projectUnits.reduce(
			(sum: number, u: any) => sum + parseFloat(u.totalPrice || "0"),
			0,
		);

		// Profitability
		const profit = totalRevenue - spentAmount;
		const profitMargin = spentAmount > 0 ? (profit / spentAmount) * 100 : 0;
		const roi = totalBudget > 0 ? (profit / totalBudget) * 100 : 0;

		// Progress
		const budgetProgress =
			totalBudget > 0 ? (spentAmount / totalBudget) * 100 : 0;
		const salesProgress =
			projectUnits.length > 0
				? (soldUnits.length / projectUnits.length) * 100
				: 0;

		return {
			project: proj,
			totalUnits: projectUnits.length,
			soldUnits: soldUnits.length,
			availableUnits: availableUnits.length,
			reservedUnits: reservedUnits.length,
			totalArea,
			totalBudget,
			spentAmount,
			actualCostPerSqm,
			plannedCostPerSqm,
			totalRevenue,
			expectedRevenue,
			profit,
			profitMargin,
			roi,
			budgetProgress,
			salesProgress,
		};
	};

	// Overall statistics
	const overallStats = {
		totalProjects: projectsArray.length,
		activeProjects: projectsArray.filter(
			(p: any) => p.status === "active" || p.status === "planning",
		).length,
		completedProjects: projectsArray.filter(
			(p: any) => p.status === "completed",
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

	overallStats.totalBudget = overallStats.totalBudget || 1; // Avoid division by zero
	const overallBudgetProgress =
		(overallStats.totalSpent / overallStats.totalBudget) * 100;
	const overallProfit = overallStats.totalRevenue - overallStats.totalSpent;
	const overallMargin =
		overallStats.totalSpent > 0
			? (overallProfit / overallStats.totalSpent) * 100
			: 0;

	// Selected project stats
	const selectedStats =
		selectedProject !== "all" ? calculateProjectStats(selectedProject) : null;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">
						Контроль строительства
					</h2>
					<p className="text-muted-foreground mt-2">
						Себестоимость, бюджет и продажи в реальном времени
					</p>
				</div>
				<select
					value={selectedProject}
					onChange={(e) => setSelectedProject(e.target.value)}
					className="px-4 py-2 border rounded-lg"
				>
					<option value="all">Все проекты</option>
					{projectsArray.map((p: any) => (
						<option key={p.id} value={p.id}>
							{p.name}
						</option>
					))}
				</select>
			</div>

			{/* Overall KPIs */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">Всего проектов</p>
							<p className="text-2xl font-bold">{overallStats.totalProjects}</p>
							<p className="text-xs text-emerald-600 mt-1">
								{overallStats.activeProjects} активных
							</p>
						</div>
						<Building2 className="h-10 w-10 text-blue-500 opacity-50" />
					</div>
				</Card>

				<Card className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">Общий бюджет</p>
							<p className="text-2xl font-bold">
								{fmtShort(overallStats.totalBudget)} сом
							</p>
							<div className="flex items-center gap-2 mt-1">
								<Progress
									value={overallBudgetProgress}
									className="w-20 h-1.5"
								/>
								<span className="text-xs">
									{Math.round(overallBudgetProgress)}%
								</span>
							</div>
						</div>
						<Wallet className="h-10 w-10 text-blue-500 opacity-50" />
					</div>
				</Card>

				<Card className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">Продано юнитов</p>
							<p className="text-2xl font-bold">
								{overallStats.soldUnits} / {overallStats.totalUnits}
							</p>
							<p className="text-xs text-blue-600 mt-1">
								{overallStats.totalUnits > 0
									? Math.round(
											(overallStats.soldUnits / overallStats.totalUnits) * 100,
										)
									: 0}
								% заполнение
							</p>
						</div>
						<CheckCircle className="h-10 w-10 text-emerald-600 opacity-50" />
					</div>
				</Card>

				<Card className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">Прибыль</p>
							<p
								className={`text-2xl font-bold ${overallProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
							>
								{fmtShort(overallProfit)} сом
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								Маржа: {overallMargin.toFixed(1)}%
							</p>
						</div>
						{overallProfit >= 0 ? (
							<TrendingUp className="h-10 w-10 text-emerald-600 opacity-50" />
						) : (
							<TrendingDown className="h-10 w-10 text-rose-600 opacity-50" />
						)}
					</div>
				</Card>
			</div>

			{/* Selected Project Details */}
			{selectedStats && (
				<Card className="p-6">
					<h3 className="text-xl font-semibold mb-4">
						{selectedStats.project.name}
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{/* Cost Analysis */}
						<div className="space-y-3">
							<h4 className="font-medium text-sm text-muted-foreground">
								Себестоимость
							</h4>
							<div className="space-y-2">
								<div className="flex justify-between items-center">
									<span className="text-sm">План за м²:</span>
									<span className="font-medium">
										{fmt(selectedStats.plannedCostPerSqm)} сом
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm">Факт за м²:</span>
									<span className="font-medium">
										{fmt(selectedStats.actualCostPerSqm)} сом
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm">Отклонение:</span>
									<span
										className={`font-medium ${selectedStats.actualCostPerSqm > selectedStats.plannedCostPerSqm ? "text-rose-600" : "text-emerald-600"}`}
									>
										{selectedStats.plannedCostPerSqm > 0
											? (
													(selectedStats.actualCostPerSqm /
														selectedStats.plannedCostPerSqm -
														1) *
													100
												).toFixed(1)
											: "0"}
										%
									</span>
								</div>
							</div>
						</div>

						{/* Budget */}
						<div className="space-y-3">
							<h4 className="font-medium text-sm text-muted-foreground">
								Бюджет
							</h4>
							<div className="space-y-2">
								<div className="flex justify-between items-center">
									<span className="text-sm">План:</span>
									<span className="font-medium">
										{fmt(selectedStats.totalBudget)} сом
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm">Потрачено:</span>
									<span className="font-medium">
										{fmt(selectedStats.spentAmount)} сом
									</span>
								</div>
								<Progress
									value={selectedStats.budgetProgress}
									className="h-2"
								/>
								<div className="flex justify-between text-xs text-muted-foreground">
									<span>
										Исполнение: {Math.round(selectedStats.budgetProgress)}%
									</span>
									{selectedStats.budgetProgress > 100 && (
										<span className="text-rose-600">Превышение!</span>
									)}
								</div>
							</div>
						</div>

						{/* Sales */}
						<div className="space-y-3">
							<h4 className="font-medium text-sm text-muted-foreground">
								Продажи
							</h4>
							<div className="space-y-2">
								<div className="flex justify-between items-center">
									<span className="text-sm">Продано:</span>
									<span className="font-medium">
										{selectedStats.soldUnits} / {selectedStats.totalUnits}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm">Выручка:</span>
									<span className="font-medium">
										{fmt(selectedStats.totalRevenue)} сом
									</span>
								</div>
								<Progress value={selectedStats.salesProgress} className="h-2" />
								<div className="flex justify-between text-xs text-muted-foreground">
									<span>
										Заполнение: {Math.round(selectedStats.salesProgress)}%
									</span>
									<span className="text-emerald-600">
										ROI: {selectedStats.roi.toFixed(1)}%
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Profitability */}
					<div className="mt-6 p-4 bg-muted rounded-lg">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">
									Прибыльность проекта
								</p>
								<p
									className={`text-3xl font-bold ${selectedStats.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
								>
									{fmt(selectedStats.profit)} сом
								</p>
								<p className="text-sm text-muted-foreground mt-1">
									Маржа: {selectedStats.profitMargin.toFixed(1)}% · ROI:{" "}
									{selectedStats.roi.toFixed(1)}%
								</p>
							</div>
							<Link href={`/construction/projects`}>
								<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
									Подробнее <ArrowRight className="h-4 w-4" />
								</button>
							</Link>
						</div>
					</div>
				</Card>
			)}

			{/* Quick Actions */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Link href="/construction/projects">
					<Card className="p-4 hover:bg-muted cursor-pointer transition-colors">
						<div className="flex items-center gap-3">
							<Building2 className="h-8 w-8 text-blue-500" />
							<div>
								<p className="font-medium">Проекты</p>
								<p className="text-sm text-muted-foreground">
									Управление проектами
								</p>
							</div>
							<ArrowRight className="h-5 w-5 ml-auto text-muted-foreground" />
						</div>
					</Card>
				</Link>

				<Link href="/construction/chess">
					<Card className="p-4 hover:bg-muted cursor-pointer transition-colors">
						<div className="flex items-center gap-3">
							<Package className="h-8 w-8 text-blue-500" />
							<div>
								<p className="font-medium">Шахматка</p>
								<p className="text-sm text-muted-foreground">Юниты и продажи</p>
							</div>
							<ArrowRight className="h-5 w-5 ml-auto text-muted-foreground" />
						</div>
					</Card>
				</Link>

				<Link href="/construction/analytics/pnl">
					<Card className="p-4 hover:bg-muted cursor-pointer transition-colors">
						<div className="flex items-center gap-3">
							<BarChart2 className="h-8 w-8 text-emerald-600" />
							<div>
								<p className="font-medium">Аналитика</p>
								<p className="text-sm text-muted-foreground">Отчеты и P&L</p>
							</div>
							<ArrowRight className="h-5 w-5 ml-auto text-muted-foreground" />
						</div>
					</Card>
				</Link>
			</div>
		</div>
	);
}
