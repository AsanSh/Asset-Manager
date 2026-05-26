export function formatCurrency(
	amount: number | string,
	currency = "KGS",
	maximumFractionDigits = 0,
) {
	const num =
		typeof amount === "string"
			? parseFloat(amount.replace(/\s/g, "").replace(",", "."))
			: amount;
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency,
		maximumFractionDigits,
	}).format(num || 0);
}
