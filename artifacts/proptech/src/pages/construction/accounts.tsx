import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CreditCard, Landmark, Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { api } from "@/lib/api";

const TYPE_CONFIG = {
	cash: {
		label: "Наличные",
		icon: Banknote,
		color: "bg-emerald-100 text-emerald-700 border-emerald-200",
	},
	bank: {
		label: "Банк",
		icon: Landmark,
		color: "bg-blue-100 text-blue-700 border-blue-200",
	},
	card: {
		label: "Карта",
		icon: CreditCard,
		color: "bg-indigo-100 text-indigo-700 border-violet-200",
	},
};

function fmt(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-RU").format(v);
}

export default function ConstructionAccounts() {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState({
		name: "",
		type: "cash",
		bank: "",
		bik: "",
		accountNumber: "",
		currency: "KGS",
		openingBalance: "0",
		notes: "",
	});

	const { data: accounts = [], isLoading } = useQuery({
		queryKey: ["construction-accounts"],
		queryFn: () => api.get("/construction/accounts").then((r) => r.data),
	});

	const createMut = useMutation({
		mutationFn: (data: any) =>
			api.post("/construction/accounts", data).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["construction-accounts"] });
			setOpen(false);
			toast.success("Счёт добавлен");
			resetForm();
		},
		onError: () => toast.error("Ошибка создания счёта"),
	});

	function resetForm() {
		setForm({
			name: "",
			type: "cash",
			bank: "",
			bik: "",
			accountNumber: "",
			currency: "KGS",
			openingBalance: "0",
			notes: "",
		});
	}

	const accountsArray = Array.isArray(accounts) ? accounts : [];
	const totalBalance = accountsArray.reduce((s: number, a: any) => {
		if (a.currency === "KGS") return s + parseFloat(a.currentBalance || "0");
		return s;
	}, 0);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Счета</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Только модуль «Строительство» — счета аренды здесь не отображаются
					</p>
				</div>
				<Button
					onClick={() => setOpen(true)}
					className="bg-amber-500 hover:bg-orange-600"
				>
					<Plus className="w-4 h-4 mr-2" /> Добавить счёт
				</Button>
			</div>

			<div className="grid grid-cols-3 gap-4 mb-6">
				<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm col-span-2">
					<div className="flex items-center gap-2 mb-1">
						<Wallet className="w-4 h-4 text-blue-500" />
						<span className="text-xs text-gray-500">Общий баланс (KGS)</span>
					</div>
					<div className="text-3xl font-bold text-gray-900">
						{fmt(totalBalance)}
					</div>
				</div>
				<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
					<div className="text-xs text-gray-500 mb-1">Счетов</div>
					<div className="text-3xl font-bold text-gray-900">
						{accounts.length}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-3 gap-4">
				{isLoading ? (
					<div className="col-span-3 text-center py-12 text-gray-400">
						Загрузка...
					</div>
				) : accountsArray.length === 0 ? (
					<div className="col-span-3 text-center py-12 text-gray-400">
						<Landmark className="w-12 h-12 mx-auto mb-3 text-gray-200" />
						<p>Нет счетов. Нажмите «Добавить счёт»</p>
					</div>
				) : (
					accountsArray.map((acc: any) => {
						const tc =
							TYPE_CONFIG[acc.type as keyof typeof TYPE_CONFIG] ||
							TYPE_CONFIG.cash;
						const Icon = tc.icon;
						return (
							<div
								key={acc.id}
								className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
							>
								<div className="flex items-center gap-3 mb-3">
									<div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
										<Icon className="w-5 h-5 text-gray-500" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="font-semibold text-gray-900 truncate">
											{acc.name}
										</div>
										<Badge
											variant="outline"
											className={`${tc.color} text-[10px] mt-0.5`}
										>
											{tc.label}
										</Badge>
									</div>
								</div>
								{acc.bank && (
									<div className="text-xs text-gray-400 mb-0.5">
										Банк: {acc.bank}
									</div>
								)}
								{acc.accountNumber && (
									<div className="text-xs text-gray-400 font-mono mb-2">
										{acc.accountNumber}
									</div>
								)}
								<div className="border-t border-gray-50 pt-2 mt-2">
									<div className="text-xs text-gray-500">Баланс</div>
									<div className="text-xl font-bold text-gray-900 mt-0.5">
										{fmt(acc.currentBalance)}{" "}
										<span className="text-sm text-gray-400">
											{acc.currency}
										</span>
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Добавить счёт</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 mt-2">
						<div>
							<Label className="text-xs">Название *</Label>
							<Input
								value={form.name}
								onChange={(e) =>
									setForm((f) => ({ ...f, name: e.target.value }))
								}
								className="mt-1 h-8 text-sm"
								placeholder="Касса стройки / Расчётный счёт"
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label className="text-xs">Тип</Label>
								<Select
									value={form.type}
									onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
								>
									<SelectTrigger className="mt-1 h-8 text-sm">
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
									<SelectTrigger className="mt-1 h-8 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{["KGS", "USD", "EUR", "RUB"].map((c) => (
											<SelectItem key={c} value={c}>
												{c}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						{form.type === "bank" && (
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label className="text-xs">Банк</Label>
									<Input
										value={form.bank}
										onChange={(e) =>
											setForm((f) => ({ ...f, bank: e.target.value }))
										}
										className="mt-1 h-8 text-sm"
										placeholder="Optima Bank"
									/>
								</div>
								<div>
									<Label className="text-xs">БИК</Label>
									<Input
										value={form.bik}
										onChange={(e) =>
											setForm((f) => ({ ...f, bik: e.target.value }))
										}
										className="mt-1 h-8 text-sm"
									/>
								</div>
								<div className="col-span-2">
									<Label className="text-xs">Расчётный счёт</Label>
									<Input
										value={form.accountNumber}
										onChange={(e) =>
											setForm((f) => ({ ...f, accountNumber: e.target.value }))
										}
										className="mt-1 h-8 text-sm font-mono"
									/>
								</div>
							</div>
						)}
						<div>
							<Label className="text-xs">Начальный остаток</Label>
							<Input
								type="number"
								value={form.openingBalance}
								onChange={(e) =>
									setForm((f) => ({ ...f, openingBalance: e.target.value }))
								}
								className="mt-1 h-8 text-sm"
							/>
						</div>
						<div className="flex gap-2 pt-2">
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => {
									setOpen(false);
									resetForm();
								}}
							>
								Отмена
							</Button>
							<Button
								className="flex-1 bg-amber-500 hover:bg-orange-600"
								disabled={createMut.isPending || !form.name}
								onClick={() =>
									createMut.mutate({
										...form,
										currentBalance: form.openingBalance,
									})
								}
							>
								{createMut.isPending ? "Сохранение..." : "Добавить счёт"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
