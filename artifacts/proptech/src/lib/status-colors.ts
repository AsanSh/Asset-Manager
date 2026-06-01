/**
 * @deprecated Используйте `<Status value="..." />` из `@/components/am`.
 * Этот модуль оставлен для постепенной миграции — классы синхронизированы с STATUS_REGISTRY.
 */
import { STATUS_REGISTRY } from "@/components/am/Status";

const VARIANT_TO_CLASS = {
	neutral: "bg-gray-100 text-gray-700 border-gray-200",
	info: "bg-blue-100 text-blue-700 border-blue-200",
	success: "bg-emerald-100 text-emerald-700 border-emerald-200",
	warning: "bg-amber-100 text-amber-700 border-amber-200",
	danger: "bg-rose-100 text-rose-700 border-rose-200",
	brand: "bg-orange-100 text-orange-700 border-orange-200",
} as const;

function classForStatusKey(status: string): string {
	const def = STATUS_REGISTRY[status];
	if (def) return VARIANT_TO_CLASS[def.variant] ?? VARIANT_TO_CLASS.neutral;
	return VARIANT_TO_CLASS.neutral;
}

/** @deprecated */
export const statusColors = {
	active: classForStatusKey("active"),
	success: classForStatusKey("success"),
	approved: classForStatusKey("approved"),
	completed: classForStatusKey("completed"),
	paid: classForStatusKey("paid"),
	pending: classForStatusKey("pending"),
	inProgress: classForStatusKey("in_progress"),
	processing: classForStatusKey("in_progress"),
	review: classForStatusKey("review"),
	overdue: classForStatusKey("overdue"),
	rejected: classForStatusKey("rejected"),
	failed: classForStatusKey("rejected"),
	cancelled: classForStatusKey("cancelled"),
	draft: classForStatusKey("draft"),
	inactive: classForStatusKey("inactive"),
	paused: classForStatusKey("paused"),
	warning: classForStatusKey("warning"),
	expired: classForStatusKey("overdue"),
	info: classForStatusKey("review"),
} as const;

export type StatusColorKey = keyof typeof statusColors;

/**
 * @deprecated Prefer `<Status value={status} />`
 */
export function getStatusColor(status: string | StatusColorKey): string {
	const key = status as StatusColorKey;
	return statusColors[key] ?? classForStatusKey(status) ?? statusColors.draft;
}

export const operationColors = {
	income: {
		bg: "bg-emerald-50",
		text: "text-emerald-700",
		border: "border-emerald-200",
		hover: "hover:bg-emerald-100",
		icon: "text-emerald-600",
	},
	expense: {
		bg: "bg-rose-50",
		text: "text-rose-700",
		border: "border-rose-200",
		hover: "hover:bg-rose-100",
		icon: "text-rose-600",
	},
	transfer: {
		bg: "bg-blue-50",
		text: "text-blue-700",
		border: "border-blue-200",
		hover: "hover:bg-blue-100",
		icon: "text-blue-600",
	},
} as const;

export type OperationType = keyof typeof operationColors;

export function getOperationColor(type: OperationType) {
	return operationColors[type];
}
