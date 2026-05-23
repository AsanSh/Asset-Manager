export type UnitStatusColorKey =
	| "emerald"
	| "blue"
	| "amber"
	| "rose"
	| "violet"
	| "slate"
	| "cyan"
	| "orange";

export const STATUS_COLOR_PRESETS: Record<
	UnitStatusColorKey,
	{ label: string; bg: string; text: string; border: string; badge: string }
> = {
	emerald: {
		label: "Зелёный",
		bg: "bg-emerald-50 hover:bg-emerald-100",
		text: "text-emerald-700",
		border: "border-emerald-200",
		badge: "bg-emerald-100 text-emerald-800",
	},
	blue: {
		label: "Синий",
		bg: "bg-blue-50 hover:bg-blue-100",
		text: "text-blue-700",
		border: "border-blue-200",
		badge: "bg-blue-100 text-blue-800",
	},
	amber: {
		label: "Янтарный",
		bg: "bg-amber-50 hover:bg-amber-100",
		text: "text-amber-700",
		border: "border-amber-200",
		badge: "bg-amber-100 text-amber-800",
	},
	rose: {
		label: "Розовый",
		bg: "bg-rose-50 hover:bg-rose-100",
		text: "text-rose-700",
		border: "border-rose-200",
		badge: "bg-rose-100 text-rose-800",
	},
	violet: {
		label: "Фиолетовый",
		bg: "bg-violet-50 hover:bg-violet-100",
		text: "text-violet-700",
		border: "border-violet-200",
		badge: "bg-violet-100 text-violet-800",
	},
	slate: {
		label: "Серый",
		bg: "bg-slate-50 hover:bg-slate-100",
		text: "text-slate-700",
		border: "border-slate-200",
		badge: "bg-slate-100 text-slate-800",
	},
	cyan: {
		label: "Бирюзовый",
		bg: "bg-cyan-50 hover:bg-cyan-100",
		text: "text-cyan-700",
		border: "border-cyan-200",
		badge: "bg-cyan-100 text-cyan-800",
	},
	orange: {
		label: "Оранжевый",
		bg: "bg-orange-50 hover:bg-orange-100",
		text: "text-orange-700",
		border: "border-orange-200",
		badge: "bg-orange-100 text-orange-800",
	},
};

export type UnitStatusDto = {
	id: number;
	code: string;
	label: string;
	colorKey: UnitStatusColorKey | string;
	sortOrder: number;
	isSystem: boolean;
	saleMode: "none" | "reserved" | "sold";
};

export type StatusGridCfg = {
	label: string;
	bg: string;
	text: string;
	border: string;
};

export type StatusBadgeCfg = { label: string; color: string };

const FALLBACK_GRID: StatusGridCfg = STATUS_COLOR_PRESETS.emerald;
const FALLBACK_BADGE: StatusBadgeCfg = {
	label: "—",
	color: STATUS_COLOR_PRESETS.slate.badge,
};

export function buildStatusGridCfg(
	statuses: UnitStatusDto[],
): Record<string, StatusGridCfg> {
	const map: Record<string, StatusGridCfg> = {};
	for (const s of statuses) {
		const preset =
			STATUS_COLOR_PRESETS[s.colorKey as UnitStatusColorKey] ||
			STATUS_COLOR_PRESETS.slate;
		map[s.code] = { label: s.label, bg: preset.bg, text: preset.text, border: preset.border };
	}
	return map;
}

export function buildStatusBadgeCfg(
	statuses: UnitStatusDto[],
): Record<string, StatusBadgeCfg> {
	const map: Record<string, StatusBadgeCfg> = {};
	for (const s of statuses) {
		const preset =
			STATUS_COLOR_PRESETS[s.colorKey as UnitStatusColorKey] ||
			STATUS_COLOR_PRESETS.slate;
		map[s.code] = { label: s.label, color: preset.badge };
	}
	return map;
}

export function gridCfgFor(
	statusMap: Record<string, StatusGridCfg>,
	code: string,
): StatusGridCfg {
	return statusMap[code] || statusMap.available || FALLBACK_GRID;
}

export function badgeCfgFor(
	statusMap: Record<string, StatusBadgeCfg>,
	code: string,
): StatusBadgeCfg {
	return statusMap[code] || statusMap.available || FALLBACK_BADGE;
}

export function saleModeFor(
	statuses: UnitStatusDto[],
	code: string,
): "reserved" | "sold" | null {
	const s = statuses.find((x) => x.code === code);
	if (s?.saleMode === "reserved" || s?.saleMode === "sold") return s.saleMode;
	return null;
}
