// Design System для PropTech платформы
// Современная цветовая схема с градиентами

export const colors = {
	// Primary - Deep Purple & Teal
	primary: {
		50: "#f5f3ff",
		100: "#ede9fe",
		200: "#ddd6fe",
		300: "#c4b5fd",
		400: "#a78bfa",
		500: "#8b5cf6",
		600: "#7c3aed",
		700: "#6d28d9",
		800: "#5b21b6",
		900: "#4c1d95",
	},

	// Secondary - Teal
	secondary: {
		50: "#f0fdfa",
		100: "#ccfbf1",
		200: "#99f6e4",
		300: "#5eead4",
		400: "#2dd4bf",
		500: "#14b8a6",
		600: "#0d9488",
		700: "#0f766e",
		800: "#115e59",
		900: "#134e4a",
	},

	// Accent - Orange (сохраняем для совместимости)
	accent: {
		50: "#fff7ed",
		100: "#ffedd5",
		200: "#fed7aa",
		300: "#fdba74",
		400: "#fb923c",
		500: "#f97316",
		600: "#ea580c",
		700: "#c2410c",
		800: "#9a3412",
		900: "#7c2d12",
	},

	// Status colors
	success: {
		50: "#f0fdf4",
		100: "#dcfce7",
		500: "#22c55e",
		600: "#16a34a",
		700: "#15803d",
	},

	warning: {
		50: "#fffbeb",
		100: "#fef3c7",
		500: "#eab308",
		600: "#ca8a04",
		700: "#a16207",
	},

	error: {
		50: "#fef2f2",
		100: "#fee2e2",
		500: "#ef4444",
		600: "#dc2626",
		700: "#b91c1c",
	},

	// Neutrals
	gray: {
		50: "#f9fafb",
		100: "#f3f4f6",
		200: "#e5e7eb",
		300: "#d1d5db",
		400: "#9ca3af",
		500: "#6b7280",
		600: "#4b5563",
		700: "#374151",
		800: "#1f2937",
		900: "#111827",
	},
};

// Градиенты
export const gradients = {
	primary: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
	secondary: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
	accent: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)",
	success: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
	sunset: "linear-gradient(135deg, #fb923c 0%, #8b5cf6 100%)",
	ocean: "linear-gradient(135deg, #14b8a6 0%, #8b5cf6 100%)",
	fire: "linear-gradient(135deg, #ef4444 0%, #fb923c 100%)",
};

// Типографика
export const typography = {
	fontFamily: {
		sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
		mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
	},

	fontSize: {
		xs: "0.75rem", // 12px
		sm: "0.875rem", // 14px
		base: "1rem", // 16px
		lg: "1.125rem", // 18px
		xl: "1.25rem", // 20px
		"2xl": "1.5rem", // 24px
		"3xl": "1.875rem", // 30px
		"4xl": "2.25rem", // 36px
		"5xl": "3rem", // 48px
	},

	fontWeight: {
		normal: 400,
		medium: 500,
		semibold: 600,
		bold: 700,
		extrabold: 800,
	},

	lineHeight: {
		tight: 1.25,
		normal: 1.5,
		relaxed: 1.75,
	},
};

// Spacing (8px grid)
export const spacing = {
	0: "0",
	1: "0.25rem", // 4px
	2: "0.5rem", // 8px
	3: "0.75rem", // 12px
	4: "1rem", // 16px
	5: "1.25rem", // 20px
	6: "1.5rem", // 24px
	8: "2rem", // 32px
	10: "2.5rem", // 40px
	12: "3rem", // 48px
	16: "4rem", // 64px
	20: "5rem", // 80px
	24: "6rem", // 96px
};

// Shadows
export const shadows = {
	sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
	base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
	md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
	lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
	xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
	"2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
	inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
	glow: "0 0 20px rgba(139, 92, 246, 0.3)",
};

// Border radius
export const borderRadius = {
	none: "0",
	sm: "0.125rem", // 2px
	base: "0.25rem", // 4px
	md: "0.375rem", // 6px
	lg: "0.5rem", // 8px
	xl: "0.75rem", // 12px
	"2xl": "1rem", // 16px
	"3xl": "1.5rem", // 24px
	full: "9999px",
};

// Animation
export const animation = {
	duration: {
		fast: "150ms",
		base: "300ms",
		slow: "500ms",
	},

	timing: {
		ease: "cubic-bezier(0.4, 0, 0.2, 1)",
		easeIn: "cubic-bezier(0.4, 0, 1, 1)",
		easeOut: "cubic-bezier(0, 0, 0.2, 1)",
		easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
};

// Breakpoints
export const breakpoints = {
	sm: "640px",
	md: "768px",
	lg: "1024px",
	xl: "1280px",
	"2xl": "1536px",
};

// Утилиты для CSS-in-JS
export const cssVariables = `
  :root {
    --primary-500: ${colors.primary[500]};
    --primary-600: ${colors.primary[600]};
    --secondary-500: ${colors.secondary[500]};
    --accent-500: ${colors.accent[500]};
    --success-500: ${colors.success[500]};
    --warning-500: ${colors.warning[500]};
    --error-500: ${colors.error[500]};

    --gradient-primary: ${gradients.primary};
    --gradient-secondary: ${gradients.secondary};
    --gradient-sunset: ${gradients.sunset};
    --gradient-ocean: ${gradients.ocean};

    --shadow-sm: ${shadows.sm};
    --shadow-md: ${shadows.md};
    --shadow-lg: ${shadows.lg};
    --shadow-glow: ${shadows.glow};
  }
`;

// Готовые стили для карточек
export const cardStyles = {
	base: {
		backgroundColor: "white",
		borderRadius: borderRadius["2xl"],
		boxShadow: shadows.md,
		padding: spacing[6],
		transition: `all ${animation.duration.base} ${animation.timing.ease}`,
	},

	hover: {
		boxShadow: shadows.lg,
		transform: "translateY(-2px)",
	},

	gradient: {
		background: gradients.sunset,
		color: "white",
		borderRadius: borderRadius["2xl"],
		boxShadow: shadows.lg,
		padding: spacing[6],
	},
};

// Готовые стили для кнопок
export const buttonStyles = {
	primary: {
		background: gradients.primary,
		color: "white",
		borderRadius: borderRadius.lg,
		padding: `${spacing[3]} ${spacing[6]}`,
		fontWeight: typography.fontWeight.semibold,
		boxShadow: shadows.md,
		transition: `all ${animation.duration.base} ${animation.timing.ease}`,
	},

	secondary: {
		background: gradients.secondary,
		color: "white",
		borderRadius: borderRadius.lg,
		padding: `${spacing[3]} ${spacing[6]}`,
		fontWeight: typography.fontWeight.semibold,
		boxShadow: shadows.md,
	},

	accent: {
		background: gradients.accent,
		color: "white",
		borderRadius: borderRadius.lg,
		padding: `${spacing[3]} ${spacing[6]}`,
		fontWeight: typography.fontWeight.semibold,
		boxShadow: shadows.md,
	},
};

export default {
	colors,
	gradients,
	typography,
	spacing,
	shadows,
	borderRadius,
	animation,
	breakpoints,
	cardStyles,
	buttonStyles,
};
