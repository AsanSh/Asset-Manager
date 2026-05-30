import { useQuery } from "@tanstack/react-query";
import {
	Building2,
	CreditCard,
	FileText,
	Receipt,
	RefreshCw,
	User,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemSettingsBar } from "@/components/system-settings-nav";

interface ActivityLog {
	id: number;
	type: string;
	description: string;
	entityType: string | null;
	entityId: number | null;
	userId: number | null;
	createdAt: string;
}

async function fetchActivity(entityType?: string): Promise<ActivityLog[]> {
	const params = new URLSearchParams();
	if (entityType && entityType !== "all") params.set("entityType", entityType);
	params.set("limit", "200");
	const res = await fetch(`/api/activity?${params}`, {
		credentials: "include",
	});
	if (!res.ok) throw new Error("Ошибка загрузки лога");
	return res.json();
}

const typeIcons: Record<string, React.ElementType> = {
	contract: FileText,
	payment: CreditCard,
	accrual: Receipt,
	property: Building2,
	counterparty: User,
	tenant: User,
	default: FileText,
};

const typeColors: Record<string, string> = {
	contract: "bg-blue-50 text-blue-600",
	payment: "bg-emerald-50 text-emerald-600",
	accrual: "bg-amber-50 text-amber-600",
	property: "bg-blue-50 text-blue-600",
	counterparty: "bg-amber-50 text-amber-600",
	tenant: "bg-indigo-50 text-indigo-600",
	default: "bg-gray-100 text-gray-500",
};

const entityTypeLabels: Record<string, string> = {
	contract: "Договоры",
	payment: "Платежи",
	accrual: "Начисления",
	property: "Объекты",
	counterparty: "Контрагенты",
	tenant: "Арендаторы",
};

function groupByDate(items: ActivityLog[]) {
	const groups: Record<string, ActivityLog[]> = {};
	items.forEach((item) => {
		const d = new Date(item.createdAt).toLocaleDateString("ru-KG", {
			day: "2-digit",
			month: "long",
			year: "numeric",
		});
		if (!groups[d]) groups[d] = [];
		groups[d].push(item);
	});
	return groups;
}

export default function ActivityLogPage() {
	const [entityTypeFilter, setEntityTypeFilter] = useState("all");
	const [search, setSearch] = useState("");

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["activity", entityTypeFilter],
		queryFn: () => fetchActivity(entityTypeFilter),
	});

	const dataArray = Array.isArray(data) ? data : [];
	const filtered = dataArray.filter(
		(item) =>
			!search || item.description.toLowerCase().includes(search.toLowerCase()),
	);

	const grouped = groupByDate(filtered);

	return (
		<div className="space-y-5">
			<SystemSettingsBar />
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Лог активности</h1>
					<p className="text-sm text-gray-500 mt-1">
						История всех операций в системе
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={() => refetch()}>
					<RefreshCw className="w-4 h-4 mr-1.5" />
					Обновить
				</Button>
			</div>

			{/* Filters */}
			<div className="flex gap-3">
				<div className="relative flex-1 max-w-xs">
					<Input
						placeholder="Поиск по описанию..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-4"
					/>
				</div>
				<Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
					<SelectTrigger className="w-48">
						<SelectValue placeholder="Все типы" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все операции</SelectItem>
						{Object.entries(entityTypeLabels).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Activity Feed */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
				{isLoading ? (
					<div className="p-6 space-y-5">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="flex gap-4 items-start">
								<Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-3 w-1/3" />
								</div>
							</div>
						))}
					</div>
				) : Object.keys(grouped).length === 0 ? (
					<div className="py-16 text-center text-gray-400 text-sm">
						{dataArray.length === 0
							? "Активность ещё не зафиксирована. Операции будут появляться здесь по мере работы с системой."
							: "Нет записей, соответствующих фильтру"}
					</div>
				) : (
					<div className="divide-y divide-gray-50">
						{Object.entries(grouped).map(([date, items]) => (
							<div key={date}>
								<div className="px-6 py-2 bg-gray-50/60">
									<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
										{date}
									</p>
								</div>
								{items.map((item) => {
									const Icon =
										typeIcons[item.entityType || ""] || typeIcons.default;
									const colorClass =
										typeColors[item.entityType || ""] || typeColors.default;
									return (
										<div
											key={item.id}
											className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50/40 transition-colors"
										>
											<div
												className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}
											>
												<Icon className="w-4 h-4" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm text-gray-800">
													{item.description}
												</p>
												<div className="flex items-center gap-3 mt-0.5">
													<p className="text-xs text-gray-400">
														{new Date(item.createdAt).toLocaleTimeString(
															"ru-KG",
															{
																hour: "2-digit",
																minute: "2-digit",
															},
														)}
													</p>
													{item.entityType && (
														<span className="text-xs text-gray-400">
															{entityTypeLabels[item.entityType] ||
																item.entityType}
															{item.entityId ? ` #${item.entityId}` : ""}
														</span>
													)}
												</div>
											</div>
											<span className="text-xs text-gray-400 flex-shrink-0 pt-0.5">
												#{item.id}
											</span>
										</div>
									);
								})}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
