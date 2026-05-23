/**
 * BuildFlow Design System - Design Tokens
 *
 * Централизованные токены дизайна для консистентности во всей системе.
 */

/**
 * Цветовая палитра
 */
export const colors = {
	// Основные бренд-цвета
	primary: {
		50: "bg-blue-50",
		100: "bg-blue-100",
		500: "bg-blue-600",
		600: "bg-blue-600",
		700: "bg-blue-700",
	},

	// Семантические цвета
	success: {
		50: "bg-emerald-50",
		100: "bg-emerald-100",
		600: "bg-emerald-600",
		700: "bg-emerald-700",
	},

	danger: {
		50: "bg-rose-50",
		100: "bg-rose-100",
		600: "bg-rose-600",
		700: "bg-rose-700",
	},

	warning: {
		50: "bg-amber-50",
		100: "bg-amber-100",
		600: "bg-amber-600",
		700: "bg-amber-700",
	},

	info: {
		50: "bg-blue-50",
		100: "bg-blue-100",
		600: "bg-blue-600",
		700: "bg-blue-700",
	},
} as const;

/**
 * Spacing система
 */
export const spacing = {
	xs: "gap-1",
	sm: "gap-2",
	md: "gap-3",
	lg: "gap-4",
	xl: "gap-6",
	"2xl": "gap-8",
} as const;

/**
 * Border radius
 */
export const borderRadius = {
	sm: "rounded-md",
	md: "rounded-lg",
	lg: "rounded-xl",
	xl: "rounded-2xl",
	full: "rounded-full",
} as const;

/**
 * Shadows
 */
export const shadows = {
	sm: "shadow-sm",
	md: "shadow",
	lg: "shadow-lg",
	xl: "shadow-xl",
	none: "shadow-none",
} as const;

/**
 * Typography
 */
export const typography = {
	h1: "text-2xl font-bold text-gray-900",
	h2: "text-xl font-semibold text-gray-900",
	h3: "text-lg font-semibold text-gray-900",
	body: "text-sm text-gray-700",
	small: "text-xs text-gray-600",
	caption: "text-xs text-gray-500",
} as const;

/**
 * Кнопки - стандартные стили
 */
export const buttonStyles = {
	primary: "bg-blue-600 hover:bg-blue-700 text-white",
	secondary: "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
	success: "bg-emerald-600 hover:bg-emerald-700 text-white",
	danger: "bg-rose-600 hover:bg-rose-700 text-white",

	// Outline варианты
	outlinePrimary: "border-blue-200 text-blue-700 hover:bg-blue-50",
	outlineSuccess: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
	outlineDanger: "border-rose-200 text-rose-700 hover:bg-rose-50",
} as const;

/**
 * Карточки - стандартные стили
 */
export const cardStyles = {
	default: "bg-white border border-gray-200 rounded-xl p-4 shadow-sm",
	kpi: "bg-white border border-gray-200 rounded-xl p-5",
	stats:
		"bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4",
} as const;
