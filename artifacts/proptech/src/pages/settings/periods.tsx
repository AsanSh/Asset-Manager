import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Building2,
	CalendarDays,
	Globe,
	HardHat,
	LayoutGrid,
	Lock,
	Pencil,
	Plus,
	Trash2,
	Unlock,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Period {
	id: number;
	companyId: number;
	name: string;
	module: string;
	startDate: string;
	endDate: string;
	status: string;
	notes: string | null;
}

const MODULE_LABELS: Record<string, string> = {
	rental: "Аренда",
	construction: "Строительство",
	proptech: "ПропТех",
	all: "Все модули",
};
const MODULE_ICONS: Record<string, React.ElementType> = {
	rental: Building2,
	construction: HardHat,
	proptech: LayoutGrid,
	all: Globe,
};

const STATUS_CONFIG: Record<
	string,
	{ label: string; color: string; bg: string; border: string }
> = {
	open: {
		label: "Открыт",
		color: "text-emerald-700",
		bg: "bg-emerald-100",
		border: "border-emerald-200",
	},
	closed: {
		label: "Закрыт",
		color: "text-gray-600",
		bg: "bg-gray-100",
		border: "border-gray-200",
	},
	draft: {
		label: "Черновик",
		color: "text-amber-700",
		bg: "bg-amber-100",
		border: "border-amber-200",
	},
};

const MONTH_NAMES_RU = [
	"Январь",
	"Февраль",
	"Март",
	"Апрель",
	"Май",
	"Июнь",
	"Июль",
	"Август",
	"Сентябрь",
	"Октябрь",
	"Ноябрь",
	"Декабрь",
];

function fmt(dateStr: string) {
	const d = new Date(dateStr);
	return `${d.getDate()} ${MONTH_NAMES_RU[d.getMonth()]} ${d.getFullYear()}`;
}

function PeriodForm({
	period,
	onClose,
	onSaved,
}: {
	period?: Period | null;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const now = new Date();
	const [form, setForm] = useState({
		name:
			period?.name ?? `${MONTH_NAMES_RU[now.getMonth()]} ${now.getFullYear()}`,
		module: period?.module ?? "rental",
		startDate:
			period?.startDate ??
			`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
		endDate:
			period?.endDate ??
			`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`,
		status: period?.status ?? "open",
		notes: period?.notes ?? "",
	});
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		if (!form.name.trim() || !form.startDate || !form.endDate) {
			toast({ title: "Заполните обязательные поля", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			if (period) {
				await api.patch(`/admin/periods/${period.id}`, form);
				toast({ title: "Период обновлён" });
			} else {
				await api.post("/admin/periods", form);
				toast({ title: "Период создан" });
			}
			onSaved();
			onClose();
		} catch {
			toast({ title: "Ошибка сохранения", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	}

	return (
		<form onSubmit={handleSave} className="space-y-4 pt-1">
			<div>
				<Label className="text-xs text-gray-600 mb-1.5 block">
					Название периода *
				</Label>
				<Input
					value={form.name}
					onChange={(e) => set("name", e.target.value)}
					placeholder="Январь 2025"
					className="h-9"
				/>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div>
					<Label className="text-xs text-gray-600 mb-1.5 block">
						Дата начала *
					</Label>
					<Input
						type="date"
						value={form.startDate}
						onChange={(e) => set("startDate", e.target.value)}
						className="h-9"
					/>
				</div>
				<div>
					<Label className="text-xs text-gray-600 mb-1.5 block">
						Дата окончания *
					</Label>
					<Input
						type="date"
						value={form.endDate}
						onChange={(e) => set("endDate", e.target.value)}
						className="h-9"
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div>
					<Label className="text-xs text-gray-600 mb-1.5 block">Модуль</Label>
					<Select value={form.module} onValueChange={(v) => set("module", v)}>
						<SelectTrigger className="h-9">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(MODULE_LABELS).map(([k, v]) => (
								<SelectItem key={k} value={k}>
									{v}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div>
					<Label className="text-xs text-gray-600 mb-1.5 block">Статус</Label>
					<Select value={form.status} onValueChange={(v) => set("status", v)}>
						<SelectTrigger className="h-9">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="draft">Черновик</SelectItem>
							<SelectItem value="open">Открыт</SelectItem>
							<SelectItem value="closed">Закрыт</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
			<div>
				<Label className="text-xs text-gray-600 mb-1.5 block">Заметки</Label>
				<Input
					value={form.notes}
					onChange={(e) => set("notes", e.target.value)}
					placeholder="Необязательный комментарий"
					className="h-9"
				/>
			</div>
			<div className="flex justify-end gap-2 pt-2 border-t">
				<Button type="button" variant="outline" size="sm" onClick={onClose}>
					Отмена
				</Button>
				<Button
					type="submit"
					size="sm"
					disabled={loading}
					className="bg-emerald-600 hover:bg-emerald-700"
				>
					{loading ? "Сохранение..." : period ? "Обновить" : "Создать"}
				</Button>
			</div>
		</form>
	);
}

function generateMonthlyPeriods(year: number) {
	return MONTH_NAMES_RU.map((name, i) => {
		const lastDay = new Date(year, i + 1, 0).getDate();
		return {
			name: `${name} ${year}`,
			module: "rental",
			startDate: `${year}-${String(i + 1).padStart(2, "0")}-01`,
			endDate: `${year}-${String(i + 1).padStart(2, "0")}-${lastDay}`,
			status: "open",
			notes: "",
		};
	});
}

export default function SettingsPeriods() {
	const { toast } = useToast();
	const qc = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<Period | null>(null);
	const [filterModule, setFilterModule] = useState("all");
	const [filterStatus, setFilterStatus] = useState("all");
	const [genYear, setGenYear] = useState(String(new Date().getFullYear()));
	const [genLoading, setGenLoading] = useState(false);

	const { data: periods = [], isLoading } = useQuery<Period[]>({
		queryKey: ["accounting-periods"],
		queryFn: () => api.get("/admin/periods").then((r) => r.data),
	});

	function refetch() {
		qc.invalidateQueries({ queryKey: ["accounting-periods"] });
	}

	async function toggleStatus(p: Period) {
		const next = p.status === "open" ? "closed" : "open";
		try {
			await api.patch(`/admin/periods/${p.id}`, { ...p, status: next });
			toast({ title: next === "closed" ? "Период закрыт" : "Период открыт" });
			refetch();
		} catch {
			toast({ title: "Ошибка", variant: "destructive" });
		}
	}

	async function handleDelete(p: Period) {
		if (!confirm(`Удалить период "${p.name}"?`)) return;
		try {
			await api.delete(`/admin/periods/${p.id}`);
			toast({ title: "Период удалён" });
			refetch();
		} catch {
			toast({ title: "Ошибка удаления", variant: "destructive" });
		}
	}

	async function generateYear() {
		setGenLoading(true);
		try {
			const list = generateMonthlyPeriods(parseInt(genYear, 10));
			await Promise.all(list.map((p) => api.post("/admin/periods", p)));
			toast({ title: `Создано 12 периодов за ${genYear} год` });
			refetch();
		} catch {
			toast({ title: "Ошибка генерации", variant: "destructive" });
		} finally {
			setGenLoading(false);
		}
	}

	const filtered = periods.filter((p) => {
		if (filterModule !== "all" && p.module !== filterModule) return false;
		if (filterStatus !== "all" && p.status !== filterStatus) return false;
		return true;
	});

	const openCount = periods.filter((p) => p.status === "open").length;
	const closedCount = periods.filter((p) => p.status === "closed").length;
	const draftCount = periods.filter((p) => p.status === "draft").length;

	return (
		<div className="p-6 max-w-5xl mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-xl font-bold text-gray-900">Периоды учёта</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Управление расчётными периодами для начислений, расходов и отчётов
					</p>
				</div>
				<Button
					onClick={() => {
						setEditing(null);
						setDialogOpen(true);
					}}
					size="sm"
					className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
				>
					<Plus className="w-4 h-4" /> Добавить период
				</Button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-3 gap-3 mb-5">
				{[
					{
						label: "Открытые",
						count: openCount,
						color: "text-emerald-700",
						bg: "bg-emerald-100",
						border: "border-emerald-200",
					},
					{
						label: "Закрытые",
						count: closedCount,
						color: "text-gray-600",
						bg: "bg-gray-50",
						border: "border-gray-200",
					},
					{
						label: "Черновики",
						count: draftCount,
						color: "text-amber-700",
						bg: "bg-amber-100",
						border: "border-amber-200",
					},
				].map((s) => (
					<div
						key={s.label}
						className={`rounded-xl border p-4 flex items-center gap-3 ${s.bg} ${s.border}`}
					>
						<CalendarDays className={`w-5 h-5 ${s.color}`} />
						<div>
							<div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
							<div className="text-xs text-gray-500">{s.label}</div>
						</div>
					</div>
				))}
			</div>

			{/* Generate year */}
			<div className="flex items-center gap-3 mb-5 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
				<CalendarDays className="w-4 h-4 text-indigo-600 flex-shrink-0" />
				<span className="text-sm text-indigo-700 font-medium">
					Генерация периодов на год:
				</span>
				<Input
					type="number"
					value={genYear}
					onChange={(e) => setGenYear(e.target.value)}
					className="w-24 h-8 text-sm bg-white"
					min="2020"
					max="2030"
				/>
				<Button
					size="sm"
					variant="outline"
					onClick={generateYear}
					disabled={genLoading}
					className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-100"
				>
					{genLoading ? "Создаём..." : "Создать 12 месяцев"}
				</Button>
			</div>

			{/* Filters */}
			<div className="flex gap-3 mb-5">
				<div className="flex bg-gray-100 rounded-lg p-1 gap-1">
					{[
						["all", "Все"],
						["open", "Открытые"],
						["closed", "Закрытые"],
						["draft", "Черновики"],
					].map(([v, l]) => (
						<button
							key={v}
							onClick={() => setFilterStatus(v)}
							className={cn(
								"px-3 py-1 text-xs font-medium rounded-md transition-colors",
								filterStatus === v
									? "bg-white shadow-sm text-gray-900"
									: "text-gray-500 hover:text-gray-700",
							)}
						>
							{l}
						</button>
					))}
				</div>
				<div className="flex bg-gray-100 rounded-lg p-1 gap-1">
					{[["all", "Все модули"], ...Object.entries(MODULE_LABELS)].map(
						([v, l]) => {
							const Icon = MODULE_ICONS[v];
							return (
								<button
									key={v}
									onClick={() => setFilterModule(v)}
									className={cn(
										"px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
										filterModule === v
											? "bg-white shadow-sm text-gray-900"
											: "text-gray-500 hover:text-gray-700",
									)}
								>
									{Icon && <Icon className="w-3 h-3" />} {l}
								</button>
							);
						},
					)}
				</div>
			</div>

			{/* List */}
			{isLoading ? (
				<div className="text-center py-16 text-gray-400 text-sm">
					Загрузка...
				</div>
			) : filtered.length === 0 ? (
				<div className="text-center py-16 text-gray-400">
					<CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
					<p className="text-sm font-medium">Нет периодов</p>
					<p className="text-xs mt-1">
						Создайте первый период или сгенерируйте на год
					</p>
				</div>
			) : (
				<div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-100 bg-gray-50">
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
									Период
								</th>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
									Модуль
								</th>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
									Дата начала
								</th>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
									Дата окончания
								</th>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
									Статус
								</th>
								<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
									Действия
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{filtered.map((p) => {
								const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.open;
								const ModIcon = MODULE_ICONS[p.module] || Globe;
								return (
									<tr
										key={p.id}
										className="hover:bg-gray-50/60 transition-colors group"
									>
										<td className="px-4 py-3">
											<div className="flex items-center gap-2">
												<CalendarDays className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
												<span className="font-medium text-gray-800">
													{p.name}
												</span>
											</div>
											{p.notes && (
												<p className="text-xs text-gray-400 mt-0.5 ml-5">
													{p.notes}
												</p>
											)}
										</td>
										<td className="px-4 py-3">
											<span className="flex items-center gap-1.5 text-xs text-gray-600">
												<ModIcon className="w-3.5 h-3.5 text-gray-400" />
												{MODULE_LABELS[p.module] || p.module}
											</span>
										</td>
										<td className="px-4 py-3 text-gray-600 text-xs">
											{fmt(p.startDate)}
										</td>
										<td className="px-4 py-3 text-gray-600 text-xs">
											{fmt(p.endDate)}
										</td>
										<td className="px-4 py-3">
											<Badge
												className={cn(
													"text-[11px] font-medium border",
													sc.color,
													sc.bg,
													sc.border,
												)}
											>
												{sc.label}
											</Badge>
										</td>
										<td className="px-4 py-3">
											<div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
												<button
													onClick={() => toggleStatus(p)}
													className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
													title={
														p.status === "open"
															? "Закрыть период"
															: "Открыть период"
													}
												>
													{p.status === "open" ? (
														<Lock className="w-3.5 h-3.5 text-gray-500" />
													) : (
														<Unlock className="w-3.5 h-3.5 text-emerald-600" />
													)}
												</button>
												<button
													onClick={() => {
														setEditing(p);
														setDialogOpen(true);
													}}
													className="p-1.5 rounded-md hover:bg-gray-100"
												>
													<Pencil className="w-3.5 h-3.5 text-gray-500" />
												</button>
												<button
													onClick={() => handleDelete(p)}
													className="p-1.5 rounded-md hover:bg-rose-50"
												>
													<Trash2 className="w-3.5 h-3.5 text-rose-600" />
												</button>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<CalendarDays className="w-4 h-4 text-blue-600" />
							{editing ? "Редактировать период" : "Новый период"}
						</DialogTitle>
					</DialogHeader>
					<PeriodForm
						period={editing}
						onClose={() => {
							setDialogOpen(false);
							setEditing(null);
						}}
						onSaved={refetch}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}
