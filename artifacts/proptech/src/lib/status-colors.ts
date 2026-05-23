/**
 * BuildFlow Design System - Status Colors Helper
 *
 * Единая палитра цветов для статусных badges во всей системе.
 * Использует мягкие оттенки вместо ярких неоновых цветов.
 */

export const statusColors = {
	// Активные/успешные состояния
	active: "bg-emerald-100 text-emerald-700 border-emerald-200",
	success: "bg-emerald-100 text-emerald-700 border-emerald-200",
	approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
	completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
	paid: "bg-emerald-100 text-emerald-700 border-emerald-200",

	// Ожидание/в процессе
	pending: "bg-amber-100 text-amber-700 border-amber-200",
	inProgress: "bg-blue-100 text-blue-700 border-blue-200",
	processing: "bg-blue-100 text-blue-700 border-blue-200",
	review: "bg-amber-100 text-amber-700 border-amber-200",

	// Проблемы/отклонения
	overdue: "bg-rose-100 text-rose-700 border-rose-200",
	rejected: "bg-rose-100 text-rose-700 border-rose-200",
	failed: "bg-rose-100 text-rose-700 border-rose-200",
	cancelled: "bg-rose-100 text-rose-700 border-rose-200",

	// Нейтральные
	draft: "bg-gray-100 text-gray-700 border-gray-200",
	inactive: "bg-gray-100 text-gray-600 border-gray-200",
	paused: "bg-gray-100 text-gray-700 border-gray-200",

	// Предупреждения
	warning: "bg-amber-100 text-amber-700 border-amber-200",
	expired: "bg-amber-100 text-amber-700 border-amber-200",

	// Информационные
	info: "bg-blue-100 text-blue-700 border-blue-200",
} as const;

export type StatusColorKey = keyof typeof statusColors;

/**
 * Получить цвет для статуса с fallback на neutral
 * @param status - ключ статуса или строка
 * @returns CSS классы для Badge
 */
export function getStatusColor(status: string | StatusColorKey): string {
	const key = status as StatusColorKey;
	return statusColors[key] || statusColors.draft;
}

/**
 * Цвета для типов операций (приход/расход)
 */
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

/**
 * Получить цвета для типа операции
 */
export function getOperationColors(type: OperationType) {
	return operationColors[type];
}
