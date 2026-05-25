import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export type PeriodPreset =
	| "today"
	| "yesterday"
	| "week"
	| "month"
	| "quarter"
	| "year"
	| "custom";

export interface PeriodValue {
	preset: PeriodPreset;
	from: string; // YYYY-MM-DD
	to: string; // YYYY-MM-DD
}

const PRESET_LABELS: { key: PeriodPreset; label: string }[] = [
	{ key: "today", label: "Сегодня" },
	{ key: "yesterday", label: "Вчера" },
	{ key: "week", label: "Неделя" },
	{ key: "month", label: "Месяц" },
	{ key: "quarter", label: "Квартал" },
	{ key: "year", label: "Год" },
	{ key: "custom", label: "Выборочно" },
];

const MONTH_NAMES_FULL = [
	"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
	"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function iso(d: Date): string {
	return d.toISOString().slice(0, 10);
}

/** Возвращает диапазон дат [from, to] для пресета. */
export function getPresetRange(preset: PeriodPreset, now = new Date()): {
	from: string;
	to: string;
} {
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	switch (preset) {
		case "today":
			return { from: iso(today), to: iso(today) };
		case "yesterday": {
			const y = new Date(today);
			y.setDate(y.getDate() - 1);
			return { from: iso(y), to: iso(y) };
		}
		case "week": {
			const start = new Date(today);
			start.setDate(start.getDate() - 6);
			return { from: iso(start), to: iso(today) };
		}
		case "month": {
			const start = new Date(now.getFullYear(), now.getMonth(), 1);
			const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
			return { from: iso(start), to: iso(end) };
		}
		case "quarter": {
			const q = Math.floor(now.getMonth() / 3);
			const start = new Date(now.getFullYear(), q * 3, 1);
			const end = new Date(now.getFullYear(), q * 3 + 3, 0);
			return { from: iso(start), to: iso(end) };
		}
		case "year": {
			const start = new Date(now.getFullYear(), 0, 1);
			const end = new Date(now.getFullYear(), 11, 31);
			return { from: iso(start), to: iso(end) };
		}
		default:
			return { from: iso(today), to: iso(today) };
	}
}

/** Дефолтное значение — текущий месяц. */
export function defaultPeriod(): PeriodValue {
	return { preset: "month", ...getPresetRange("month") };
}

/** Проверяет, попадает ли дата (строка YYYY-MM-DD или ISO) в диапазон. */
export function inPeriod(dateStr: string | null | undefined, p: PeriodValue): boolean {
	if (!dateStr) return false;
	const d = dateStr.slice(0, 10);
	return d >= p.from && d <= p.to;
}

function getLabel(p: PeriodValue): string {
	switch (p.preset) {
		case "today": return "Сегодня";
		case "yesterday": return "Вчера";
		case "week": return "7 дней";
		case "month": {
			const d = new Date(p.from + "T00:00:00");
			return `${MONTH_NAMES_FULL[d.getMonth()]} ${d.getFullYear()}`;
		}
		case "quarter": {
			const d = new Date(p.from + "T00:00:00");
			return `Кв. ${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
		}
		case "year": {
			const d = new Date(p.from + "T00:00:00");
			return `${d.getFullYear()} год`;
		}
		case "custom": {
			const fmt = (s: string) => s.slice(8, 10) + "." + s.slice(5, 7);
			return p.from && p.to ? `${fmt(p.from)}–${fmt(p.to)}` : "Выборочно";
		}
		default: return "Период";
	}
}

export function PeriodPicker({
	value,
	onChange,
	className,
}: {
	value: PeriodValue;
	onChange: (v: PeriodValue) => void;
	className?: string;
}) {
	const [open, setOpen] = useState(false);

	const selectPreset = (preset: PeriodPreset) => {
		if (preset === "custom") {
			onChange({ ...value, preset: "custom" });
			// Keep popover open for date inputs
		} else {
			onChange({ preset, ...getPresetRange(preset) });
			setOpen(false);
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${className || ""}`}
				>
					<CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
					<span className="font-medium">{getLabel(value)}</span>
					<ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-48 p-1" align="start">
				<div>
					{PRESET_LABELS.map(({ key, label }) => (
						<button
							key={key}
							type="button"
							onClick={() => selectPreset(key)}
							className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
								value.preset === key
									? "bg-primary text-primary-foreground font-medium"
									: "hover:bg-accent text-gray-700"
							}`}
						>
							{label}
						</button>
					))}
				</div>
				{value.preset === "custom" && (
					<div className="border-t mt-1 pt-2 space-y-1.5 px-1 pb-1">
						<Input
							type="date"
							value={value.from}
							max={value.to || undefined}
							onChange={(e) =>
								onChange({ ...value, preset: "custom", from: e.target.value })
							}
							className="h-7 text-xs"
						/>
						<Input
							type="date"
							value={value.to}
							min={value.from || undefined}
							onChange={(e) =>
								onChange({ ...value, preset: "custom", to: e.target.value })
							}
							className="h-7 text-xs"
						/>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
