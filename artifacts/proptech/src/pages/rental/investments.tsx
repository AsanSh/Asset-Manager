import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PieChart, Plus, Trash2, } from "lucide-react";
import { useState } from "react";
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
import { getApiBase } from "@/lib/api-base";

const BASE = getApiBase();
const authHeaders = () => {
	const token = localStorage.getItem("auth_token");
	return {
		"Content-Type": "application/json",
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};
};

function fmtCurrency(v: number | string) {
	const n = typeof v === "string" ? parseFloat(v) : v;
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: "KGS",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(n || 0);
}

interface Investment {
	id: number;
	propertyId: number;
	investorId: number;
	sharePercent: string;
	capitalInvested: string;
	currency: string;
	investedAt?: string;
	notes?: string;
	createdAt: string;
	propertyName?: string;
	propertyUnit?: string;
	investorName?: string;
	investorPhone?: string;
}
interface Investor {
	id: number;
	fullName: string;
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
		investorId: "",
		sharePercent: "",
		capitalInvested: "",
		investedAt: "",
		notes: "",
	});
	const [loading, setLoading] = useState(false);

	const { data: investors = [] } = useQuery<Investor[]>({
		queryKey: ["investors"],
		queryFn: () => api.get("/rental/investors").then((r) => r.data),
	});
	const { data: properties = [] } = useQuery<Property[]>({
		queryKey: ["properties"],
		queryFn: () => api.get("/properties").then((r) => r.data),
	});

	const investorsArray = Array.isArray(investors) ? investors : [];
	const propertiesArray = Array.isArray(properties) ? properties : [];

	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.propertyId || !form.investorId || !form.sharePercent) {
			toast({ title: "Заполните обязательные поля", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const res = await fetch(`${BASE}/rental/investments`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					...form,
					propertyId: parseInt(form.propertyId, 10),
					investorId: parseInt(form.investorId, 10),
				}),
			});
			if (!res.ok) throw new Error("Ошибка сохранения");
			toast({ title: "Доля добавлена" });
			onSaved();
			onClose();
		} catch (e: any) {
			toast({
				title: "Ошибка",
				description: e.message,
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
					<DialogTitle>Добавить долю</DialogTitle>
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
								{propertiesArray.map((p) => (
									<SelectItem key={p.id} value={String(p.id)}>
										{p.projectName} — {p.unitNumber}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>Владелец *</Label>
						<Select
							value={form.investorId}
							onValueChange={(v) => set("investorId", v)}
						>
							<SelectTrigger className="mt-1">
								<SelectValue placeholder="Выберите владельца" />
							</SelectTrigger>
							<SelectContent>
								{investorsArray.map((i) => (
									<SelectItem key={i.id} value={String(i.id)}>
										{i.fullName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Доля (%) *</Label>
							<Input
								className="mt-1"
								type="number"
								min="0.01"
								max="100"
								step="0.01"
								value={form.sharePercent}
								onChange={(e) => set("sharePercent", e.target.value)}
								placeholder="25.00"
							/>
						</div>
						<div>
							<Label>Вложено (KGS)</Label>
							<Input
								className="mt-1"
								type="number"
								min="0"
								value={form.capitalInvested}
								onChange={(e) => set("capitalInvested", e.target.value)}
								placeholder="5 000 000"
							/>
						</div>
					</div>
					<div>
						<Label>Дата инвестиции</Label>
						<Input
							className="mt-1"
							type="date"
							value={form.investedAt}
							onChange={(e) => set("investedAt", e.target.value)}
						/>
					</div>
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

export default function Investments() {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [showAdd, setShowAdd] = useState(false);

	const { data: investments = [], isLoading } = useQuery<Investment[]>({
		queryKey: ["investments"],
		queryFn: () => api.get("/rental/investments").then((r) => r.data),
	});

	const investmentsArray = Array.isArray(investments) ? investments : [];
	const totalCapital = investmentsArray.reduce(
		(s, i) => s + (parseFloat(i.capitalInvested || "0") || 0),
		0,
	);

	const handleDelete = async (id: number) => {
		if (!confirm("Удалить инвестицию?")) return;
		await fetch(`${BASE}/rental/investments/${id}`, {
			method: "DELETE",
			headers: authHeaders(),
		});
		toast({ title: "Запись удалена" });
		queryClient.invalidateQueries({ queryKey: ["investments"] });
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Доли владения</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Доли владельцев в объектах недвижимости
					</p>
				</div>
				<Button onClick={() => setShowAdd(true)} className="gap-2">
					<Plus className="w-4 h-4" /> Добавить долю
				</Button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-3 gap-4">
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Всего инвестиций</p>
					<p className="text-2xl font-bold text-blue-600">
						{investmentsArray.length}
					</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Уникальных объектов</p>
					<p className="text-2xl font-bold text-indigo-600">
						{new Set(investmentsArray.map((i) => i.propertyId)).size}
					</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Общий капитал</p>
					<p className="text-xl font-bold text-emerald-600">
						{fmtCurrency(totalCapital)}
					</p>
				</div>
			</div>

			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							<TableHead>Объект</TableHead>
							<TableHead>Владелец</TableHead>
							<TableHead className="text-right">Доля</TableHead>
							<TableHead className="text-right">Вложено</TableHead>
							<TableHead>Дата</TableHead>
							<TableHead className="text-center">Удалить</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 4 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 6 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : investmentsArray.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="text-center py-12 text-gray-400"
								>
									<PieChart className="w-10 h-10 mx-auto mb-2 opacity-30" />
									<p>Инвестиций пока нет</p>
								</TableCell>
							</TableRow>
						) : (
							investmentsArray.map((inv) => (
								<TableRow key={inv.id} className="hover:bg-gray-50">
									<TableCell>
										<div>
											<p className="font-medium text-sm text-gray-900">
												{inv.propertyName || "—"}
											</p>
											{inv.propertyUnit && (
												<p className="text-xs text-gray-400">
													ед. {inv.propertyUnit}
												</p>
											)}
										</div>
									</TableCell>
									<TableCell>
										<div>
											<p className="font-medium text-sm text-gray-800">
												{inv.investorName || `#${inv.investorId}`}
											</p>
											{inv.investorPhone && (
												<p className="text-xs text-gray-400">
													{inv.investorPhone}
												</p>
											)}
										</div>
									</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center justify-end gap-1.5">
											<div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
												<div
													className="h-full bg-blue-600 rounded-full"
													style={{
														width: `${Math.min(100, parseFloat(inv.sharePercent))}%`,
													}}
												/>
											</div>
											<span className="font-semibold text-blue-600 text-sm">
												{parseFloat(inv.sharePercent)}%
											</span>
										</div>
									</TableCell>
									<TableCell className="text-right font-medium text-emerald-600 text-sm">
										{fmtCurrency(inv.capitalInvested)}
									</TableCell>
									<TableCell className="text-sm text-gray-500">
										{inv.investedAt
											? new Date(inv.investedAt).toLocaleDateString("ru-KG")
											: "—"}
									</TableCell>
									<TableCell className="text-center">
										<Button
											size="sm"
											variant="ghost"
											className="h-7 w-7 p-0"
											onClick={() => handleDelete(inv.id)}
										>
											<Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-rose-600" />
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{showAdd && (
				<AddDialog
					onClose={() => setShowAdd(false)}
					onSaved={() =>
						queryClient.invalidateQueries({ queryKey: ["investments"] })
					}
				/>
			)}
		</div>
	);
}
