import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
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
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/unwrap-list";

const CATEGORIES_INCOME = [
	"Платёж по договору",
	"Первоначальный взнос",
	"Аванс покупателя",
	"Инвестиции",
	"Возврат от поставщика",
	"Перевод между счетами",
	"Прочие доходы",
];
const CATEGORIES_EXPENSE = [
	"Строительство",
	"Зарплата бригады",
	"Подрядчики",
	"Материалы",
	"Аренда техники",
	"OPEX",
	"Налоги и взносы",
	"Документация",
	"Земельный участок",
	"Займы другим проектам",
	"Подотчёт",
	"Прочие расходы",
];

type SelectProps = {
	value: string;
	onValueChange: (value: string) => void;
	selectContentClassName?: string;
	disabled?: boolean;
};

function FieldLabel({
	label,
	onCreate,
	createDisabled,
}: {
	label: string;
	onCreate?: () => void;
	createDisabled?: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-2">
			<Label className="text-xs text-gray-500">{label}</Label>
			{onCreate ? (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-6 px-2 text-xs text-amber-700 hover:text-amber-800"
					onClick={onCreate}
					disabled={createDisabled}
				>
					<Plus className="mr-1 h-3 w-3" />
					Создать
				</Button>
			) : null}
		</div>
	);
}

export function AccountSelectField({
	value,
	onValueChange,
	selectContentClassName,
	disabled,
	label = "СЧЁТ",
}: SelectProps & { label?: string }) {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState({
		name: "",
		type: "cash",
		currency: "KGS",
		openingBalance: "0",
	});

	const { data: accountsRaw } = useQuery({
		queryKey: ["construction-accounts"],
		queryFn: () => api.get("/construction/accounts").then((r) => r.data),
	});
	const accounts = unwrapList<{ id: number; name: string; currency?: string }>(
		accountsRaw,
	);

	const createMut = useMutation({
		mutationFn: () =>
			api
				.post("/construction/accounts", {
					...form,
					currentBalance: form.openingBalance,
				})
				.then((r) => r.data),
		onSuccess: (row: { id: number; name: string }) => {
			qc.invalidateQueries({ queryKey: ["construction-accounts"] });
			onValueChange(String(row.id));
			setOpen(false);
			setForm({ name: "", type: "cash", currency: "KGS", openingBalance: "0" });
			toast.success(`Счёт «${row.name}» создан`);
		},
		onError: (e) => toast.error(getApiErrorMessage(e, "Не удалось создать счёт")),
	});

	return (
		<div>
			<FieldLabel label={label} onCreate={() => setOpen(true)} />
			<Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
				<SelectTrigger className="mt-1 h-9 text-sm border-gray-200">
					<SelectValue placeholder={accounts.length ? "Выберите счёт" : "Создайте счёт"} />
				</SelectTrigger>
				<SelectContent className={selectContentClassName}>
					{accounts.map((a) => (
						<SelectItem key={a.id} value={String(a.id)}>
							{a.name}
							{a.currency ? ` (${a.currency})` : ""}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Новый счёт</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label className="text-xs">Название *</Label>
							<Input
								className="mt-1 h-8"
								value={form.name}
								onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
								placeholder="Касса стройки"
							/>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div>
								<Label className="text-xs">Тип</Label>
								<Select
									value={form.type}
									onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
								>
									<SelectTrigger className="mt-1 h-8">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="cash">Наличные</SelectItem>
										<SelectItem value="bank">Банк</SelectItem>
										<SelectItem value="card">Карта</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label className="text-xs">Валюта</Label>
								<Select
									value={form.currency}
									onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
								>
									<SelectTrigger className="mt-1 h-8">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="KGS">KGS</SelectItem>
										<SelectItem value="USD">USD</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Отмена
						</Button>
						<Button
							className="bg-amber-500 hover:bg-amber-600"
							disabled={!form.name.trim() || createMut.isPending}
							onClick={() => createMut.mutate()}
						>
							{createMut.isPending ? "Сохранение…" : "Создать"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export function ProjectSelectField({
	value,
	onValueChange,
	selectContentClassName,
	disabled,
	allowNone = true,
	label = "ПРОЕКТ",
}: SelectProps & { allowNone?: boolean; label?: string }) {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");

	const { data: projectsRaw } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const projects = unwrapList<{ id: number; name: string }>(projectsRaw);

	const createMut = useMutation({
		mutationFn: () =>
			api
				.post("/construction/projects", {
					name: name.trim(),
					status: "planning",
					currency: "KGS",
				})
				.then((r) => r.data),
		onSuccess: (row: { id: number }) => {
			qc.invalidateQueries({ queryKey: ["construction-projects"] });
			qc.invalidateQueries({ queryKey: ["construction-projects-all"] });
			onValueChange(String(row.id));
			setOpen(false);
			setName("");
			toast.success("Проект создан");
		},
		onError: (e) => toast.error(getApiErrorMessage(e, "Не удалось создать проект")),
	});

	return (
		<div>
			<FieldLabel label={label} onCreate={() => setOpen(true)} />
			<Select
				value={value === "" ? "none" : value || "none"}
				onValueChange={onValueChange}
				disabled={disabled}
			>
				<SelectTrigger className="mt-1 h-9 text-sm border-gray-200">
					<SelectValue placeholder="Выберите проект" />
				</SelectTrigger>
				<SelectContent className={selectContentClassName}>
					{allowNone ? <SelectItem value="none">Не привязан</SelectItem> : null}
					{projects.map((p) => (
						<SelectItem key={p.id} value={String(p.id)}>
							{p.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Новый проект</DialogTitle>
					</DialogHeader>
					<div>
						<Label className="text-xs">Название объекта *</Label>
						<Input
							className="mt-1 h-8"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="ЖК Салам"
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Отмена
						</Button>
						<Button
							className="bg-amber-500 hover:bg-amber-600"
							disabled={!name.trim() || createMut.isPending}
							onClick={() => createMut.mutate()}
						>
							Создать
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export function CounterpartySelectField({
	value,
	onValueChange,
	selectContentClassName,
	disabled,
	label = "КОНТРАГЕНТ",
	defaultRole = "buyer",
}: SelectProps & { label?: string; defaultRole?: string }) {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const [fullName, setFullName] = useState("");
	const [phone, setPhone] = useState("");

	const { data: counterpartiesRaw } = useQuery({
		queryKey: ["counterparties", "all"],
		queryFn: () => api.get("/counterparties").then((r) => r.data),
	});
	const counterparties = unwrapList<{ id: number; fullName: string }>(counterpartiesRaw);

	const createMut = useMutation({
		mutationFn: () =>
			api
				.post("/counterparties", {
					type: "individual",
					fullName: fullName.trim(),
					phone: phone.trim() || undefined,
					categories: [defaultRole],
				})
				.then((r) => r.data),
		onSuccess: (row: { id: number; fullName: string }) => {
			qc.invalidateQueries({ queryKey: ["counterparties"] });
			onValueChange(String(row.id));
			setOpen(false);
			setFullName("");
			setPhone("");
			toast.success(`Контрагент «${row.fullName}» создан`);
		},
		onError: (e) =>
			toast.error(getApiErrorMessage(e, "Не удалось создать контрагента")),
	});

	return (
		<div>
			<FieldLabel label={label} onCreate={() => setOpen(true)} />
			<Select
				value={value === "" ? "none" : value || "none"}
				onValueChange={onValueChange}
				disabled={disabled}
			>
				<SelectTrigger className="mt-1 h-9 text-sm border-gray-200">
					<SelectValue placeholder="Не указан" />
				</SelectTrigger>
				<SelectContent className={selectContentClassName}>
					<SelectItem value="none">Не указан</SelectItem>
					{counterparties.map((c) => (
						<SelectItem key={c.id} value={String(c.id)}>
							{c.fullName}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Новый контрагент</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label className="text-xs">ФИО / название *</Label>
							<Input
								className="mt-1 h-8"
								value={fullName}
								onChange={(e) => setFullName(e.target.value)}
							/>
						</div>
						<div>
							<Label className="text-xs">Телефон</Label>
							<Input
								className="mt-1 h-8"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Отмена
						</Button>
						<Button
							className="bg-amber-500 hover:bg-amber-600"
							disabled={!fullName.trim() || createMut.isPending}
							onClick={() => createMut.mutate()}
						>
							Создать
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export function CategorySelectField({
	value,
	onValueChange,
	type,
	selectContentClassName,
}: {
	value: string;
	onValueChange: (value: string) => void;
	type: "income" | "expense";
	selectContentClassName?: string;
}) {
	const presets = type === "income" ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;
	const isCustom = Boolean(value && !presets.includes(value));
	const [customMode, setCustomMode] = useState(isCustom);

	const selectValue = useMemo(() => {
		if (customMode || isCustom) return "__custom__";
		return value || undefined;
	}, [customMode, isCustom, value]);

	return (
		<div className="space-y-2">
			<Label className="text-xs text-gray-500">СТАТЬЯ</Label>
			<Select
				value={selectValue}
				onValueChange={(v) => {
					if (v === "__custom__") {
						setCustomMode(true);
						if (presets.includes(value)) onValueChange("");
						return;
					}
					setCustomMode(false);
					onValueChange(v);
				}}
			>
				<SelectTrigger className="mt-1 h-9 text-sm border-gray-200">
					<SelectValue placeholder="Выберите статью" />
				</SelectTrigger>
				<SelectContent className={selectContentClassName}>
					{presets.map((c) => (
						<SelectItem key={c} value={c}>
							{c}
						</SelectItem>
					))}
					<SelectItem value="__custom__">Своя статья…</SelectItem>
				</SelectContent>
			</Select>
			{(customMode || isCustom) && (
				<Input
					className="h-8 text-sm"
					placeholder="Введите название статьи"
					value={value}
					onChange={(e) => onValueChange(e.target.value)}
				/>
			)}
		</div>
	);
}

export function SalesContractSelectField({
	value,
	onValueChange,
	selectContentClassName,
	disabled,
	prefillAmount,
	prefillBuyerName,
	prefillProjectId,
}: SelectProps & {
	prefillAmount?: string;
	prefillBuyerName?: string;
	prefillProjectId?: string;
}) {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState({
		projectId: "",
		buyerName: "",
		totalAmount: "",
	});

	const { data: contractsRaw } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => r.data),
	});
	const contracts = unwrapList<{
		id: number;
		contractNumber?: string;
		buyerName?: string;
	}>(contractsRaw);

	const { data: projectsRaw } = useQuery({
		queryKey: ["construction-projects-all"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const projects = unwrapList<{ id: number; name: string }>(projectsRaw);

	const openCreate = () => {
		setForm({
			projectId: prefillProjectId && prefillProjectId !== "none" ? prefillProjectId : "",
			buyerName: prefillBuyerName || "",
			totalAmount: prefillAmount || "",
		});
		setOpen(true);
	};

	const createMut = useMutation({
		mutationFn: () =>
			api
				.post("/construction/contracts-sales", {
					projectId: Number(form.projectId),
					buyerName: form.buyerName.trim(),
					totalAmount: form.totalAmount || "0",
					status: "signed",
					contractDate: new Date().toISOString().slice(0, 10),
					currency: "KGS",
				})
				.then((r) => r.data),
		onSuccess: (row: { id: number; contractNumber?: string }) => {
			qc.invalidateQueries({ queryKey: ["construction-contracts-sales"] });
			onValueChange(String(row.id));
			setOpen(false);
			toast.success(`Договор ${row.contractNumber || `#${row.id}`} создан`);
		},
		onError: (e) => toast.error(getApiErrorMessage(e, "Не удалось создать договор")),
	});

	return (
		<div>
			<FieldLabel label="ДОГОВОР ПРОДАЖИ *" onCreate={openCreate} />
			<Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
				<SelectTrigger>
					<SelectValue
						placeholder={
							contracts.length ? "Выберите договор" : "Создайте договор"
						}
					/>
				</SelectTrigger>
				<SelectContent className={selectContentClassName}>
					{contracts.map((c) => (
						<SelectItem key={c.id} value={String(c.id)}>
							{c.contractNumber || `#${c.id}`}
							{c.buyerName ? ` — ${c.buyerName}` : ""}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{contracts.length === 0 && (
				<p className="mt-1 text-xs text-amber-700">
					Для приёма бартера нужен договор продажи — нажмите «Создать».
				</p>
			)}

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Быстрый договор продажи</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label className="text-xs">Объект *</Label>
							<Select
								value={form.projectId || undefined}
								onValueChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
							>
								<SelectTrigger className="mt-1 h-8">
									<SelectValue placeholder="Выберите проект" />
								</SelectTrigger>
								<SelectContent>
									{projects.map((p) => (
										<SelectItem key={p.id} value={String(p.id)}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label className="text-xs">Покупатель *</Label>
							<Input
								className="mt-1 h-8"
								value={form.buyerName}
								onChange={(e) =>
									setForm((f) => ({ ...f, buyerName: e.target.value }))
								}
							/>
						</div>
						<div>
							<Label className="text-xs">Сумма договора, сом</Label>
							<Input
								type="number"
								className="mt-1 h-8"
								value={form.totalAmount}
								onChange={(e) =>
									setForm((f) => ({ ...f, totalAmount: e.target.value }))
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Отмена
						</Button>
						<Button
							className="bg-amber-500 hover:bg-amber-600"
							disabled={
								!form.projectId ||
								!form.buyerName.trim() ||
								createMut.isPending
							}
							onClick={() => createMut.mutate()}
						>
							Создать
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export { CATEGORIES_INCOME, CATEGORIES_EXPENSE };
