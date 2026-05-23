import { useQuery } from "@tanstack/react-query";
import { Building2, Grid3X3, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

interface Property {
	id: number;
	unitNumber: string;
	floor?: number | null;
	block?: string | null;
	projectName?: string | null;
	type: string;
	area: string;
	status: string;
	baseRent?: string | null;
	currency?: string | null;
}

const STATUS_CONFIG: Record<
	string,
	{ label: string; bg: string; text: string; border: string }
> = {
	available: {
		label: "Свободна",
		bg: "bg-emerald-50",
		text: "text-emerald-700",
		border: "border-green-300",
	},
	occupied: {
		label: "Занята",
		bg: "bg-blue-50",
		text: "text-blue-700",
		border: "border-blue-300",
	},
	reserved: {
		label: "Брон.",
		bg: "bg-amber-50",
		text: "text-amber-700",
		border: "border-amber-300",
	},
	maintenance: {
		label: "Ремонт",
		bg: "bg-amber-50",
		text: "text-amber-700",
		border: "border-orange-300",
	},
	inactive: {
		label: "Неактив.",
		bg: "bg-gray-50",
		text: "text-gray-400",
		border: "border-gray-200",
	},
};

const TYPE_LABELS: Record<string, string> = {
	apartment: "Квартира",
	office: "Офис",
	retail: "Торговля",
	warehouse: "Склад",
	parking: "Парковка",
	other: "Другое",
};

export default function ChessBoard() {
	const [statusFilter, setStatusFilter] = useState<string | null>(null);
	const [typeFilter, _setTypeFilter] = useState<string | null>(null);
	const [selected, setSelected] = useState<Property | null>(null);

	const {
		data: properties = [],
		isLoading,
		refetch,
	} = useQuery<Property[]>({
		queryKey: ["properties", "all"],
		queryFn: () => api.get("/properties").then((r) => r.data),
	});

	const filtered = properties.filter((p) => {
		if (statusFilter && p.status !== statusFilter) return false;
		if (typeFilter && p.type !== typeFilter) return false;
		return true;
	});

	// Группируем: проект → блок → этаж → объекты
	const grouped: Record<
		string,
		Record<string, Record<number, Property[]>>
	> = {};
	for (const p of filtered) {
		const project = p.projectName || "Без проекта";
		const block = p.block || "—";
		const floor = p.floor ?? 0;
		if (!grouped[project]) grouped[project] = {};
		if (!grouped[project][block]) grouped[project][block] = {};
		if (!grouped[project][block][floor]) grouped[project][block][floor] = [];
		grouped[project][block][floor].push(p);
	}

	const statusCounts = properties.reduce(
		(acc, p) => {
			acc[p.status] = (acc[p.status] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	return (
		<div className="space-y-5">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<Grid3X3 className="w-6 h-6 text-blue-600" /> Шахматка объектов
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Визуальная карта доступности по этажам и блокам
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={() => refetch()}>
					<RefreshCw className="w-4 h-4 mr-2" /> Обновить
				</Button>
			</div>

			{/* Legend & Filters */}
			<div className="bg-white rounded-xl border border-gray-200 p-4">
				<div className="flex flex-wrap items-center gap-3">
					<span className="text-xs font-semibold text-gray-500 mr-1">
						Статус:
					</span>
					<button
						onClick={() => setStatusFilter(null)}
						className={cn(
							"px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
							!statusFilter
								? "bg-gray-900 text-white border-gray-900"
								: "bg-white text-gray-600 border-gray-200 hover:border-gray-400",
						)}
					>
						Все ({properties.length})
					</button>
					{Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
						<button
							key={key}
							onClick={() => setStatusFilter(statusFilter === key ? null : key)}
							className={cn(
								"px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
								statusFilter === key
									? `${cfg.bg} ${cfg.text} ${cfg.border}`
									: "bg-white text-gray-600 border-gray-200 hover:border-gray-400",
							)}
						>
							<span
								className={cn(
									"inline-block w-2 h-2 rounded-sm mr-1.5",
									cfg.bg.replace("50", "400").replace("bg-", "bg-"),
								)}
							/>
							{cfg.label} ({statusCounts[key] || 0})
						</button>
					))}
				</div>
			</div>

			{isLoading ? (
				<div className="h-64 flex items-center justify-center">
					<RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
				</div>
			) : filtered.length === 0 ? (
				<div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
					<Grid3X3 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
					<p className="text-gray-500 font-medium">Нет объектов</p>
					<p className="text-sm text-gray-400 mt-1">
						Добавьте объекты в реестре
					</p>
				</div>
			) : (
				Object.entries(grouped).map(([project, blocks]) => (
					<div
						key={project}
						className="bg-white rounded-xl border border-gray-200 overflow-hidden"
					>
						<div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
							<Building2 className="w-4 h-4 text-blue-500" />
							<h2 className="font-semibold text-gray-900">{project}</h2>
						</div>
						<div className="p-5 space-y-6">
							{Object.entries(blocks).map(([block, floors]) => {
								const sortedFloors = Object.entries(floors)
									.map(([f, units]) => ({ floor: parseInt(f, 10), units }))
									.sort((a, b) => b.floor - a.floor);

								return (
									<div key={block}>
										{block !== "—" && (
											<p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
												Блок {block}
											</p>
										)}
										<div className="space-y-2">
											{sortedFloors.map(({ floor, units }) => (
												<div key={floor} className="flex items-start gap-3">
													<div className="w-12 text-right pt-1 flex-shrink-0">
														<span className="text-xs text-gray-400 font-medium">
															{floor === 0 ? "—" : `${floor} эт.`}
														</span>
													</div>
													<div className="flex flex-wrap gap-1.5 flex-1">
														{units
															.sort((a, b) =>
																a.unitNumber.localeCompare(b.unitNumber),
															)
															.map((unit) => {
																const cfg =
																	STATUS_CONFIG[unit.status] ||
																	STATUS_CONFIG.inactive;
																return (
																	<button
																		key={unit.id}
																		onClick={() => setSelected(unit)}
																		title={`${unit.unitNumber} — ${cfg.label}`}
																		className={cn(
																			"w-16 h-10 rounded-md border text-xs font-semibold flex flex-col items-center justify-center transition-all hover:shadow-sm active:scale-95",
																			cfg.bg,
																			cfg.text,
																			cfg.border,
																		)}
																	>
																		<span className="text-[11px] font-bold leading-tight">
																			{unit.unitNumber}
																		</span>
																		<span className="text-[9px] opacity-70 leading-tight">
																			{unit.area
																				? parseFloat(unit.area).toFixed(0) +
																					"м²"
																				: ""}
																		</span>
																	</button>
																);
															})}
													</div>
												</div>
											))}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				))
			)}

			{/* Detail Dialog */}
			<Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Объект {selected?.unitNumber}</DialogTitle>
					</DialogHeader>
					{selected && (
						<div className="space-y-3 text-sm">
							<div className="flex items-center justify-between">
								<span className="text-gray-500">Статус</span>
								<Badge
									className={cn(
										"text-xs border",
										STATUS_CONFIG[selected.status]?.bg,
										STATUS_CONFIG[selected.status]?.text,
										STATUS_CONFIG[selected.status]?.border,
									)}
									variant="outline"
								>
									{STATUS_CONFIG[selected.status]?.label || selected.status}
								</Badge>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-gray-500">Тип</span>
								<span className="font-medium">
									{TYPE_LABELS[selected.type] || selected.type}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-gray-500">Площадь</span>
								<span className="font-medium">
									{selected.area
										? `${parseFloat(selected.area).toFixed(1)} м²`
										: "—"}
								</span>
							</div>
							{selected.floor !== null && selected.floor !== undefined && (
								<div className="flex items-center justify-between">
									<span className="text-gray-500">Этаж</span>
									<span className="font-medium">{selected.floor}</span>
								</div>
							)}
							{selected.block && (
								<div className="flex items-center justify-between">
									<span className="text-gray-500">Блок</span>
									<span className="font-medium">{selected.block}</span>
								</div>
							)}
							{selected.baseRent && (
								<div className="flex items-center justify-between">
									<span className="text-gray-500">Базовая аренда</span>
									<span className="font-semibold text-blue-700">
										{formatCurrency(parseFloat(selected.baseRent))}{" "}
										{selected.currency || "KGS"}
									</span>
								</div>
							)}
							<div className="pt-2">
								<Button
									className="w-full"
									size="sm"
									onClick={() => {
										setSelected(null);
										window.location.href = `/rental/properties`;
									}}
								>
									Перейти к объекту
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
