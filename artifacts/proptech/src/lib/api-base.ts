/** Базовый URL API для fetch (без завершающего слэша). */
export function getApiBase(): string {
	const raw = (import.meta.env.VITE_API_URL || "http://localhost:3000").trim();
	let base = raw.replace(/\/+$/, "");
	if (!base) base = "http://localhost:3000";

	try {
		const u = new URL(base);
		const pathRaw = u.pathname || "/";
		const path = pathRaw.replace(/\/+$/, "") || "/";
		const atRoot = path === "/";
		if (u.hostname.endsWith("vercel.app") && atRoot) {
			return `${u.origin}/api`.replace(/\/+$/, "");
		}
	} catch {
		/* относительный или невалидный URL — используем как есть */
	}

	return base;
}
