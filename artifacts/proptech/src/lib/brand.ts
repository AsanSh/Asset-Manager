/** Брендинг платформы (не названия tenant-компаний в БД). */
export const BRAND = {
	name: "Planalityc.ai",
	shortName: "Planalityc",
	tagline: "Аналитика и управление активами",
	taglineShort: "Платформа управления",
	supportEmail: "support@planalityc.ai",
	infoEmail: "info@planalityc.ai",
	copyright: (year = new Date().getFullYear()) =>
		`© ${year} Planalityc.ai. Все права защищены.`,
} as const;
