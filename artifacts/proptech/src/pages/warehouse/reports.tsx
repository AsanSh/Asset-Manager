import {
	BarChart,
	Calendar,
	Download,
	FileText,
	Package,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export default function WarehouseReports() {
	const [reportType, setReportType] = useState("movements");
	const [period, setPeriod] = useState("month");

	const reportTypes = [
		{ value: "movements", label: "Движение товаров", icon: TrendingUp },
		{ value: "inventory", label: "Остатки на складе", icon: Package },
		{ value: "turnover", label: "Оборачиваемость", icon: BarChart },
		{ value: "suppliers", label: "Закупки у поставщиков", icon: FileText },
	];

	const periods = [
		{ value: "week", label: "За неделю" },
		{ value: "month", label: "За месяц" },
		{ value: "quarter", label: "За квартал" },
		{ value: "year", label: "За год" },
		{ value: "custom", label: "Произвольный период" },
	];

	// Mock data for movements report
	const movements = [
		{
			date: "2026-05-01",
			item: "Цемент М500",
			incoming: 50,
			outgoing: 35,
			balance: 115,
		},
		{
			date: "2026-05-02",
			item: "Арматура 12мм",
			incoming: 200,
			outgoing: 150,
			balance: 230,
		},
		{
			date: "2026-05-03",
			item: "Кирпич красный",
			incoming: 5000,
			outgoing: 3500,
			balance: 4800,
		},
		{
			date: "2026-05-04",
			item: "Песок речной",
			incoming: 80,
			outgoing: 60,
			balance: 140,
		},
		{
			date: "2026-05-05",
			item: "Щебень фр. 20-40",
			incoming: 100,
			outgoing: 75,
			balance: 185,
		},
	];

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Отчёты по складу</h1>
					<p className="text-gray-500 mt-1">
						Аналитические отчёты и статистика
					</p>
				</div>
				<Button className="gap-2">
					<Download className="w-4 h-4" />
					Экспорт в Excel
				</Button>
			</div>

			{/* Filters */}
			<Card>
				<CardContent className="pt-6">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="space-y-2">
							<label className="text-sm font-medium text-gray-700">
								Тип отчёта
							</label>
							<Select value={reportType} onValueChange={setReportType}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{reportTypes.map((type) => (
										<SelectItem key={type.value} value={type.value}>
											<div className="flex items-center gap-2">
												<type.icon className="w-4 h-4" />
												{type.label}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium text-gray-700">
								Период
							</label>
							<Select value={period} onValueChange={setPeriod}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{periods.map((p) => (
										<SelectItem key={p.value} value={p.value}>
											{p.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex items-end">
							<Button className="w-full gap-2">
								<Calendar className="w-4 h-4" />
								Сформировать отчёт
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Report Content */}
			<Card>
				<CardHeader>
					<CardTitle>Движение товаров за май 2026</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-gray-200">
									<th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
										Дата
									</th>
									<th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
										Товар
									</th>
									<th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
										Поступило
									</th>
									<th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
										Списано
									</th>
									<th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
										Остаток
									</th>
								</tr>
							</thead>
							<tbody>
								{movements.map((mov, idx) => (
									<tr
										key={idx}
										className="border-b border-gray-100 hover:bg-gray-50"
									>
										<td className="py-3 px-4 text-sm text-gray-600">
											{new Date(mov.date).toLocaleDateString("ru-RU")}
										</td>
										<td className="py-3 px-4 text-sm font-medium text-gray-900">
											{mov.item}
										</td>
										<td className="py-3 px-4 text-sm text-right text-emerald-600 font-medium">
											+{mov.incoming}
										</td>
										<td className="py-3 px-4 text-sm text-right text-rose-600 font-medium">
											-{mov.outgoing}
										</td>
										<td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
											{mov.balance}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			{/* Quick Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-gray-600">
							Всего поступило
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-emerald-600">5,430 ед.</div>
						<p className="text-xs text-gray-500 mt-1">За выбранный период</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-gray-600">
							Всего списано
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-rose-600">3,820 ед.</div>
						<p className="text-xs text-gray-500 mt-1">За выбранный период</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-gray-600">
							Чистое изменение
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-blue-600">+1,610 ед.</div>
						<p className="text-xs text-gray-500 mt-1">Увеличение запасов</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
