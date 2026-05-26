import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDistributionsQueryKey } from "@/lib/rental-query-keys";
import { BarChart2, CheckCircle2, Play, Plus, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { authFetch } from "@/lib/auth-fetch";
import { getApiErrorMessage } from "@/lib/api-error";
import { RentalQueryState } from "@/components/rental/rental-query-state";

function fmtCurrency(v: number | string) {
	const n = typeof v === "string" ? parseFloat(v) : v;
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: "KGS",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(n || 0);
}

const statusColors: Record<string, string> = {
	pending: "bg-amber-100 text-amber-800",
	calculated: "bg-blue-100 text-blue-800",
	paid: "bg-emerald-100 text-emerald-800",
};
const statusLabels: Record<string, string> = {
	pending: "Ожидает",
	calculated: "Рассчитано",
	paid: "Выплачено",
};

interface Distribution {
	id: number;
	propertyId: number;
	period: string;
	grossIncome: string;
	expenses: string;
	netProfit: string;
	currency: string;
	status: string;
	notes?: string;
	createdAt: string;
	propertyName?: string;
	propertyUnit?: string;
}
interface Property {
	id: number;
	projectName: string;
	unitNumber: string;
}

function AddDialog({
	onClose,
	onSaved,
}: {
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const [form, setForm] = useState({
		propertyId: "",
		period: "",
		grossIncome: "",
		expenses: "",
		notes: "",
	});
	const [loading, setLoading] = useState(false);
	const { data: properties = [] } = useQuery<Property[]>({
		queryKey: ["properties"],
		queryFn: () => api.get("/properties").then((r) => r.data),
	});
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
	const gross = parseFloat(form.grossIncome || "0");
	const exp = parseFloat(form.expenses || "0");
	const net = gross - exp;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.propertyId || !form.period) {
			toast({ title: "Заполните обязательные поля", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			await authFetch("/rental/distributions", {
				method: "POST",
				body: JSON.stringify({
					...form,
					propertyId: parseInt(form.propertyId, 10),
				}),
			});
			toast({ title: "Распределение добавлено" });
			onSaved();
			onClose();
		} catch (e: unknown) {
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e),
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Добавить распределение прибыли</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div>
						<Label>Объект *</Label>
						<Select
							value={form.propertyId}
							onValueChange={(v) => set("propertyId", v)}
						>
							<SelectTrigger className="mt-1">
								<SelectValue placeholder="Выберите объект" />
							</SelectTrigger>
							<SelectContent>
								{properties.map((p) => (
									<SelectItem key={p.id} value={String(p.id)}>
										{p.projectName} — {p.unitNumber}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>Период *</Label>
						<Input
							className="mt-1"
							value={form.period}
							onChange={(e) => set("period", e.target.value)}
							placeholder="2024 Q1 / Янв 2024–Мар 2024"
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Валовый доход (KGS)</Label>
							<Input
								className="mt-1"
								type="number"
								min="0"
								value={form.grossIncome}
								onChange={(e) => set("grossIncome", e.target.value)}
							/>
						</div>
						<div>
							<Label>Расходы (KGS)</Label>
							<Input
								className="mt-1"
								type="number"
								min="0"
								value={form.expenses}
								onChange={(e) => set("expenses", e.target.value)}
							/>
						</div>
					</div>
					{(gross > 0 || exp > 0) && (
						<div
							className={`p-3 rounded-lg text-sm font-medium ${net >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
						>
							Чистая прибыль: {fmtCurrency(net)}
						</div>
					)}
					<div>
						<Label>Заметки</Label>
						<Input
							className="mt-1"
							value={form.notes}
							onChange={(e) => set("notes", e.target.value)}
						/>
					</div>
					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={loading}
						>
							Отмена
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Сохранение..." : "Добавить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function Distributions() {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [showAdd, setShowAdd] = useState(false);

	const { data: distributions = [], isLoading, isError, error, refetch } = useQuery<Distribution[]>({
		queryKey: getDistributionsQueryKey(),
		queryFn: () => api.get("/rental/distributions").then((r) => r.data),
	});

	const totalNet = distributions.reduce(
		(s, d) => s + parseFloat(d.netProfit || "0"),
		0,
	);
	const pendingNet = distributions
		.filter((d) => d.status !== "paid")
		.reduce((s, d) => s + parseFloat(d.netProfit || "0"), 0);

	const updateStatus = async (id: number, status: string) => {
		try {
			await authFetch(`/rental/distributions/${id}/status`, {
				method: "PATCH",
				body: JSON.stringify({ status }),
			});
			toast({
				title: status === "paid" ? "Отмечено как выплачено" : "Статус обновлён",
			});
			queryClient.invalidateQueries({ queryKey: getDistributionsQueryKey() });
		} catch (e: unknown) {
			toast({ title: "Ошибка", description: getApiErrorMessage(e), variant: "destructive" });
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm("Удалить запись?")) return;
		try {
			await authFetch(`/rental/distributions/${id}`, { method: "DELETE" });
			toast({ title: "Удалено" });
			queryClient.invalidateQueries({ queryKey: getDistributionsQueryKey() });
		} catch (e: unknown) {
			toast({ title: "Ошибка", description: getApiErrorMessage(e), variant: "destructive" });
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Распределение прибыли
					</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Доходы, расходы и выплаты владельцам по объектам
					</p>
				</div>
				<Button onClick={() => setShowAdd(true)} className="gap-2">
					<Plus className="w-4 h-4" /> Объявить прибыль
				</Button>
			</div>

			<div className="grid grid-cols-3 gap-4">
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Всего периодов</p>
					<p className="text-2xl font-bold text-blue-600">
						{distributions.length}
					</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Суммарная прибыль</p>
					<p className="text-lg font-bold text-emerald-600">
						{fmtCurrency(totalNet)}
					</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Ожидает выплаты</p>
					<p className="text-lg font-bold text-amber-600">
						{fmtCurrency(pendingNet)}
					</p>
				</div>
			</div>

			<RentalQueryState isLoading={isLoading} isError={isError} error={error} onRetry={() => refetch()}>
			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							<TableHead>Объект</TableHead>
							<TableHead>Период</TableHead>
							<TableHead className="text-right">Валовый доход</TableHead>
							<TableHead className="text-right">Расходы</TableHead>
							<TableHead className="text-right">Чистая прибыль</TableHead>
							<TableHead>Статус</TableHead>
							<TableHead className="text-center">Действия</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 4 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 7 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : distributions.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={7}
									className="text-center py-12 text-gray-400"
								>
									<BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
									<p>Записей о прибыли пока нет</p>
								</TableCell>
							</TableRow>
						) : (
							distributions.map((d) => {
								const net = parseFloat(d.netProfit);
								return (
									<TableRow key={d.id} className="hover:bg-gray-50">
										<TableCell>
											<p className="font-medium text-sm text-gray-900">
												{d.propertyName || "—"}
											</p>
											{d.propertyUnit && (
												<p className="text-xs text-gray-400">
													ед. {d.propertyUnit}
												</p>
											)}
										</TableCell>
										<TableCell className="text-sm font-medium text-gray-700">
											{d.period}
										</TableCell>
										<TableCell className="text-right text-sm text-gray-600">
											{fmtCurrency(d.grossIncome)}
										</TableCell>
										<TableCell className="text-right text-sm text-rose-600">
											{fmtCurrency(d.expenses)}
										</TableCell>
										<TableCell
											className={`text-right font-semibold text-sm ${net >= 0 ? "text-emerald-600" : "text-rose-600"}`}
										>
											{fmtCurrency(net)}
										</TableCell>
										<TableCell>
											<Badge
												className={statusColors[d.status] || ""}
												variant="secondary"
											>
												{statusLabels[d.status] || d.status}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex gap-1 justify-center">
												{d.status === "pending" && (
													<Button
														size="sm"
														variant="outline"
														className="h-7 px-2 text-xs border-blue-300 text-blue-700"
														onClick={() => updateStatus(d.id, "calculated")}
													>
														<Play className="w-3 h-3 mr-1" /> Рассчитать
													</Button>
												)}
												{d.status === "calculated" && (
													<Button
														size="sm"
														variant="outline"
														className="h-7 px-2 text-xs border-green-300 text-emerald-700"
														onClick={() => updateStatus(d.id, "paid")}
													>
														<CheckCircle2 className="w-3 h-3 mr-1" /> Выплачено
													</Button>
												)}
												<Button
													size="sm"
													variant="ghost"
													className="h-7 w-7 p-0"
													onClick={() => handleDelete(d.id)}
												>
													<Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-rose-600" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</div>
			</RentalQueryState>

			{showAdd && (
				<AddDialog
					onClose={() => setShowAdd(false)}
					onSaved={() =>
						queryClient.invalidateQueries({ queryKey: getDistributionsQueryKey() })
					}
				/>
			)}
		</div>
	);
}
