export interface NbkrRate {
	name: string;
	rate: string;
	scale: string;
}

export interface NbkrResponse {
	date: string;
	rates: Record<string, NbkrRate>;
}

export type DisplayCurrency = "KGS" | "USD";

/** Сколько KGS стоит 1 единица валюты (по курсу НБКР). KGS = 1. */
export function unitInKgs(currency: string, rates: Record<string, NbkrRate>): number {
	if (currency === "KGS") return 1;
	const r = rates[currency];
	if (!r) return 1;
	const rate = parseFloat(r.rate);
	const scale = parseFloat(r.scale || "1") || 1;
	if (!rate) return 1;
	return rate / scale;
}

/** Конвертирует сумму из валюты from в валюту to через KGS. */
export function convertViaKgs(
	amount: number,
	from: string,
	to: string,
	rates: Record<string, NbkrRate>,
): number {
	if (from === to) return amount;
	const kgs = amount * unitInKgs(from, rates);
	return kgs / unitInKgs(to, rates);
}

export function kgsToDisplay(
	kgs: number,
	displayCurrency: DisplayCurrency,
	rates: Record<string, NbkrRate>,
): number {
	return convertViaKgs(kgs, "KGS", displayCurrency, rates);
}

export function fmtCurrencyAmount(n: number, currency: DisplayCurrency): string {
	const formatted = new Intl.NumberFormat("ru-RU", {
		minimumFractionDigits: 0,
		maximumFractionDigits: currency === "USD" ? 2 : 0,
	}).format(n);
	return currency === "USD" ? `$${formatted}` : `${formatted} с`;
}

export function nbkrUsdRateLabel(rates: Record<string, NbkrRate>): string | null {
	const usd = rates.USD;
	if (!usd) return null;
	const rate = parseFloat(usd.rate);
	const scale = parseFloat(usd.scale || "1") || 1;
	if (!rate) return null;
	const perUnit = rate / scale;
	return `1 USD = ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(perUnit)} с`;
}
