import type { ColumnOrderState, ColumnSizingState, SortingState, VisibilityState } from "@tanstack/react-table";
import { api } from "@/lib/api";

export type TableDensity = "compact" | "normal" | "comfortable";

export type TableViewLayout = {
	visibility?: VisibilityState;
	order?: ColumnOrderState;
	sizing?: ColumnSizingState;
	density?: TableDensity;
	sorting?: SortingState;
};

const LOCAL_PREFIX = "dt:";

export function loadLocalTablePrefs(tableId: string): Partial<TableViewLayout> | null {
	try {
		const raw = localStorage.getItem(`${LOCAL_PREFIX}${tableId}`);
		return raw ? (JSON.parse(raw) as Partial<TableViewLayout>) : null;
	} catch {
		return null;
	}
}

export function saveLocalTablePrefs(tableId: string, prefs: Partial<TableViewLayout>) {
	try {
		localStorage.setItem(`${LOCAL_PREFIX}${tableId}`, JSON.stringify(prefs));
	} catch {
		// ignore quota / private mode
	}
}

export async function fetchRemoteTablePrefs(
	tableId: string,
): Promise<Partial<TableViewLayout> | null> {
	try {
		const { data } = await api.get<{ layout?: Partial<TableViewLayout> }>(
			`/table-views/${encodeURIComponent(tableId)}`,
		);
		const layout = data?.layout;
		if (!layout || typeof layout !== "object") return null;
		return layout;
	} catch {
		return null;
	}
}

let remoteSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleRemoteTablePrefsSave(
	tableId: string,
	prefs: Partial<TableViewLayout>,
) {
	const prev = remoteSaveTimers.get(tableId);
	if (prev) clearTimeout(prev);
	remoteSaveTimers.set(
		tableId,
		setTimeout(() => {
			void api
				.put(`/table-views/${encodeURIComponent(tableId)}`, { layout: prefs })
				.catch(() => {
					// offline / unauthenticated — localStorage remains source
				});
		}, 800),
	);
}

export function mergeTablePrefs(
	local: Partial<TableViewLayout> | null,
	remote: Partial<TableViewLayout> | null,
): Partial<TableViewLayout> | null {
	if (!local && !remote) return null;
	return { ...(local ?? {}), ...(remote ?? {}) };
}
