const CHUNK_RELOAD_KEY = "proptech-chunk-reload";

const CHUNK_ERROR_RE =
	/Failed to fetch dynamically imported module|Loading chunk \d+ failed|Importing a module script failed|error loading dynamically imported module/i;

export function isChunkLoadError(message: string): boolean {
	return CHUNK_ERROR_RE.test(message);
}

/** Один раз перезагрузить страницу после деплоя, когда браузер держит старый JS-бандл. */
export function reloadOnceOnStaleChunk(): boolean {
	if (typeof window === "undefined") return false;
	try {
		if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false;
		sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
		window.location.reload();
		return true;
	} catch {
		window.location.reload();
		return true;
	}
}

export function clearChunkReloadFlag(): void {
	try {
		sessionStorage.removeItem(CHUNK_RELOAD_KEY);
	} catch {
		// ignore
	}
}

export function installChunkReloadHandlers(): void {
	if (typeof window === "undefined") return;

	window.addEventListener("vite:preloadError", (event) => {
		event.preventDefault();
		reloadOnceOnStaleChunk();
	});

	window.addEventListener("unhandledrejection", (event) => {
		const reason = event.reason;
		const message =
			reason instanceof Error
				? reason.message
				: typeof reason === "string"
					? reason
					: "";
		if (!isChunkLoadError(message)) return;
		event.preventDefault();
		reloadOnceOnStaleChunk();
	});

	clearChunkReloadFlag();
}
