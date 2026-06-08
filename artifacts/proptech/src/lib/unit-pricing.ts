/** Парсит число из строки с учётом ru-KG: пробелы-разделители и запятая как десятичный разделитель. */
export function parseNum(v: unknown): number {
	const normalized = String(v ?? "")
		.trim()
		.replace(/\s/g, "")
		.replace(",", ".");
	const n = parseFloat(normalized);
	return Number.isFinite(n) ? n : 0;
}

export function canManageUnitPricing(role: string): boolean {
	return ["admin", "company_admin", "owner", "finance", "pto"].includes(role);
}

export function isSalesOnlyRole(role: string): boolean {
	return role === "sales_manager";
}
