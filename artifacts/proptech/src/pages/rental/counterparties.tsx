import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Building2,
	Mail,
	Pencil,
	Phone,
	Plus,
	User,
	Users,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { getListTenantsQueryKey, getListLeaseContractsQueryKey } from "@/lib/rental-query-keys";

interface Tenant {
	id: number;
	fullName: string;
	phone?: string;
	email?: string;
	iin?: string;
	type?: string;
	status: string;
	comment?: string;
}

const EMPTY: Partial<Tenant> = {
	fullName: "",
	phone: "",
	email: "",
	iin: "",
	type: "individual",
	status: "active",
	comment: "",
};

export default function RentalCounterparties() {
	const searchString = useSearch();
	const [search, setSearch] = useState("");
	const [modalOpen, setModalOpen] = useState(false);
	const [editing, setEditing] = useState<Partial<Tenant>>(EMPTY);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const qc = useQueryClient();

	const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
		queryKey: getListTenantsQueryKey(),
		queryFn: () => api.get("/rental/tenants").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery<any[]>({
		queryKey: getListLeaseContractsQueryKey(),
		queryFn: () => api.get("/rental/contracts").then((r) => r.data),
	});

	const enriched = tenants
		.map((t) => {
			const tenantContracts = contracts.filter((c: any) => c.tenantId === t.id);
			const active = tenantContracts.filter((c: any) => c.status === "active");
			return {
				...t,
				contractCount: tenantContracts.length,
				activeCount: active.length,
			};
		})
		.filter((t) => {
			if (!search) return true;
			const q = search.toLowerCase();
			return (
				t.fullName?.toLowerCase().includes(q) ||
				t.phone?.includes(q) ||
				t.email?.toLowerCase().includes(q)
			);
		});

	function openCreate() {
		setEditing(EMPTY);
		setError("");
		setModalOpen(true);
	}

	useEffect(() => {
		const params = new URLSearchParams(
			searchString.startsWith("?") ? searchString : `?${searchString}`,
		);
		if (params.get("create") === "1" || params.get("new") === "1") {
			openCreate();
		}
	}, [searchString]);
	function openEdit(t: Tenant) {
		setEditing({ ...t });
		setError("");
		setModalOpen(true);
	}
	function closeModal() {
		setModalOpen(false);
		setEditing(EMPTY);
		setError("");
	}

	async function handleSave() {
		if (!editing.fullName?.trim()) {
			setError("Укажите ФИО / Название");
			return;
		}
		setSaving(true);
		setError("");
		try {
			if (editing.id) {
				await api.patch(`/rental/tenants/${editing.id}`, editing);
			} else {
				await api.post("/rental/tenants", editing);
			}
			qc.invalidateQueries({ queryKey: getListTenantsQueryKey() });
			closeModal();
		} catch (e: any) {
			setError(getApiErrorMessage(e, "Ошибка сохранения"));
		} finally {
			setSaving(false);
		}
	}

	const isNew = !editing.id;

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Контрагенты</h1>
					<p className="text-gray-500 text-sm mt-0.5">Арендаторы и партнёры</p>
				</div>
				<div className="flex items-center gap-3">
					<Input
						className="w-52 h-8 text-sm"
						placeholder="Поиск..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<Button
						size="sm"
						onClick={openCreate}
						className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700"
					>
						<Plus className="w-4 h-4" /> Добавить
					</Button>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-3 gap-4 mb-6">
				<div className="bg-white border rounded-lg p-4">
					<p className="text-sm text-gray-500">Всего контрагентов</p>
					<p className="text-2xl font-bold text-gray-900 mt-1">
						{tenants.length}
					</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<p className="text-sm text-gray-500">Активных договоров</p>
					<p className="text-2xl font-bold text-emerald-600 mt-1">
						{contracts.filter((c: any) => c.status === "active").length}
					</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<p className="text-sm text-gray-500">Юрлиц</p>
					<p className="text-2xl font-bold text-blue-600 mt-1">
						{tenants.filter((t) => t.type === "company").length}
					</p>
				</div>
			</div>

			{/* Table */}
			<div className="bg-white border rounded-lg overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="text-left p-3 font-medium text-gray-600">
								Контрагент
							</th>
							<th className="text-left p-3 font-medium text-gray-600">
								Контакты
							</th>
							<th className="text-left p-3 font-medium text-gray-600">
								ИНН / ИИН
							</th>
							<th className="text-center p-3 font-medium text-gray-600">
								Договоры
							</th>
							<th className="text-center p-3 font-medium text-gray-600">
								Статус
							</th>
							<th className="w-10 p-3" />
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							<tr>
								<td colSpan={6} className="p-8 text-center text-gray-400">
									Загрузка...
								</td>
							</tr>
						) : enriched.length === 0 ? (
							<tr>
								<td colSpan={6} className="p-12 text-center text-gray-400">
									<Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
									<p className="text-sm mb-3">Нет контрагентов</p>
									<Button
										size="sm"
										variant="outline"
										onClick={openCreate}
										className="gap-1"
									>
										<Plus className="w-3.5 h-3.5" /> Добавить первого
									</Button>
								</td>
							</tr>
						) : (
							enriched.map((t) => (
								<tr key={t.id} className="border-t hover:bg-gray-50 group">
									<td className="p-3">
										<div className="flex items-center gap-2">
											<div
												className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
													t.type === "company"
														? "bg-blue-100 text-blue-700"
														: "bg-blue-50 text-blue-600"
												}`}
											>
												{t.type === "company" ? (
													<Building2 className="w-4 h-4" />
												) : (
													(t.fullName || "?").charAt(0).toUpperCase()
												)}
											</div>
											<div>
												<p className="font-medium text-gray-900">
													{t.fullName}
												</p>
												<div className="mt-0.5">
													{t.type === "company" ? (
														<Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">
															Юрлицо
														</Badge>
													) : (
														<Badge className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0">
															Физлицо
														</Badge>
													)}
												</div>
											</div>
										</div>
									</td>
									<td className="p-3">
										{t.phone && (
											<div className="flex items-center gap-1 text-gray-600 text-xs">
												<Phone className="w-3 h-3" /> {t.phone}
											</div>
										)}
										{t.email && (
											<div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
												<Mail className="w-3 h-3" /> {t.email}
											</div>
										)}
									</td>
									<td className="p-3 text-gray-600 text-xs font-mono">
										{t.iin || "—"}
									</td>
									<td className="p-3 text-center">
										<span className="text-gray-700 font-medium">
											{t.contractCount}
										</span>
										{t.activeCount > 0 && (
											<span className="text-xs text-emerald-600 ml-1">
												({t.activeCount} акт.)
											</span>
										)}
									</td>
									<td className="p-3 text-center">
										{t.activeCount > 0 ? (
											<Badge className="bg-emerald-100 text-emerald-800">
												Активный
											</Badge>
										) : (
											<Badge className="bg-gray-100 text-gray-600">
												Неактивный
											</Badge>
										)}
									</td>
									<td className="p-3">
										<button
											onClick={() => openEdit(t)}
											className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded"
										>
											<Pencil className="w-3.5 h-3.5 text-gray-500" />
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Modal */}
			{modalOpen && (
				<div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
						<div className="flex items-center justify-between px-5 py-4 border-b">
							<h2 className="font-semibold text-gray-900">
								{isNew ? "Новый контрагент" : "Редактировать контрагента"}
							</h2>
							<button
								onClick={closeModal}
								className="p-1.5 hover:bg-gray-100 rounded-lg"
							>
								<X className="w-4 h-4 text-gray-500" />
							</button>
						</div>
						<div className="p-5 space-y-4">
							{/* Type selector */}
							<div className="flex gap-2">
								{[
									["individual", <User className="w-3.5 h-3.5" />, "Физлицо"],
									["company", <Building2 className="w-3.5 h-3.5" />, "Юрлицо"],
								].map(([val, icon, label]) => (
									<button
										key={val as string}
										onClick={() =>
											setEditing((e) => ({ ...e, type: val as string }))
										}
										className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all ${
											editing.type === val
												? "border-blue-600 bg-blue-50 text-blue-700"
												: "border-gray-200 text-white hover:border-gray-300"
										}`}
									>
										{icon as any} {label as string}
									</button>
								))}
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="col-span-2">
									<Label className="text-xs font-medium text-gray-600">
										{editing.type === "company"
											? "Название организации *"
											: "ФИО *"}
									</Label>
									<Input
										className="mt-1 h-9"
										placeholder={
											editing.type === "company"
												? "ООО Компания"
												: "Иванов Иван Иванович"
										}
										value={editing.fullName || ""}
										onChange={(e) =>
											setEditing((v) => ({ ...v, fullName: e.target.value }))
										}
									/>
								</div>
								<div>
									<Label className="text-xs font-medium text-gray-600">
										Телефон
									</Label>
									<Input
										className="mt-1 h-9"
										placeholder="+996 700 000000"
										value={editing.phone || ""}
										onChange={(e) =>
											setEditing((v) => ({ ...v, phone: e.target.value }))
										}
									/>
								</div>
								<div>
									<Label className="text-xs font-medium text-gray-600">
										Email
									</Label>
									<Input
										className="mt-1 h-9"
										type="email"
										placeholder="mail@example.com"
										value={editing.email || ""}
										onChange={(e) =>
											setEditing((v) => ({ ...v, email: e.target.value }))
										}
									/>
								</div>
								<div>
									<Label className="text-xs font-medium text-gray-600">
										{editing.type === "company" ? "ИНН организации" : "ИИН"}
									</Label>
									<Input
										className="mt-1 h-9 font-mono"
										placeholder="14 цифр"
										value={editing.iin || ""}
										onChange={(e) =>
											setEditing((v) => ({ ...v, iin: e.target.value }))
										}
									/>
								</div>
								<div>
									<Label className="text-xs font-medium text-gray-600">
										Статус
									</Label>
									<Select
										value={editing.status || "active"}
										onValueChange={(v) =>
											setEditing((e) => ({ ...e, status: v }))
										}
									>
										<SelectTrigger className="mt-1 h-9">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="active">Активный</SelectItem>
											<SelectItem value="inactive">Неактивный</SelectItem>
											<SelectItem value="blocked">Заблокирован</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="col-span-2">
									<Label className="text-xs font-medium text-gray-600">
										Комментарий
									</Label>
									<Input
										className="mt-1 h-9"
										placeholder="Дополнительная информация"
										value={editing.comment || ""}
										onChange={(e) =>
											setEditing((v) => ({ ...v, comment: e.target.value }))
										}
									/>
								</div>
							</div>

							{error && (
								<p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">
									{error}
								</p>
							)}
						</div>
						<div className="flex justify-end gap-2 px-5 py-4 border-t">
							<Button
								variant="outline"
								size="sm"
								onClick={closeModal}
								disabled={saving}
							>
								Отмена
							</Button>
							<Button
								size="sm"
								onClick={handleSave}
								disabled={saving}
								className="bg-blue-600 hover:bg-blue-700 min-w-[90px]"
							>
								{saving ? "Сохранение..." : isNew ? "Создать" : "Сохранить"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
