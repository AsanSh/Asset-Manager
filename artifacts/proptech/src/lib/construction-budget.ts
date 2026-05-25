/** Нормализует ответ GET /construction/projects/:id/budget в плоский список позиций. */
export interface BudgetLineItemFlat {
	id: number;
	projectId: number;
	category: string;
	name: string;
	plannedAmount: string;
	actualAmount: string;
	currency: string;
	notes?: string;
}

interface BudgetCategoryBlock {
	id: number;
	name: string;
	plannedAmount?: string | null;
	spentAmount?: string | null;
	items?: Array<{
		id: number;
		projectId: number;
		name: string;
		plannedAmount?: string | null;
		spentAmount?: string | null;
		notes?: string | null;
	}>;
}

export function flattenProjectBudgetResponse(data: unknown): BudgetLineItemFlat[] {
	if (Array.isArray(data)) {
		return data.map((item) => ({
			id: item.id,
			projectId: item.projectId,
			category: item.category || "Прочее",
			name: item.name,
			plannedAmount: String(item.plannedAmount ?? "0"),
			actualAmount: String(item.actualAmount ?? item.spentAmount ?? "0"),
			currency: item.currency || "KGS",
			notes: item.notes,
		}));
	}

	if (!data || typeof data !== "object") return [];

	const payload = data as { categories?: BudgetCategoryBlock[] };
	if (!Array.isArray(payload.categories)) return [];

	return payload.categories.flatMap((cat) => {
		const categoryName = cat.name || "Прочее";
		const items = Array.isArray(cat.items) ? cat.items : [];
		if (items.length === 0) {
			return [{
				id: cat.id,
				projectId: 0,
				category: categoryName,
				name: categoryName,
				plannedAmount: String(cat.plannedAmount ?? "0"),
				actualAmount: String(cat.spentAmount ?? "0"),
				currency: "KGS",
			}];
		}
		return items.map((item) => ({
			id: item.id,
			projectId: item.projectId,
			category: categoryName,
			name: item.name,
			plannedAmount: String(item.plannedAmount ?? "0"),
			actualAmount: String(item.spentAmount ?? "0"),
			currency: "KGS",
			notes: item.notes ?? undefined,
		}));
	});
}
