import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
	buildPaymentSchedule,
	scheduleTotal,
	type ScheduleRow,
} from "@/lib/payment-schedule";
import { parseNum } from "@/lib/unit-pricing";

function fmt(n: number) {
	return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

function contractDefaultTotal(unit: UnitForSale): number {
	const fromTotal = parseNum(unit.totalPrice);
	if (fromTotal > 0) return Math.round(fromTotal);
	const fromList = parseNum(unit.listPrice);
	if (fromList > 0) return Math.round(fromList);
	const area = parseNum(unit.area);
	const pps = parseNum(unit.pricePerSqm);
	if (area > 0 && pps > 0) return Math.round(area * pps);
	return 0;
}

export type UnitForSale = {
	id: number;
	projectId: number;
	unitNumber: string;
	floor?: number;
	area?: string;
	pricePerSqm?: string;
	listPrice?: string;
	totalPrice?: string;
	currency?: string;
};

type SaleForm = {
	buyerName: string;
	buyerPhone: string;
	totalAmount: string;
	downPayment: string;
	installmentMonths: string;
	currency: string;
	contractDate: string;
	notes: string;
};

function emptySaleForm(unit: UnitForSale, defaultTotal: number): SaleForm {
	return {
		buyerName: "",
		buyerPhone: "",
		totalAmount: defaultTotal > 0 ? String(defaultTotal) : "",
		downPayment: "",
		installmentMonths: "12",
		currency: unit.currency || "KGS",
		contractDate: new Date().toISOString().slice(0, 10),
		notes: "",
	};
}

type Props = {
	open: boolean;
	unit: UnitForSale;
	unitStatus: "reserved" | "sold";
	onClose: () => void;
	onSaved: () => void;
};

export function UnitSaleDialog({
	open,
	unit,
	unitStatus,
	onClose,
	onSaved,
}: Props) {
	const { toast } = useToast();
	const [location, setLocation] = useLocation();
	const [loading, setLoading] = useState(false);
	const [flexible, setFlexible] = useState(false);
	const [manualSchedule, setManualSchedule] = useState<ScheduleRow[]>([]);
	const openedForUnitRef = useRef<number | null>(null);

	const [form, setForm] = useState<SaleForm>(() =>
		emptySaleForm(unit, contractDefaultTotal(unit)),
	);

	const set = (k: keyof SaleForm, v: string) =>
		setForm((p) => ({ ...p, [k]: v }));

	const total = parseNum(form.totalAmount);
	const down = parseNum(form.downPayment);
	const months = Math.max(0, parseInt(form.installmentMonths || "0", 10) || 0);
	const remaining = Math.max(0, total - down);

	useEffect(() => {
		if (!open) {
			openedForUnitRef.current = null;
			return;
		}
		if (openedForUnitRef.current === unit.id) return;
		openedForUnitRef.current = unit.id;
		const initialTotal = contractDefaultTotal(unit);
		setForm(emptySaleForm(unit, initialTotal));
		setFlexible(false);
		setManualSchedule([]);
	}, [open, unit.id, unit]);

	const autoSchedule = useMemo(() => {
		if (total <= 0) return [];
		return buildPaymentSchedule(
			total,
			down,
			months || 1,
			form.contractDate,
		);
	}, [total, down, months, form.contractDate]);

	const schedule = flexible ? manualSchedule : autoSchedule;

	const schedSum = scheduleTotal(schedule);
	const sumMismatch = total > 0 && Math.abs(schedSum - total) > 1;

	const updateScheduleRow = (
		index: number,
		field: "dueDate" | "amount",
		value: string,
	) => {
		setManualSchedule((rows) =>
			rows.map((r, i) =>
				i === index
					? {
							...r,
							[field]:
								field === "amount"
									? Math.round(parseNum(value))
									: value,
						}
					: r,
			),
		);
	};

	const onFlexibleChange = (checked: boolean) => {
		setFlexible(checked);
		if (checked) {
			setManualSchedule(autoSchedule);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.buyerName.trim()) {
			toast({ title: "Укажите ФИО покупателя", variant: "destructive" });
			return;
		}
		if (total <= 0) {
			toast({ title: "Укажите сумму договора", variant: "destructive" });
			return;
		}
		if (sumMismatch) {
			toast({
				title: "Сумма графика не совпадает с договором",
				description: `График: ${fmt(schedSum)}, договор: ${fmt(total)}`,
				variant: "destructive",
			});
			return;
		}

		setLoading(true);
		try {
			const { data } = await api.post<{
				contract: { id: number; contractNumber: string };
			}>("/construction/contracts-sales/from-unit", {
				unitId: unit.id,
				projectId: unit.projectId,
				unitStatus,
				buyerName: form.buyerName.trim(),
				buyerPhone: form.buyerPhone.trim() || null,
				totalAmount: total,
				downPayment: down,
				installmentMonths: months,
				currency: form.currency,
				contractDate: form.contractDate,
				notes: form.notes || null,
				schedule,
			});

			toast({
				title:
					unitStatus === "reserved"
						? "Бронь оформлена"
						: "Продажа оформлена",
				description: `Договор ${data.contract.contractNumber} на утверждении`,
			});
			onSaved();
			onClose();
			const contractsBase = location.startsWith("/crm")
				? "/crm/contracts-sales"
				: "/construction/contracts-sales";
			setLocation(
				`${contractsBase}?highlight=${data.contract.id}&status=review`,
			);
		} catch (err: unknown) {
			toast({
				title: "Ошибка",
				description: err instanceof Error ? err.message : "Не удалось сохранить",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const title =
		unitStatus === "reserved"
			? `Бронь — кв. ${unit.unitNumber}`
			: `Продажа — кв. ${unit.unitNumber}`;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="max-w-2xl w-[min(42rem,95vw)] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						Заполните данные покупателя и график платежей. После сохранения
						откроется раздел «Договоры» со статусом «На утверждение».
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-5">
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">ФИО покупателя *</Label>
							<Input
								className="mt-auto"
								value={form.buyerName}
								onChange={(e) => set("buyerName", e.target.value)}
								required
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Телефон</Label>
							<Input
								className="mt-auto"
								value={form.buyerPhone}
								onChange={(e) => set("buyerPhone", e.target.value)}
								placeholder="+996 ..."
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="flex flex-col gap-1.5">
							<Label>Сумма договора *</Label>
							<Input
								type="number"
								min="0"
								step="1"
								className="tabular-nums"
								value={form.totalAmount}
								onChange={(e) => set("totalAmount", e.target.value)}
								required
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>Первоначальный взнос</Label>
							<Input
								type="number"
								min="0"
								step="1"
								className="tabular-nums"
								value={form.downPayment}
								onChange={(e) => set("downPayment", e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>Рассрочка (мес.)</Label>
							<Input
								type="number"
								min="0"
								step="1"
								className="tabular-nums"
								value={form.installmentMonths}
								onChange={(e) => set("installmentMonths", e.target.value)}
								disabled={flexible}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>Дата договора</Label>
							<Input
								type="date"
								value={form.contractDate}
								onChange={(e) => set("contractDate", e.target.value)}
							/>
						</div>
					</div>

					<div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-center sm:text-left">
						<div>
							<div className="text-xs text-gray-500">Остаток в рассрочку</div>
							<div className="font-bold text-amber-700 tabular-nums">
								{fmt(remaining)} {form.currency}
							</div>
						</div>
						<div>
							<div className="text-xs text-gray-500">Платежей в графике</div>
							<div className="font-bold">{schedule.length}</div>
						</div>
						<div>
							<div className="text-xs text-gray-500">Сумма графика</div>
							<div
								className={`font-bold tabular-nums ${sumMismatch ? "text-red-600" : "text-emerald-600"}`}
							>
								{fmt(schedSum)} {form.currency}
							</div>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<Label className="font-medium">Гибкий график (редактировать вручную)</Label>
						<Switch checked={flexible} onCheckedChange={onFlexibleChange} />
					</div>

					<div className="border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
						<Table>
							<TableHeader className="sticky top-0 z-10 bg-background">
								<TableRow>
									<TableHead className="w-10">№</TableHead>
									<TableHead className="min-w-[8rem]">Назначение</TableHead>
									<TableHead className="min-w-[9rem]">Дата</TableHead>
									<TableHead className="text-right min-w-[7rem]">Сумма</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{schedule.length === 0 ? (
									<TableRow>
										<TableCell colSpan={4} className="text-center text-muted-foreground py-6">
											Укажите сумму договора для расчёта графика
										</TableCell>
									</TableRow>
								) : (
									schedule.map((row, idx) => (
										<TableRow key={idx}>
											<TableCell className="text-xs text-muted-foreground">
												{row.installmentNumber === 0 ? "—" : row.installmentNumber}
											</TableCell>
											<TableCell className="text-sm whitespace-nowrap">
												{row.label || "Платёж"}
											</TableCell>
											<TableCell>
												{flexible ? (
													<Input
														type="date"
														className="h-8 text-xs"
														value={row.dueDate}
														onChange={(e) =>
															updateScheduleRow(idx, "dueDate", e.target.value)
														}
													/>
												) : (
													<span className="text-sm tabular-nums">{row.dueDate}</span>
												)}
											</TableCell>
											<TableCell className="text-right">
												{flexible ? (
													<Input
														type="number"
														min="0"
														step="1"
														className="h-8 text-xs text-right tabular-nums"
														value={row.amount}
														onChange={(e) =>
															updateScheduleRow(idx, "amount", e.target.value)
														}
													/>
												) : (
													<span className="text-sm font-medium tabular-nums">
														{fmt(row.amount)}
													</span>
												)}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>

					{sumMismatch && (
						<p className="text-sm text-red-600">
							Сумма строк графика должна равняться сумме договора. Включите
							гибкий график и скорректируйте платежи.
						</p>
					)}

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose} disabled={loading}>
							Отмена
						</Button>
						<Button
							type="submit"
							className="bg-amber-500 hover:bg-orange-600"
							disabled={loading || sumMismatch}
						>
							{loading ? "Сохранение..." : "Сохранить и открыть договоры"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
