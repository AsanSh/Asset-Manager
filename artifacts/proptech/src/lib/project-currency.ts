export type ProjectCurrencyFields = {
	totalArea?: string | null;
	costPerSqm?: string | null;
	currency?: string | null;
	exchangeRate?: string | null;
	estimatedCostKgs?: string | null;
};

const CURRENCY_SYMBOL: Record<string, string> = {
	KGS: "с",
	USD: "$",
	EUR: "€",
	RUB: "₽",
	CNY: "¥",
};

export function currencySymbol(code: string) {
	return CURRENCY_SYMBOL[code] || code;
}

export function fmtProjectAmount(v: string | number | null | undefined) {
	if (v == null || v === "") return "—";
	const n = parseFloat(String(v));
	if (Number.isNaN(n)) return "—";
	return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

/** Себестоимость в валюте проекта (то, что видит пользователь) */
export function projectCostInCurrency(p: ProjectCurrencyFields) {
	const area = parseFloat(p.totalArea || "0");
	const cps = parseFloat(p.costPerSqm || "0");
	const currency = p.currency || "KGS";
	const rate = parseFloat(p.exchangeRate || "1") || 1;

	if (area > 0 && cps > 0) {
		return { total: area * cps, currency, area, cps };
	}

	const kgs = parseFloat(p.estimatedCostKgs || "0");
	if (kgs <= 0) return { total: 0, currency, area, cps };

	if (currency === "KGS") {
		return { total: kgs, currency, area, cps };
	}
	return { total: kgs / rate, currency, area, cps };
}

export function projectCostBreakdown(p: ProjectCurrencyFields) {
	const { currency, area, cps } = projectCostInCurrency(p);
	if (area <= 0 || cps <= 0) return null;
	const sym = currencySymbol(currency);
	return `${fmtProjectAmount(area)} м² × ${fmtProjectAmount(cps)} ${sym}`;
}

export function projectCostLabel(currency: string) {
	return currency === "KGS" ? "Себестоимость" : `Себестоимость (${currency})`;
}
