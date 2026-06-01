import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getDefaultDashboardTab,
	resolveDashboardTabs,
} from "./dashboard-access";

describe("dashboard-access", () => {
	it("rental_manager sees only rental tab", () => {
		const tabs = resolveDashboardTabs("rental_manager", [], ["rental"]);
		assert.deepEqual(tabs, ["rental"]);
		assert.equal(
			getDefaultDashboardTab("rental_manager", tabs, ["rental"]),
			"rental",
		);
	});

	it("finance role sees only finance tab", () => {
		const tabs = resolveDashboardTabs("finance", [], [
			"consolidated",
			"rental",
			"construction",
		]);
		assert.deepEqual(tabs, ["finance"]);
	});

	it("pto sees construction tab only", () => {
		const tabs = resolveDashboardTabs("pto", [], ["construction"]);
		assert.deepEqual(tabs, ["construction"]);
	});

	it("company_admin gets tabs from all modules", () => {
		const tabs = resolveDashboardTabs("company_admin", [], [
			"consolidated",
			"construction",
			"rental",
			"warehouse",
			"proptech",
		]);
		assert.ok(tabs.includes("control"));
		assert.ok(tabs.includes("finance"));
		assert.ok(tabs.includes("rental"));
		assert.ok(tabs.includes("supply"));
		assert.ok(tabs.includes("sales"));
	});
});
