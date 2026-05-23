export type DateRangeKey =
	| "all"
	| "today"
	| "week"
	| "month"
	| "quarter"
	| "year"
	| "custom";

export const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
	all: "Все сроки",
	today: "Сегодня",
	week: "Неделя",
	month: "Месяц",
	quarter: "Квартал",
	year: "Год",
	custom: "Выборочно",
};

function startOfDay(d: Date) {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
}

function endOfDay(d: Date) {
	const x = new Date(d);
	x.setHours(23, 59, 59, 999);
	return x;
}

/** Понедельник — воскресенье текущей недели */
function weekBounds(ref: Date) {
	const d = startOfDay(ref);
	const day = d.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	const from = new Date(d);
	from.setDate(d.getDate() + diff);
	const to = new Date(from);
	to.setDate(from.getDate() + 6);
	return { from: startOfDay(from), to: endOfDay(to) };
}

function quarterBounds(ref: Date) {
	const q = Math.floor(ref.getMonth() / 3);
	const from = new Date(ref.getFullYear(), q * 3, 1);
	const to = new Date(ref.getFullYear(), q * 3 + 3, 0);
	return { from: startOfDay(from), to: endOfDay(to) };
}

export function resolveDateRange(
	key: DateRangeKey,
	customFrom?: string,
	customTo?: string,
): { from: Date; to: Date } | null {
	const now = new Date();
	if (key === "all") return null;
	if (key === "today") {
		return { from: startOfDay(now), to: endOfDay(now) };
	}
	if (key === "week") return weekBounds(now);
	if (key === "month") {
		const from = new Date(now.getFullYear(), now.getMonth(), 1);
		const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		return { from: startOfDay(from), to: endOfDay(to) };
	}
	if (key === "quarter") return quarterBounds(now);
	if (key === "year") {
		const from = new Date(now.getFullYear(), 0, 1);
		const to = new Date(now.getFullYear(), 11, 31);
		return { from: startOfDay(from), to: endOfDay(to) };
	}
	if (key === "custom" && customFrom && customTo) {
		const from = startOfDay(new Date(customFrom));
		const to = endOfDay(new Date(customTo));
		if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
		return { from, to };
	}
	return null;
}

export function isDueDateInRange(
	dueDate: string,
	range: { from: Date; to: Date } | null,
): boolean {
	if (!range) return true;
	const d = new Date(dueDate);
	if (Number.isNaN(d.getTime())) return false;
	return d >= range.from && d <= range.to;
}

export function formatRangeLabel(
	key: DateRangeKey,
	customFrom?: string,
	customTo?: string,
): string {
	if (key === "custom" && customFrom && customTo) {
		return `${customFrom} — ${customTo}`;
	}
	return DATE_RANGE_LABELS[key];
}
