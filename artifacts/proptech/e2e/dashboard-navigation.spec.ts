import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("Dashboard navigation smoke", () => {
	test.beforeEach(() => {
		test.skip(
			!email || !password,
			"Задайте E2E_EMAIL и E2E_PASSWORD для smoke-теста",
		);
	});

	test("login → смена модуля → вкладка Dashboard", async ({ page }) => {
		await page.goto("/login");
		await page.locator('input[type="email"]').fill(email!);
		await page.locator('input[type="password"]').fill(password!);
		await page.locator('button[type="submit"]').click();

		await page.waitForURL(
			/(dashboard|construction|rental|crm|warehouse|properties)/,
			{ timeout: 20_000 },
		);

		// Переключатель модулей (виден при 2+ модулях)
		const moduleSwitcher = page
			.locator("header button")
			.filter({ hasText: /Сводное|Строительство|Аренда|CRM|Закуп/ })
			.first();

		if (await moduleSwitcher.isVisible()) {
			await moduleSwitcher.click();
			await page.getByText("CRM / Продажи", { exact: true }).click();
			await expect(page).toHaveURL(/\/crm\//);
		}

		// Unified Dashboard — смена вкладки
		await page.goto("/dashboard?tab=control");
		await expect(page.getByRole("heading", { name: "Обзор" })).toBeVisible();

		const financeTab = page.getByRole("tab", { name: "Финансы" });
		if (await financeTab.isVisible()) {
			await financeTab.click();
			await expect(page).toHaveURL(/tab=finance/);
		}
	});
});
