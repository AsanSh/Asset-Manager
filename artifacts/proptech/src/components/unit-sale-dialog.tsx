import { useEffect, useMemo, useState } from "react";
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

function fmt(n: number) {
	return new Intl.NumberFormat("ru-RU").format(n);
}

export type UnitForSale = {
	id: number;
	projectId: number;
	unitNumber: string;
	floor?: number;
	area?: string;
	pricePerSqm?: string;
	totalPrice?: string;
	currency?: string;
};

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
	const [, setLocation] = useLocation();
	const [loading, setLoading] = useState(false);
	const [flexible, setFlexible] = useState(false);
	const [schedule, setSchedule] = useState<ScheduleRow[]>([]);

	const defaultTotal = useMemo(() => {
		const tp = parseFloat(unit.totalPrice || "0");
		if (tp > 0) return tp;
		const area = parseFloat(unit.area || "0");
		const pps = parseFloat(unit.pricePerSqm || "0");
		return area * pps;
	}, [unit]);

	const [form, setForm] = useState({
		buyerName: "",
		buyerPhone: "",
		totalAmount: String(Math.round(defaultTotal) || ""),
		downPayment: "",
		installmentMonths: "12",
		currency: unit.currency || "KGS",
		contractDate: new Date().toISOString().slice(0, 10),
		notes: "",
	});

	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	const total = parseFloat(form.totalAmount || "0");
	const down = parseFloat(form.downPayment || "0");
	const months = parseInt(form.installmentMonths || "0", 10);
	const remaining = Math.max(0, total - down);

	useEffect(() => {
		if (!open) return;
		setForm((f) => ({
			...f,
			totalAmount: String(Math.round(defaultTotal) || f.totalAmount),
			currency: unit.currency || "KGS",
		}));
	}, [open, defaultTotal, unit.currency]);

	useEffect(() => {
		if (flexible) return;
		if (total <= 0) {
			setSchedule([]);
			return;
		}
		setSchedule(
			buildPaymentSchedule(total, down, months || 1, form.contractDate),
		);
	}, [flexible, total, down, months, form.contractDate]);

	const schedSum = scheduleTotal(schedule);
	const sumMismatch = total > 0 && Math.abs(schedSum - total) > 1;

	const updateScheduleRow = (
		index: number,
		field: "dueDate" | "amount",
		value: string,
	) => {
		setSchedule((rows) =>
			rows.map((r, i) =>
				i === index
					? {
							...r,
							[field]: field === "amount" ? Math.round(parseFloat(value) || 0) : value,
						}
					: r,
			),
		);
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
			setLocation(
				`/construction/contracts-sales?highlight=${data.contract.id}&status=review`,
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
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						Заполните данные покупателя и график платежей. После сохранения
						откроется раздел «Договоры» со статусом «На утверждение».
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-5">
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>ФИО покупателя *</Label>
							<Input
								className="mt-1"
								value={form.buyerName}
								onChange={(e) => set("buyerName", e.target.value)}
								required
							/>
						</div>
						<div>
							<Label>Телефон</Label>
							<Input
								className="mt-1"
								value={form.buyerPhone}
								onChange={(e) => set("buyerPhone", e.target.value)}
								placeholder="+996 ..."
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						<div>
							<Label>Сумма договора *</Label>
							<Input
								type="number"
								className="mt-1"
								value={form.totalAmount}
								onChange={(e) => set("totalAmount", e.target.value)}
								required
							/>
						</div>
						<div>
							<Label>Первоначальный взнос</Label>
							<Input
								type="number"
								className="mt-1"
								value={form.downPayment}
								onChange={(e) => set("downPayment", e.target.value)}
							/>
						</div>
						<div>
							<Label>Рассрочка (мес.)</Label>
							<Input
								type="number"
								min="0"
								className="mt-1"
								value={form.installmentMonths}
								onChange={(e) => set("installmentMonths", e.target.value)}
								disabled={flexible}
							/>
						</div>
						<div>
							<Label>Дата договора</Label>
							<Input
								type="date"
								className="mt-1"
								value={form.contractDate}
								onChange={(e) => set("contractDate", e.target.value)}
							/>
						</div>
					</div>

					<div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm grid grid-cols-3 gap-2 text-center">
						<div>
							<div className="text-xs text-gray-500">Остаток в рассрочку</div>
							<div className="font-bold text-amber-700">{fmt(remaining)}</div>
						</div>
						<div>
							<div className="text-xs text-gray-500">Платежей в графике</div>
							<div className="font-bold">{schedule.length}</div>
						</div>
						<div>
							<div className="text-xs text-gray-500">Сумма графика</div>
							<div
								className={`font-bold ${sumMismatch ? "text-red-600" : "text-emerald-600"}`}
							>
								{fmt(schedSum)} {form.currency}
							</div>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<Label className="font-medium">Гибкий график (редактировать вручную)</Label>
						<Switch checked={flexible} onCheckedChange={setFlexible} />
					</div>

					<div className="border rounded-lg overflow-hidden">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-8">№</TableHead>
									<TableHead>Назначение</TableHead>
									<TableHead>Дата</TableHead>
									<TableHead className="text-right">Сумма</TableHead>
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
											<TableCell className="text-sm">
												{row.label || "Платёж"}
											</TableCell>
											<TableCell>
												<Input
													type="date"
													className="h-8 text-xs"
													value={row.dueDate}
													disabled={!flexible}
													onChange={(e) =>
														updateScheduleRow(idx, "dueDate", e.target.value)
													}
												/>
											</TableCell>
											<TableCell>
												<Input
													type="number"
													className="h-8 text-xs text-right"
													value={row.amount}
													disabled={!flexible}
													onChange={(e) =>
														updateScheduleRow(idx, "amount", e.target.value)
													}
												/>
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
