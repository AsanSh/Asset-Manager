const CHUNK_RELOAD_STORAGE_KEY = "planalityc:last-chunk-reload";
const CHUNK_RELOAD_COOLDOWN_MS = 10_000;

export function isChunkLoadError(error: unknown): boolean {
	const message =
		error instanceof Error
			? `${error.name} ${error.message}`
			: typeof error === "string"
				? error
				: "";

	return /Failed to fetch dynamically imported module|Importing a module script failed|Expected a JavaScript module script|module script|text\/html|ChunkLoadError|Loading chunk|vite:preloadError/i.test(message);
}

export function reloadForFreshAssets(error: unknown): boolean {
	if (!isChunkLoadError(error) || typeof window === "undefined") return false;

	const lastReload = Number(window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) || 0);
	const now = Date.now();
	if (now - lastReload < CHUNK_RELOAD_COOLDOWN_MS) return false;

	window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
	window.location.reload();
	return true;
}

export function installChunkReloadHandler() {
	if (typeof window === "undefined") return;

	window.addEventListener("vite:preloadError", (event) => {
		event.preventDefault();
		const payload = (event as unknown as { payload?: unknown }).payload;
		reloadForFreshAssets(payload);
	});

	window.addEventListener("error", (event) => {
		reloadForFreshAssets(event.error || event.message);
	});

	window.addEventListener("unhandledrejection", (event) => {
		reloadForFreshAssets(event.reason);
	});
}
