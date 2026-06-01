/**
 * AM DateRangePicker — единый компонент выбора диапазона дат.
 *
 * Замена для старого PeriodPicker. Backward-compatible:
 * принимает и возвращает то же PeriodValue.
 *
 * UX-улучшения:
 * - Trigger показывает читаемый контекст («Май 2026», не «Все время»)
 * - 6 пресетов в radio-группе 2 колонки (без chip-overflow)
 * - Стрелки сдвига периода (◀ Май 2026 ▶) — переход на пред./след.
 * - Кнопка «Применить» — явное действие
 */
import { useEffect, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export type PeriodPreset =
	| "today"
	| "yesterday"
	| "last7"
	| "last30"
	| "week"
	| "prev_week"
	| "month"
	| "prev_month"
	| "quarter"
	| "prev_quarter"
	| "year"
	| "prev_year"
	| "all"
	| "custom";

export interface PeriodValue {
	preset: PeriodPreset;
	from: string;
	to: string;
}

const MONTHS_FULL = [
	"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
	"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const MONTHS_GEN = [
	"янв", "фев", "мар", "апр", "май", "июн",
	"июл", "авг", "сен", "окт", "ноя", "дек",
];

function iso(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function parseISO(s: string): Date {
	const [y, m, d] = s.split("-").map(Number);
	return new Date(y, (m || 1) - 1, d || 1);
}

function fmtShort(s: string): string {
	if (!s) return "-";
	const d = parseISO(s);
	return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

/** Понедельник той же календарной недели (ISO-подобно для ru). */
function weekStartMonday(d: Date): Date {
	const start = new Date(d);
	const day = start.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	start.setDate(start.getDate() + diff);
	return start;
}

export function getPresetRange(preset: PeriodPreset, now = new Date()): { from: string; to: string } {
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	switch (preset) {
		case "today":
			return { from: iso(today), to: iso(today) };
		case "yesterday": {
			const y = new Date(today);
			y.setDate(y.getDate() - 1);
			return { from: iso(y), to: iso(y) };
		}
		case "last7": {
			const from = new Date(today);
			from.setDate(from.getDate() - 6);
			return { from: iso(from), to: iso(today) };
		}
		case "last30": {
			const from = new Date(today);
			from.setDate(from.getDate() - 29);
			return { from: iso(from), to: iso(today) };
		}
		case "week": {
			const start = weekStartMonday(today);
			const end = new Date(start);
			end.setDate(start.getDate() + 6);
			return { from: iso(start), to: iso(end) };
		}
		case "prev_week": {
			const start = weekStartMonday(today);
			start.setDate(start.getDate() - 7);
			const end = new Date(start);
			end.setDate(start.getDate() + 6);
			return { from: iso(start), to: iso(end) };
		}
		case "month": {
			const from = new Date(today.getFullYear(), today.getMonth(), 1);
			const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
			return { from: iso(from), to: iso(to) };
		}
		case "prev_month": {
			const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
			const to = new Date(today.getFullYear(), today.getMonth(), 0);
			return { from: iso(from), to: iso(to) };
		}
		case "quarter": {
			const q = Math.floor(today.getMonth() / 3);
			const from = new Date(today.getFullYear(), q * 3, 1);
			const to = new Date(today.getFullYear(), q * 3 + 3, 0);
			return { from: iso(from), to: iso(to) };
		}
		case "prev_quarter": {
			const q = Math.floor(today.getMonth() / 3) - 1;
			const year = q < 0 ? today.getFullYear() - 1 : today.getFullYear();
			const qq = q < 0 ? 3 : q;
			const from = new Date(year, qq * 3, 1);
			const to = new Date(year, qq * 3 + 3, 0);
			return { from: iso(from), to: iso(to) };
		}
		case "year": {
			const from = new Date(today.getFullYear(), 0, 1);
			const to = new Date(today.getFullYear(), 11, 31);
			return { from: iso(from), to: iso(to) };
		}
		case "prev_year": {
			const y = today.getFullYear() - 1;
			return { from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) };
		}
		case "all":
			return { from: "2000-01-01", to: iso(today) };
		case "custom":
		default: {
			const from = new Date(today.getFullYear(), today.getMonth(), 1);
			return { from: iso(from), to: iso(today) };
		}
	}
}

export function defaultPeriod(preset: PeriodPreset = "month"): PeriodValue {
	const r = getPresetRange(preset);
	return { preset, ...r };
}

export function inPeriod(date: string | undefined | null, period: PeriodValue): boolean {
	if (!date) return false;
	const d = String(date).slice(0, 10);
	return d >= period.from && d <= period.to;
}

/** Удобный label для trigger. */
function periodLabel(p: PeriodValue): string {
	if (p.preset === "today") return "Сегодня";
	if (p.preset === "yesterday") return "Вчера";
	if (p.preset === "last7") return "Последние 7 дней";
	if (p.preset === "last30") return "Последние 30 дней";
	if (p.preset === "week") return "Текущая неделя";
	if (p.preset === "prev_week") return "Прошлая неделя";
	if (p.preset === "all") return "Всё время";
	if (p.preset === "month") {
		const d = parseISO(p.from);
		return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
	}
	if (p.preset === "prev_month") {
		const d = parseISO(p.from);
		return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
	}
	if (p.preset === "quarter") {
		const d = parseISO(p.from);
		const q = Math.floor(d.getMonth() / 3) + 1;
		return `${q} квартал ${d.getFullYear()}`;
	}
	if (p.preset === "prev_quarter") {
		const d = parseISO(p.from);
		const q = Math.floor(d.getMonth() / 3) + 1;
		return `${q} квартал ${d.getFullYear()}`;
	}
	if (p.preset === "year") {
		return `${parseISO(p.from).getFullYear()} год`;
	}
	if (p.preset === "prev_year") {
		return `${parseISO(p.from).getFullYear()} год`;
	}
	return `${fmtShort(p.from)} - ${fmtShort(p.to)}`;
}

/** Сдвиг периода стрелками. Работает для month/quarter/year/week/custom. */
function shiftPeriod(p: PeriodValue, direction: -1 | 1): PeriodValue {
	const from = parseISO(p.from);
	const to = parseISO(p.to);
	const ms = to.getTime() - from.getTime();

	if (p.preset === "month") {
		const next = new Date(from.getFullYear(), from.getMonth() + direction, 1);
		const last = new Date(next.getFullYear(), next.getMonth() + 1, 0);
		return { preset: "month", from: iso(next), to: iso(last) };
	}
	if (p.preset === "quarter") {
		const next = new Date(from.getFullYear(), from.getMonth() + 3 * direction, 1);
		const last = new Date(next.getFullYear(), next.getMonth() + 3, 0);
		return { preset: "quarter", from: iso(next), to: iso(last) };
	}
	if (p.preset === "year") {
		const next = new Date(from.getFullYear() + direction, 0, 1);
		const last = new Date(from.getFullYear() + direction, 11, 31);
		return { preset: "year", from: iso(next), to: iso(last) };
	}
	if (p.preset === "week" || p.preset === "prev_week") {
		const next = new Date(from);
		next.setDate(next.getDate() + 7 * direction);
		const last = new Date(next);
		last.setDate(next.getDate() + 6);
		return { preset: p.preset, from: iso(next), to: iso(last) };
	}
	if (p.preset === "prev_month") {
		const next = new Date(from.getFullYear(), from.getMonth() + direction, 1);
		const last = new Date(next.getFullYear(), next.getMonth() + 1, 0);
		return { preset: "prev_month", from: iso(next), to: iso(last) };
	}
	if (p.preset === "prev_quarter") {
		const next = new Date(from.getFullYear(), from.getMonth() + 3 * direction, 1);
		const last = new Date(next.getFullYear(), next.getMonth() + 3, 0);
		return { preset: "prev_quarter", from: iso(next), to: iso(last) };
	}
	if (p.preset === "prev_year") {
		const y = from.getFullYear() + direction;
		return {
			preset: "prev_year",
			from: iso(new Date(y, 0, 1)),
			to: iso(new Date(y, 11, 31)),
		};
	}
	if (p.preset === "all") return p;
	// today/yesterday/last7/last30/custom — сдвигаем по длине окна
	const days = Math.round(ms / 86400000) + 1;
	const nextFrom = new Date(from); nextFrom.setDate(nextFrom.getDate() + days * direction);
	const nextTo = new Date(to); nextTo.setDate(nextTo.getDate() + days * direction);
	return { preset: "custom", from: iso(nextFrom), to: iso(nextTo) };
}

const PRESETS: { key: PeriodPreset; label: string }[] = [
	{ key: "today", label: "Сегодня" },
	{ key: "yesterday", label: "Вчера" },
	{ key: "last7", label: "±7 дней" },
	{ key: "last30", label: "±30 дней" },
	{ key: "week", label: "Текущая неделя" },
	{ key: "prev_week", label: "Прошлая неделя" },
	{ key: "month", label: "Текущий месяц" },
	{ key: "prev_month", label: "Прошлый месяц" },
	{ key: "quarter", label: "Текущий квартал" },
	{ key: "prev_quarter", label: "Прошлый квартал" },
	{ key: "year", label: "Текущий год" },
	{ key: "prev_year", label: "Прошлый год" },
	{ key: "all", label: "Всё время" },
];

export interface DateRangePickerProps {
	value: PeriodValue;
	onChange: (v: PeriodValue) => void;
	/** Hide арровы сдвига периода. */
	hideShift?: boolean;
	className?: string;
}

export function DateRangePicker({ value, onChange, hideShift, className }: DateRangePickerProps) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<PeriodValue>(value);

	useEffect(() => { if (open) setDraft(value); }, [open, value]);

	const apply = (next: PeriodValue) => {
		onChange(next);
		setOpen(false);
	};

	const choosePreset = (preset: PeriodPreset) => {
		if (preset === "custom") {
			setDraft({ ...draft, preset });
			return;
		}
		const r = getPresetRange(preset);
		setDraft({ preset, ...r });
	};

	const cn = ["inline-flex items-stretch", className].filter(Boolean).join(" ");

	return (
		<div className={cn}>
			{!hideShift && (
				<button
					type="button"
					onClick={() => onChange(shiftPeriod(value, -1))}
					className="am-control am-press !w-9 !h-9 !p-0 flex items-center justify-center text-am-text-muted hover:text-am-text-strong !rounded-r-none border-r-0"
					aria-label="Предыдущий период"
				>
					<ChevronLeft className="w-4 h-4" />
				</button>
			)}
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
						className={`am-control am-press !h-9 inline-flex items-center gap-2 px-3 min-w-[180px] hover:border-am-border-strong ${hideShift ? "" : "!rounded-none"}`}
					>
						<CalendarDays className="w-4 h-4 text-am-text-muted" />
						<span className="text-sm text-am-text-strong flex-1 text-left">{periodLabel(value)}</span>
						<ChevronDown className="w-4 h-4 text-am-text-subtle" />
					</button>
				</PopoverTrigger>
				<PopoverContent className="w-[480px] p-0" align="start">
					<div className="p-4 space-y-4 max-h-[min(70vh,520px)] overflow-y-auto">
						<div>
							<p className="text-[11px] uppercase tracking-wide text-am-text-muted font-semibold mb-2">
								Период
							</p>
							<div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
								{PRESETS.map((p) => {
									const active = draft.preset === p.key;
									return (
										<button
											key={p.key}
											type="button"
											onClick={() => choosePreset(p.key)}
											className={`am-press text-sm text-left px-3 py-2 rounded-md border ${
												active
													? "bg-am-brand-surface border-am-brand text-am-brand"
													: "bg-am-bg border-am-border text-am-text hover:border-am-border-strong"
											}`}
										>
											{p.label}
										</button>
									);
								})}
							</div>
						</div>

						{/* Custom range */}
						<div>
							<p className="text-[11px] uppercase tracking-wide text-am-text-muted font-semibold mb-2">
								Произвольный диапазон
							</p>
							<div className="flex items-center gap-2">
								<input
									type="date"
									value={draft.from}
									onChange={(e) => setDraft({ ...draft, preset: "custom", from: e.target.value })}
									className="am-control !h-9 flex-1"
								/>
								<span className="text-am-text-subtle">-</span>
								<input
									type="date"
									value={draft.to}
									onChange={(e) => setDraft({ ...draft, preset: "custom", to: e.target.value })}
									className="am-control !h-9 flex-1"
								/>
							</div>
						</div>

						<div className="flex justify-end gap-2 pt-2 border-t border-am-border">
							<Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
								Отмена
							</Button>
							<Button
								size="sm"
								onClick={() => apply(draft)}
								className="bg-am-brand hover:bg-am-brand-hover text-white"
							>
								Применить
							</Button>
						</div>
					</div>
				</PopoverContent>
			</Popover>
			{!hideShift && (
				<button
					type="button"
					onClick={() => onChange(shiftPeriod(value, 1))}
					className="am-control am-press !w-9 !h-9 !p-0 flex items-center justify-center text-am-text-muted hover:text-am-text-strong !rounded-l-none border-l-0"
					aria-label="Следующий период"
				>
					<ChevronRight className="w-4 h-4" />
				</button>
			)}
		</div>
	);
}

/** Очистка периода — кнопка-крестик рядом с DateRangePicker. */
export function ClearPeriodButton({
	onClear,
}: {
	onClear: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClear}
			className="am-control am-press !w-9 !h-9 !p-0 flex items-center justify-center text-am-text-subtle hover:text-am-danger ml-1"
			aria-label="Сбросить период"
			title="Сбросить период"
		>
			<X className="w-4 h-4" />
		</button>
	);
}
