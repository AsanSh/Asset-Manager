import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	CheckCircle2,
	DollarSign,
	Receipt,
	Search,
	User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

function fmt(n: any) {
	const v = parseFloat(n);
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-RU").format(v);
}

export default function ConstructionCashier() {
	const qc = useQueryClient();
	const [search, setSearch] = useState("");
	const [selectedContract, setSelectedContract] = useState<any>(null);
	const [selectedAccrual, setSelectedAccrual] = useState<string>("none");
	const [paymentForm, setPaymentForm] = useState({
		amount: "",
		currency: "KGS",
		exchangeRate: "1",
		paymentMethod: "cash",
		accountId: "",
		date: new Date().toISOString().slice(0, 10),
		notes: "",
	});
	const [success, setSuccess] = useState<any>(null);

	const { data: contracts = [] } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => r.data),
	});
	const { data: accruals = [] } = useQuery({
		queryKey: ["construction-accruals"],
		queryFn: () => api.get("/construction/accruals").then((r) => r.data),
	});
	const { data: accounts = [] } = useQuery({
		queryKey: ["construction-accounts"],
		queryFn: () => api.get("/construction/accounts").then((r) => r.data),
	});
	const { data: operations = [] } = useQuery({
		queryKey: ["construction-operations"],
		queryFn: () => api.get("/construction/operations").then((r) => r.data),
	});

	const contractPayments = (Array.isArray(operations) ? operations : [])
		.filter(
			(op: any) =>
				op.type === "income" &&
				op.category === "Платеж по договору" &&
				op.status !== "cancelled",
		)
		.slice(0, 30);

	const payMut = useMutation({
		mutationFn: (data: any) =>
			api.post("/construction/cashier/payment", data).then((r) => r.data),
		onSuccess: (data) => {
			qc.invalidateQueries({ queryKey: ["construction-accruals"] });
			qc.invalidateQueries({ queryKey: ["construction-contracts-sales"] });
			qc.invalidateQueries({ queryKey: ["construction-operations"] });
			setSuccess(data);
			toast.success("Платёж принят и записан");
		},
		onError: () => toast.error("Ошибка при проведении платежа"),
	});

	const filteredContracts = contracts.filter(
		(c: any) =>
			c.status !== "completed" &&
			c.status !== "cancelled" &&
			(!search ||
				c.buyerName?.toLowerCase().includes(search.toLowerCase()) ||
				c.contractNumber?.toLowerCase().includes(search.toLowerCase())),
	);

	const contractAccruals = selectedContract
		? accruals.filter(
				(a: any) => a.contractId === selectedContract.id && a.status !== "paid",
			)
		: [];

	function selectContract(c: any) {
		setSelectedContract(c);
		setSelectedAccrual("none");
		setSuccess(null);
		if (c.remainingAmount) {
			const upcoming = accruals
				.filter((a: any) => a.contractId === c.id && a.status !== "paid")
				.sort((a: any, b: any) => a.dueDate.localeCompare(b.dueDate))[0];
			if (upcoming) {
				setSelectedAccrual(String(upcoming.id));
				setPaymentForm((f) => ({
					...f,
					amount: String(
						parseFloat(upcoming.remainingAmount || upcoming.amount || "0"),
					),
				}));
			}
		}
	}

	function handlePay() {
		if (!selectedContract) return;
		payMut.mutate({
			contractId: selectedContract.id,
			projectId: selectedContract.projectId,
			accrualId: selectedAccrual !== "none" ? Number(selectedAccrual) : null,
			amount: paymentForm.amount,
			currency: paymentForm.currency,
			exchangeRate: paymentForm.exchangeRate,
			accountId:
				paymentForm.accountId && paymentForm.accountId !== "none"
					? Number(paymentForm.accountId)
					: null,
			paymentMethod: paymentForm.paymentMethod,
			date: paymentForm.date,
			notes: paymentForm.notes,
		});
	}

	const amountKgs =
		paymentForm.currency === "KGS"
			? parseFloat(paymentForm.amount || "0")
			: parseFloat(paymentForm.amount || "0") *
				parseFloat(paymentForm.exchangeRate || "1");

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Приём платежей (Касса)
					</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Принять оплату от покупателя и выдать квитанцию
					</p>
				</div>
			</div>

			<div className="grid grid-cols-12 gap-6">
				{/* Left: Contract list */}
				<div className="col-span-5">
					<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
						<div className="text-sm font-semibold text-gray-700 mb-3">
							1. Выберите договор
						</div>
						<div className="relative mb-3">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
							<Input
								className="pl-9 h-8 text-sm"
								placeholder="Поиск покупателя или №..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						<div className="space-y-2 max-h-96 overflow-y-auto">
							{filteredContracts.length === 0 ? (
								<div className="text-center py-8 text-gray-400 text-sm">
									Нет активных договоров
								</div>
							) : (
								filteredContracts.map((c: any) => {
									const isSelected = selectedContract?.id === c.id;
									const pendingAcc = accruals.filter(
										(a: any) => a.contractId === c.id && a.status !== "paid",
									);
									const hasOverdue = pendingAcc.some(
										(a: any) => new Date(a.dueDate) < new Date(),
									);
									return (
										<div
											key={c.id}
											onClick={() => selectContract(c)}
											className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "border-orange-400 bg-amber-50" : "border-gray-100 hover:border-amber-200 hover:bg-amber-50/30"}`}
										>
											<div className="flex items-center justify-between">
												<div className="font-mono text-xs font-semibold text-amber-600">
													{c.contractNumber}
												</div>
												{hasOverdue && (
													<AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
												)}
											</div>
											<div className="font-medium text-sm mt-0.5">
												{c.buyerName}
											</div>
											<div className="flex items-center justify-between mt-1 text-xs text-gray-500">
												<span>
													Остаток:{" "}
													<strong className="text-amber-600">
														{fmt(c.remainingAmount)}
													</strong>{" "}
													{c.currency}
												</span>
												<span>{pendingAcc.length} платежей</span>
											</div>
										</div>
									);
								})
							)}
						</div>
					</div>
				</div>

				{/* Right: Payment form */}
				<div className="col-span-7">
					{!selectedContract ? (
						<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
							<User className="w-12 h-12 mx-auto mb-3 text-gray-200" />
							<p>Выберите договор слева для приёма платежа</p>
						</div>
					) : success ? (
						<div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-8 text-center">
							<CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
							<div className="text-xl font-bold text-gray-900 mb-2">
								Платёж принят!
							</div>
							<div className="text-gray-500 text-sm mb-4">
								Операция записана в реестр
							</div>
							<div className="bg-gray-50 rounded-xl p-4 text-left text-sm space-y-2 mb-6">
								<div className="flex justify-between">
									<span className="text-gray-500">Договор:</span>
									<span className="font-medium">
										{selectedContract.contractNumber}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">Покупатель:</span>
									<span className="font-medium">
										{selectedContract.buyerName}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">Сумма:</span>
									<span className="font-bold text-emerald-600">
										{fmt(paymentForm.amount)} {paymentForm.currency}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">Дата:</span>
									<span>{paymentForm.date}</span>
								</div>
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									className="flex-1"
									onClick={() => {
										setSuccess(null);
										setSelectedContract(null);
										setSearch("");
									}}
								>
									Новый платёж
								</Button>
								<Button
									className="flex-1 bg-amber-500 hover:bg-orange-600"
									onClick={() => window.print()}
								>
									<Receipt className="w-4 h-4 mr-2" /> Распечатать квитанцию
								</Button>
							</div>
						</div>
					) : (
						<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
							<div className="text-sm font-semibold text-gray-700">
								2. Оформить платёж
							</div>

							{/* Contract info */}
							<div className="bg-amber-50 rounded-xl p-3 text-sm grid grid-cols-3 gap-2 text-center">
								<div>
									<div className="text-xs text-gray-500">Сумма договора</div>
									<div className="font-bold">
										{fmt(selectedContract.totalAmount)}{" "}
										{selectedContract.currency}
									</div>
								</div>
								<div>
									<div className="text-xs text-gray-500">Оплачено</div>
									<div className="font-bold text-emerald-600">
										{fmt(selectedContract.paidAmount)}
									</div>
								</div>
								<div>
									<div className="text-xs text-gray-500">Остаток</div>
									<div className="font-bold text-amber-600">
										{fmt(selectedContract.remainingAmount)}
									</div>
								</div>
							</div>

							{/* Accrual selection */}
							{contractAccruals.length > 0 && (
								<div>
									<Label className="text-xs">Начисление</Label>
									<Select
										value={selectedAccrual}
										onValueChange={(v) => {
											setSelectedAccrual(v);
											if (v !== "none") {
												const acc = accruals.find(
													(a: any) => a.id === Number(v),
												);
												if (acc)
													setPaymentForm((f) => ({
														...f,
														amount: String(
															parseFloat(acc.remainingAmount || acc.amount),
														),
													}));
											}
										}}
									>
										<SelectTrigger className="mt-1 h-8 text-sm">
											<SelectValue placeholder="Выберите начисление" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">
												Без привязки к начислению
											</SelectItem>
											{contractAccruals.map((a: any) => (
												<SelectItem key={a.id} value={String(a.id)}>
													Платёж №{a.installmentNumber} — {a.dueDate} —{" "}
													{fmt(a.remainingAmount)} {a.currency}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}

							<div className="grid grid-cols-3 gap-3">
								<div>
									<Label className="text-xs">Сумма *</Label>
									<Input
										type="number"
										value={paymentForm.amount}
										onChange={(e) =>
											setPaymentForm((f) => ({ ...f, amount: e.target.value }))
										}
										className="mt-1 h-8 text-sm"
									/>
								</div>
								<div>
									<Label className="text-xs">Валюта</Label>
									<Select
										value={paymentForm.currency}
										onValueChange={(v) =>
											setPaymentForm((f) => ({ ...f, currency: v }))
										}
									>
										<SelectTrigger className="mt-1 h-8 text-sm">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{["KGS", "USD", "EUR"].map((c) => (
												<SelectItem key={c} value={c}>
													{c}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								{paymentForm.currency !== "KGS" && (
									<div>
										<Label className="text-xs">Курс</Label>
										<Input
											type="number"
											value={paymentForm.exchangeRate}
											onChange={(e) =>
												setPaymentForm((f) => ({
													...f,
													exchangeRate: e.target.value,
												}))
											}
											className="mt-1 h-8 text-sm"
										/>
									</div>
								)}
							</div>

							{paymentForm.currency !== "KGS" && (
								<div className="bg-blue-50 rounded px-3 py-1.5 text-xs text-blue-700">
									Итого KGS: <strong>{fmt(amountKgs)}</strong>
								</div>
							)}

							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label className="text-xs">Способ оплаты</Label>
									<Select
										value={paymentForm.paymentMethod}
										onValueChange={(v) =>
											setPaymentForm((f) => ({ ...f, paymentMethod: v }))
										}
									>
										<SelectTrigger className="mt-1 h-8 text-sm">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="cash">Наличные</SelectItem>
											<SelectItem value="transfer">Перевод</SelectItem>
											<SelectItem value="card">Карта</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label className="text-xs">Счёт зачисления</Label>
									<Select
										value={paymentForm.accountId}
										onValueChange={(v) =>
											setPaymentForm((f) => ({ ...f, accountId: v }))
										}
									>
										<SelectTrigger className="mt-1 h-8 text-sm">
											<SelectValue placeholder="Выберите счёт" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Не указывать</SelectItem>
											{accounts.map((a: any) => (
												<SelectItem key={a.id} value={String(a.id)}>
													{a.name} ({a.currency})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							<div>
								<Label className="text-xs">Дата</Label>
								<Input
									type="date"
									value={paymentForm.date}
									onChange={(e) =>
										setPaymentForm((f) => ({ ...f, date: e.target.value }))
									}
									className="mt-1 h-8 text-sm"
								/>
							</div>

							<div>
								<Label className="text-xs">Примечание</Label>
								<Textarea
									value={paymentForm.notes}
									onChange={(e) =>
										setPaymentForm((f) => ({ ...f, notes: e.target.value }))
									}
									className="mt-1 text-sm resize-none"
									rows={2}
								/>
							</div>

							<Button
								className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-base font-medium"
								disabled={
									payMut.isPending ||
									!paymentForm.amount ||
									parseFloat(paymentForm.amount) <= 0
								}
								onClick={handlePay}
							>
								<DollarSign className="w-5 h-5 mr-2" />
								{payMut.isPending
									? "Проведение платежа..."
									: `Принять ${fmt(paymentForm.amount)} ${paymentForm.currency}`}
							</Button>
						</div>
					)}
				</div>
			</div>

			<div className="mt-8 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
					<div>
						<div className="text-sm font-semibold text-gray-900">
							Принятые платежи
						</div>
						<div className="text-xs text-gray-500">
							Из кассы и из раздела «Начисления»
						</div>
					</div>
					<span className="text-xs text-gray-400">
						{contractPayments.length} записей
					</span>
				</div>
				{contractPayments.length === 0 ? (
					<div className="text-center py-10 text-gray-400 text-sm">
						Платежей пока нет
					</div>
				) : (
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-gray-50 border-b border-gray-100">
								<th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">
									Дата
								</th>
								<th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">
									Договор
								</th>
								<th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">
									Описание
								</th>
								<th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">
									Сумма
								</th>
							</tr>
						</thead>
						<tbody>
							{contractPayments.map((op: any) => {
								const c = contracts.find(
									(x: any) => x.id === op.contractId,
								);
								return (
									<tr
										key={op.id}
										className="border-b border-gray-50 hover:bg-gray-50/50"
									>
										<td className="px-4 py-2.5 text-gray-600">{op.date}</td>
										<td className="px-4 py-2.5">
											<div className="font-mono text-xs text-amber-600">
												{c?.contractNumber || `#${op.contractId}`}
											</div>
											<div className="text-xs text-gray-400">
												{c?.buyerName}
											</div>
										</td>
										<td className="px-4 py-2.5 text-gray-600 text-xs max-w-xs truncate">
											{op.description}
											{op.notes ? ` · ${op.notes}` : ""}
										</td>
										<td className="px-4 py-2.5 text-right font-mono font-medium text-emerald-600">
											{fmt(op.amount)} {op.currency}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
