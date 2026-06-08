import { defaultPeriod, inPeriod, type PeriodValue } from "@/components/am/DateRangePicker";

export { defaultPeriod, inPeriod, type PeriodValue };

export function isInPeriod(date: string | null | undefined, period: PeriodValue) {
	if (!date) return false;
	return inPeriod(date.slice(0, 10), period);
}

export function periodYear(period: PeriodValue) {
	return String(new Date(`${period.from}T00:00:00`).getFullYear());
}

export function dateLabel(period: PeriodValue) {
	const fmt = new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
	return `${fmt.format(new Date(`${period.from}T00:00:00`))} - ${fmt.format(new Date(`${period.to}T00:00:00`))}`;
}
