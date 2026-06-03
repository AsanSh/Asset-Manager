export function parseNum(v: unknown): number {
	const n = parseFloat(String(v ?? 0));
	return Number.isFinite(n) ? n : 0;
}

export function canManageUnitPricing(role: string): boolean {
	return ["admin", "company_admin", "owner", "finance", "pto"].includes(role);
}

export function isSalesOnlyRole(role: string): boolean {
	return role === "sales_manager";
}
