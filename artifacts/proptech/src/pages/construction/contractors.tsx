import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Edit2, Plus, Star, Trash2 } from "lucide-react";
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
import { getApiBase } from "@/lib/api-base";

const BASE = getApiBase();
const ah = () => {
	const t = localStorage.getItem("auth_token");
	return {
		"Content-Type": "application/json",
		...(t ? { Authorization: `Bearer ${t}` } : {}),
	};
};

const SPECS = [
	"Монолит",
	"Кирпичная кладка",
	"Кровля",
	"Электромонтаж",
	"Сантехника",
	"Отделочные работы",
	"Фасадные работы",
	"Металлоконструкции",
	"Генподряд",
	"Дорожные работы",
	"Благоустройство",
];

interface Contractor {
	id: number;
	fullName: string;
	type: string;
	specialization?: string;
	phone?: string;
	email?: string;
	inn?: string;
	contractNumber?: string;
	contractAmount?: string;
	currency: string;
	status: string;
	rating?: number;
	notes?: string;
}

function ContractorDialog({
	contractor,
	onClose,
	onSaved,
}: {
	contractor: Contractor | null | "new";
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const isEdit = contractor && contractor !== "new";
	const init = isEdit ? (contractor as Contractor) : null;
	const [form, setForm] = useState({
		fullName: init?.fullName || "",
		type: init?.type || "company",
		specialization: init?.specialization || "",
		phone: init?.phone || "",
		email: init?.email || "",
		inn: init?.inn || "",
		contractNumber: init?.contractNumber || "",
		contractAmount: init?.contractAmount || "",
		currency: init?.currency || "KGS",
		status: init?.status || "active",
		rating: String(init?.rating || ""),
		notes: init?.notes || "",
	});
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.fullName) {
			toast({ title: "Укажите название", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const url = isEdit
				? `${BASE}/construction/contractors/${init?.id}`
				: `${BASE}/construction/contractors`;
			await fetch(url, {
				method: isEdit ? "PATCH" : "POST",
				headers: ah(),
				body: JSON.stringify(form),
			});
			toast({ title: isEdit ? "Подрядчик обновлён" : "Подрядчик добавлен" });
			onSaved();
			onClose();
		} catch {
			toast({ title: "Ошибка", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={!!contractor} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Редактировать подрядчика" : "Добавить подрядчика"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<div className="col-span-2">
							<Label>Название / ФИО *</Label>
							<Input
								className="mt-1"
								value={form.fullName}
								onChange={(e) => set("fullName", e.target.value)}
								required
							/>
						</div>
						<div>
							<Label>Тип</Label>
							<Select value={form.type} onValueChange={(v) => set("type", v)}>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="company">Компания</SelectItem>
									<SelectItem value="individual">ИП / физлицо</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Специализация</Label>
							<Select
								value={form.specialization}
								onValueChange={(v) => set("specialization", v)}
							>
								<SelectTrigger className="mt-1">
									<SelectValue placeholder="Выберите..." />
								</SelectTrigger>
								<SelectContent>
									{SPECS.map((s) => (
										<SelectItem key={s} value={s}>
											{s}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Телефон</Label>
							<Input
								className="mt-1"
								value={form.phone}
								onChange={(e) => set("phone", e.target.value)}
							/>
						</div>
						<div>
							<Label>Email</Label>
							<Input
								className="mt-1"
								type="email"
								value={form.email}
								onChange={(e) => set("email", e.target.value)}
							/>
						</div>
						<div>
							<Label>ИНН</Label>
							<Input
								className="mt-1"
								value={form.inn}
								onChange={(e) => set("inn", e.target.value)}
							/>
						</div>
						<div>
							<Label>Статус</Label>
							<Select
								value={form.status}
								onValueChange={(v) => set("status", v)}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="active">Активен</SelectItem>
									<SelectItem value="inactive">Неактивен</SelectItem>
									<SelectItem value="blacklisted">В чёрном списке</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>№ договора</Label>
							<Input
								className="mt-1"
								value={form.contractNumber}
								onChange={(e) => set("contractNumber", e.target.value)}
							/>
						</div>
						<div>
							<Label>Сумма договора</Label>
							<Input
								className="mt-1"
								type="number"
								value={form.contractAmount}
								onChange={(e) => set("contractAmount", e.target.value)}
							/>
						</div>
						<div>
							<Label>Рейтинг (1–5)</Label>
							<Select
								value={form.rating}
								onValueChange={(v) => set("rating", v)}
							>
								<SelectTrigger className="mt-1">
									<SelectValue placeholder="—" />
								</SelectTrigger>
								<SelectContent>
									{[1, 2, 3, 4, 5].map((n) => (
										<SelectItem key={n} value={String(n)}>
											{"⭐".repeat(n)} ({n})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
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
						<Button
							type="submit"
							className="bg-amber-500 hover:bg-orange-600"
							disabled={loading}
						>
							{loading ? "..." : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function ConstructionContractors() {
	const qc = useQueryClient();
	const { toast } = useToast();
	const [dialog, setDialog] = useState<Contractor | null | "new">(null);
	const [search, setSearch] = useState("");

	const { data: contractors = [], isLoading } = useQuery<Contractor[]>({
		queryKey: ["construction-contractors"],
		queryFn: () => api.get("/construction/contractors").then((r) => r.data),
	});
	const filtered = contractors.filter(
		(c) =>
			!search ||
			c.fullName.toLowerCase().includes(search.toLowerCase()) ||
			c.specialization?.toLowerCase().includes(search.toLowerCase()),
	);

	const handleDelete = async (id: number) => {
		if (!confirm("Удалить подрядчика?")) return;
		await fetch(`${BASE}/construction/contractors/${id}`, {
			method: "DELETE",
			headers: ah(),
		});
		toast({ title: "Удалено" });
		qc.invalidateQueries({ queryKey: ["construction-contractors"] });
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Подрядчики</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Подрядные организации и ИП
					</p>
				</div>
				<Button
					onClick={() => setDialog("new")}
					className="bg-amber-500 hover:bg-orange-600 gap-2"
				>
					<Plus className="w-4 h-4" /> Добавить
				</Button>
			</div>

			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<div className="p-4 border-b border-gray-100">
					<Input
						placeholder="Поиск по названию или специализации..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="max-w-sm"
					/>
				</div>
				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							<TableHead>Подрядчик</TableHead>
							<TableHead>Специализация</TableHead>
							<TableHead>Контакты</TableHead>
							<TableHead>Договор</TableHead>
							<TableHead>Рейтинг</TableHead>
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
						) : filtered.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={7}
									className="text-center py-12 text-gray-400"
								>
									<Briefcase className="w-10 h-10 mx-auto mb-2 opacity-20" />
									<p>Подрядчиков нет</p>
								</TableCell>
							</TableRow>
						) : (
							filtered.map((c) => (
								<TableRow key={c.id} className="hover:bg-gray-50">
									<TableCell>
										<div className="flex items-center gap-2.5">
											<div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold">
												{c.fullName.charAt(0)}
											</div>
											<div>
												<p className="font-medium text-sm text-gray-900">
													{c.fullName}
												</p>
												<p className="text-xs text-gray-400">
													{c.type === "company" ? "Компания" : "ИП"}
												</p>
											</div>
										</div>
									</TableCell>
									<TableCell className="text-sm text-gray-600">
										{c.specialization || "—"}
									</TableCell>
									<TableCell>
										<div className="text-xs">
											<p className="text-gray-600">{c.phone || "—"}</p>
											{c.email && <p className="text-gray-400">{c.email}</p>}
										</div>
									</TableCell>
									<TableCell className="text-sm">
										{c.contractNumber && (
											<p className="font-medium text-gray-800">
												№{c.contractNumber}
											</p>
										)}
										{c.contractAmount && (
											<p className="text-gray-400">
												{parseFloat(c.contractAmount).toLocaleString("ru-KG")} ₸
											</p>
										)}
										{!c.contractNumber && "—"}
									</TableCell>
									<TableCell>
										{c.rating ? (
											<div className="flex items-center gap-0.5">
												{Array.from({ length: 5 }).map((_, i) => (
													<Star
														key={i}
														className={`w-3.5 h-3.5 ${i < c.rating! ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
													/>
												))}
											</div>
										) : (
											<span className="text-gray-400 text-sm">—</span>
										)}
									</TableCell>
									<TableCell>
										<Badge
											className={
												c.status === "active"
													? "bg-emerald-100 text-emerald-800"
													: c.status === "blacklisted"
														? "bg-rose-100 text-rose-800"
														: "bg-gray-100 text-gray-700"
											}
											variant="secondary"
										>
											{c.status === "active"
												? "Активен"
												: c.status === "blacklisted"
													? "Чёрный список"
													: "Неактивен"}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex gap-1 justify-center">
											<Button
												size="sm"
												variant="ghost"
												className="h-7 w-7 p-0"
												onClick={() => setDialog(c)}
											>
												<Edit2 className="w-3.5 h-3.5 text-gray-400" />
											</Button>
											<Button
												size="sm"
												variant="ghost"
												className="h-7 w-7 p-0"
												onClick={() => handleDelete(c.id)}
											>
												<Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-rose-600" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<ContractorDialog
				contractor={dialog}
				onClose={() => setDialog(null)}
				onSaved={() =>
					qc.invalidateQueries({ queryKey: ["construction-contractors"] })
				}
			/>
		</div>
	);
}
