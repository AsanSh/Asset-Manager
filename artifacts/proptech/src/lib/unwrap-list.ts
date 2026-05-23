/**
 * Нормализует ответ API: массив или пагинированный { data: T[] }.
 */
export function unwrapList<T>(payload: unknown): T[] {
	if (Array.isArray(payload)) return payload as T[];
	if (payload && typeof payload === "object" && "data" in payload) {
		const inner = (payload as { data: unknown }).data;
		if (Array.isArray(inner)) return inner as T[];
	}
	return [];
}
