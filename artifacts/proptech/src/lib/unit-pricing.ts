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
	return ["super_admin", "admin", "company_admin", "owner", "commercial_director"].includes(
		role,
	);
}

export function isSalesOnlyRole(role: string): boolean {
	return role === "sales_manager";
}

/** Объект открыт для продажи: цена утверждена коммерческим директором. */
export function isUnitApprovedForSale(unit: {
	priceApproved?: boolean;
	listPrice?: string | null;
	pricePerSqm?: string | null;
	area?: string | null;
}) {
	if (!unit.priceApproved) return false;
	const area = parseNum(unit.area);
	const pps = parseNum(unit.pricePerSqm);
	const list = parseNum(unit.listPrice);
	return (area > 0 && pps > 0) || list > 0;
}
