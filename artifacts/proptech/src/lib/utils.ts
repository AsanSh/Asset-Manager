import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatCurrency(
	amount: number | string,
	currency = "KGS",
): string {
	const num = typeof amount === "string" ? parseFloat(amount) : amount;
	if (Number.isNaN(num)) return "—";
	const cur = currency === "USD" ? "USD" : "KGS";
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: cur,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(num);
}
