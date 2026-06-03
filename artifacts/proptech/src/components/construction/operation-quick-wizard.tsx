import { ArrowLeftRight, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CATEGORIES_INCOME = [
	"Платёж по договору",
	"Первоначальный взнос",
	"Аванс покупателя",
	"Инвестиции",
	"Прочие доходы",
];
const CATEGORIES_EXPENSE = [
	"Строительство",
	"Материалы",
	"Подрядчики",
	"OPEX",
	"Прочие расходы",
];

type OpType = "income" | "expense" | "transfer";

export type OperationQuickWizardProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	accounts: { id: number; name: string }[];
	projects: { id: number; name: string }[];
	counterparties?: { id: number; fullName: string }[];
	onSubmit: (payload: Record<string, unknown>) => void;
	isPending?: boolean;
	/** Быстрая операция с кнопки «Быстрая операция» или URL ?quick=income */
	initialType?: OpType;
};

const STEPS = ["Тип", "Сумма и счёт", "Детали"] as const;

export function OperationQuickWizard({
	open,
	onOpenChange,
	accounts,
	projects,
	counterparties = [],
	onSubmit,
	isPending,
	initialType = "expense",
}: OperationQuickWizardProps) {
	const [step, setStep] = useState(0);
	const [type, setType] = useState<OpType>(initialType);
	const [amount, setAmount] = useState("");
	const [currency, setCurrency] = useState("KGS");
	const [accountId, setAccountId] = useState("");
	const [fromAccountId, setFromAccountId] = useState("");
	const [toAccountId, setToAccountId] = useState("");
	const [category, setCategory] = useState("");
	const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [description, setDescription] = useState("");
	const [projectId, setProjectId] = useState("none");
	const [counterpartyId, setCounterpartyId] = useState("none");

	useEffect(() => {
		if (!open) return;
		setStep(0);
		setType(initialType);
		setAmount("");
		setCurrency("KGS");
		const first = accounts[0] ? String(accounts[0].id) : "";
		setAccountId(first);
		setFromAccountId(first);
		setToAccountId("");
		setCategory("");
		setDate(new Date().toISOString().slice(0, 10));
		setDescription("");
		setProjectId("none");
		setCounterpartyId("none");
	}, [open, accounts, initialType]);

	const categories = type === "income" ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;

	const canNextStep1 = Boolean(type);
	const canNextStep2 =
		parseFloat(amount || "0") > 0 &&
		(type === "transfer"
			? fromAccountId && toAccountId && fromAccountId !== toAccountId
			: Boolean(accountId));

	function buildPayload() {
		const cat =
			category ||
			(type === "transfer"
				? "Перевод между счетами"
				: type === "income"
					? "Прочие доходы"
					: "Прочие расходы");
		const payload: Record<string, unknown> = {
			type,
			category: cat,
			description: description.trim() || cat,
			date,
			amount,
			currency,
			exchangeRateSource: "НБКР",
			exchangeRate: "89",
			status: "approved",
			projectId: projectId !== "none" ? Number(projectId) : null,
		};
		if (type === "transfer") {
			payload.fromAccountId = Number(fromAccountId);
			payload.toAccountId = Number(toAccountId);
			payload.counterpartyId = null;
		} else {
			payload.accountId = Number(accountId);
			payload.counterpartyId =
				counterpartyId && counterpartyId !== "none"
					? Number(counterpartyId)
					: null;
		}
		return payload;
	}

	function handleFinish() {
		if (!description.trim()) return;
		onSubmit(buildPayload());
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Zap className="w-5 h-5 text-amber-500" />
						Быстрая операция
					</DialogTitle>
				</DialogHeader>

				<div className="flex gap-1 mb-4">
					{STEPS.map((label, i) => (
						<div
							key={label}
							className={cn(
								"flex-1 text-center text-[11px] py-1 rounded-md border",
								i === step
									? "bg-amber-50 border-amber-200 text-amber-800 font-medium"
									: i < step
										? "bg-emerald-50 border-emerald-100 text-emerald-700"
										: "bg-gray-50 border-gray-100 text-gray-400",
							)}
						>
							{i + 1}. {label}
						</div>
					))}
				</div>

				{step === 0 && (
					<div className="grid grid-cols-3 gap-2">
						{(
							[
								["income", "Приход", TrendingUp, "text-emerald-600 bg-emerald-50 border-emerald-200"],
								["expense", "Расход", TrendingDown, "text-rose-600 bg-rose-50 border-rose-200"],
								["transfer", "Перевод", ArrowLeftRight, "text-blue-600 bg-blue-50 border-blue-200"],
							] as const
						).map(([value, label, Icon, activeCls]) => (
							<button
								key={value}
								type="button"
								onClick={() => setType(value)}
								className={cn(
									"flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
									type === value ? activeCls : "border-gray-200 hover:border-gray-300",
								)}
							>
								<Icon className="w-6 h-6" />
								<span className="text-sm font-medium">{label}</span>
							</button>
						))}
					</div>
				)}

				{step === 1 && (
					<div className="space-y-4">
						<div>
							<Label className="text-xs text-gray-500">Сумма *</Label>
							<div className="flex gap-2 mt-1">
								<Input
									type="number"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									className="font-mono"
									placeholder="0"
									autoFocus
								/>
								<Select value={currency} onValueChange={setCurrency}>
									<SelectTrigger className="w-24">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="KGS">KGS</SelectItem>
										<SelectItem value="USD">USD</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						{type === "transfer" ? (
							<>
								<div>
									<Label className="text-xs text-gray-500">Со счёта *</Label>
									<Select value={fromAccountId} onValueChange={setFromAccountId}>
										<SelectTrigger className="mt-1">
											<SelectValue placeholder="Выберите счёт" />
										</SelectTrigger>
										<SelectContent>
											{accounts.map((a) => (
												<SelectItem key={a.id} value={String(a.id)}>
													{a.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label className="text-xs text-gray-500">На счёт *</Label>
									<Select value={toAccountId} onValueChange={setToAccountId}>
										<SelectTrigger className="mt-1">
											<SelectValue placeholder="Выберите счёт" />
										</SelectTrigger>
										<SelectContent>
											{accounts.map((a) => (
												<SelectItem key={a.id} value={String(a.id)}>
													{a.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</>
						) : (
							<div>
								<Label className="text-xs text-gray-500">Счёт *</Label>
								<Select value={accountId} onValueChange={setAccountId}>
									<SelectTrigger className="mt-1">
										<SelectValue placeholder="Выберите счёт" />
									</SelectTrigger>
									<SelectContent>
										{accounts.map((a) => (
											<SelectItem key={a.id} value={String(a.id)}>
												{a.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</div>
				)}

				{step === 2 && (
					<div className="space-y-4">
						{type !== "transfer" && (
							<div>
								<Label className="text-xs text-gray-500">Статья</Label>
								<Select value={category} onValueChange={setCategory}>
									<SelectTrigger className="mt-1">
										<SelectValue placeholder="Выберите статью" />
									</SelectTrigger>
									<SelectContent>
										{categories.map((c) => (
											<SelectItem key={c} value={c}>
												{c}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
						<div>
							<Label className="text-xs text-gray-500">Дата</Label>
							<Input
								type="date"
								value={date}
								onChange={(e) => setDate(e.target.value)}
								className="mt-1"
							/>
						</div>
						<div>
							<Label className="text-xs text-gray-500">Проект</Label>
							<Select value={projectId} onValueChange={setProjectId}>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Не привязан</SelectItem>
									{projects.map((p) => (
										<SelectItem key={p.id} value={String(p.id)}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{type !== "transfer" && counterparties.length > 0 && (
							<div>
								<Label className="text-xs text-gray-500">
									{type === "income" ? "Кто вносит" : "Кому / получатель"}
								</Label>
								<Select
									value={counterpartyId}
									onValueChange={setCounterpartyId}
								>
									<SelectTrigger className="mt-1">
										<SelectValue placeholder="Не указан" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Не указан</SelectItem>
										{counterparties.map((c) => (
											<SelectItem key={c.id} value={String(c.id)}>
												{c.fullName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
						<div>
							<Label className="text-xs text-gray-500">Описание *</Label>
							<Textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								className="mt-1 resize-none"
								rows={3}
								placeholder="Кратко: за что платёж"
							/>
						</div>
					</div>
				)}

				<div className="flex justify-between gap-2 pt-2">
					<Button
						type="button"
						variant="outline"
						disabled={step === 0 || isPending}
						onClick={() => setStep((s) => Math.max(0, s - 1))}
					>
						Назад
					</Button>
					{step < 2 ? (
						<Button
							type="button"
							className="bg-amber-500 hover:bg-amber-600"
							disabled={
								(step === 0 && !canNextStep1) || (step === 1 && !canNextStep2)
							}
							onClick={() => setStep((s) => s + 1)}
						>
							Далее
						</Button>
					) : (
						<Button
							type="button"
							className="bg-amber-500 hover:bg-amber-600"
							disabled={!description.trim() || isPending}
							onClick={handleFinish}
						>
							{isPending ? "Сохранение…" : "Сохранить"}
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
