import { defineConfig, devices } from "@playwright/test";

const baseURL =
	process.env.E2E_BASE_URL || "https://proptech-sigma-eight.vercel.app";

export default defineConfig({
	testDir: "./e2e",
	timeout: 60_000,
	expect: { timeout: 15_000 },
	fullyParallel: false,
	retries: process.env.CI ? 1 : 0,
	reporter: [["list"]],
	use: {
		baseURL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		...devices["Desktop Chrome"],
	},
});
