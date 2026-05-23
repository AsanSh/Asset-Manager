import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, "../App.tsx"), "utf8");

const REQUIRED_ROUTES = [
	"/platform-admin",
	"/platform-admin/companies",
	"/construction/projects",
	"/construction/dashboard",
	"/construction/stages",
	"/construction/operations",
	"/construction/chess",
	"/construction/budget",
	"/crm/dashboard",
	"/warehouse/dashboard",
	"/rental/dashboard",
	"/login",
	"/register",
];

describe("routes audit", () => {
	it("App.tsx declares critical routes", () => {
		for (const path of REQUIRED_ROUTES) {
			assert.ok(
				appSource.includes(`path="${path}"`),
				`missing route ${path}`,
			);
		}
	});

	it("construction projects page uses unwrapList", () => {
		const projectsSource = readFileSync(
			join(__dirname, "../pages/construction/projects.tsx"),
			"utf8",
		);
		assert.ok(projectsSource.includes("unwrapList"));
		assert.ok(!/const projects = response\?\.data/.test(projectsSource));
	});
});
