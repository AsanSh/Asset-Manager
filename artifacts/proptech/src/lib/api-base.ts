/** Базовый URL API для fetch (без завершающего слэша). */
export function getApiBase(): string {
	const fallback = import.meta.env.PROD
		? "https://proptech-api.vercel.app"
		: "http://localhost:3000";
	const raw = (import.meta.env.VITE_API_URL || fallback).trim();
	let base = raw.replace(/\/+$/, "");
	if (!base) base = fallback;

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
