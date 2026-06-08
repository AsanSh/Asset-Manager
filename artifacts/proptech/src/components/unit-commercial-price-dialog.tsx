import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { parseNum } from "@/lib/unit-pricing";

export interface CommercialPriceUnit {
	id: number;
	unitNumber: string;
	area?: string | null;
	priceCoefficient?: string | null;
	priceApproved?: boolean;
	currency?: string;
}

export interface CommercialPriceProject {
	id: number;
	baseSalePricePerSqm?: string | null;
	costPerSqm?: string | null;
	currency?: string;
}

function fmtMoney(v: number) {
	if (!Number.isFinite(v) || v <= 0) return "—";
	return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(v);
}

function currencyLabel(currency?: string) {
	return currency === "USD" ? "USD" : "сом";
}

export function UnitCommercialPriceDialog({
	unit,
	project,
	open,
	onClose,
	onSaved,
}: {
	unit: CommercialPriceUnit | null;
	project: CommercialPriceProject | null;
	open: boolean;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const [basePrice, setBasePrice] = useState("");
	const [coefficient, setCoefficient] = useState("1");
	const [areaSqm, setAreaSqm] = useState("");
	const [activeForSale, setActiveForSale] = useState(true);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open || !unit || !project) return;
		const base =
			project.baseSalePricePerSqm ||
			project.costPerSqm ||
			"";
		setBasePrice(base ? String(base) : "");
		setCoefficient(unit.priceCoefficient || "1");
		setAreaSqm(unit.area ? String(unit.area) : "");
		setActiveForSale(unit.priceApproved ?? true);
	}, [open, unit, project]);

	const area = parseNum(areaSqm);
	const base = parseNum(basePrice);
	const coef = parseNum(coefficient) || 1;
	const approvedPerSqm = base > 0 ? base * coef : 0;
	const total = area > 0 && approvedPerSqm > 0 ? area * approvedPerSqm : 0;
	const moneyUnit = currencyLabel(unit?.currency || project?.currency);

	const areaHint = useMemo(() => {
		if (area > 0) return null;
		return "Укажите площадь — без неё итог по объекту не считается.";
	}, [area]);

	const handleSave = async () => {
		if (!unit?.id || !project?.id) return;
		if (area <= 0) {
			toast({
				title: "Укажите площадь, м²",
				variant: "destructive",
			});
			return;
		}
		if (base <= 0) {
			toast({
				title: "Укажите базовую цену за м²",
				variant: "destructive",
			});
			return;
		}
		if (coef <= 0) {
			toast({
				title: "Коэффициент должен быть больше нуля",
				variant: "destructive",
			});
			return;
		}
		setLoading(true);
		try {
			await api.put(`/construction/units/${unit.id}/commercial-price`, {
				baseSalePricePerSqm: base,
				priceCoefficient: coef,
				area,
				activeForSale,
			});
			toast({ title: activeForSale ? "Цена сохранена и утверждена" : "Цена сохранена" });
			onSaved();
			onClose();
		} catch (err: unknown) {
			toast({
				title: getApiErrorMessage(err, "Не удалось сохранить цену"),
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	if (!unit) return null;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Коммерческая цена · {unit.unitNumber}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="flex flex-col">
						<Label className="text-xs">Площадь, м²</Label>
						<Input
							type="number"
							min="0.01"
							step="0.01"
							className="mt-1"
							placeholder="Например, 65.4"
							value={areaSqm}
							onChange={(e) => setAreaSqm(e.target.value)}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col">
							<Label className="text-xs">Базовая цена за м²</Label>
							<Input
								type="number"
								min="0"
								step="1"
								className="mt-1"
								value={basePrice}
								onChange={(e) => setBasePrice(e.target.value)}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="text-xs">Коэффициент</Label>
							<Input
								type="number"
								min="0.01"
								step="0.01"
								className="mt-1"
								value={coefficient}
								onChange={(e) => setCoefficient(e.target.value)}
							/>
						</div>
					</div>

					<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 text-sm">
						<div className="flex justify-between gap-2">
							<span className="text-slate-600">Утверждённая цена за м²</span>
							<span className="font-semibold tabular-nums">
								{approvedPerSqm > 0
									? `${fmtMoney(approvedPerSqm)} ${moneyUnit}`
									: `— ${moneyUnit}`}
							</span>
						</div>
						<div className="flex justify-between gap-2">
							<span className="text-slate-600">Итого по объекту</span>
							<span className="font-semibold tabular-nums">
								{total > 0
									? `${fmtMoney(total)} ${moneyUnit}`
									: `— ${moneyUnit}`}
							</span>
						</div>
						{areaHint && (
							<p className="text-xs text-amber-700">{areaHint}</p>
						)}
					</div>

					<label className="flex items-start gap-2 cursor-pointer">
						<Checkbox
							checked={activeForSale}
							onCheckedChange={(v) => setActiveForSale(v === true)}
						/>
						<span className="text-sm leading-snug">
							Показывать продажникам как активный объект для продажи
						</span>
					</label>

					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={loading}
						>
							Отмена
						</Button>
						<Button type="button" onClick={handleSave} disabled={loading}>
							{loading ? "..." : "Сохранить"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
