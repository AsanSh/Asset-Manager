import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	canAccessPath,
	detectModuleFromPath,
	resolveAllowedModules,
} from "./module-access";

describe("module-access", () => {
	it("detectModuleFromPath maps dashboard tabs to modules", () => {
		assert.equal(
			detectModuleFromPath("/dashboard?tab=rental"),
			"rental",
		);
		assert.equal(
			detectModuleFromPath("/dashboard?tab=sales"),
			"proptech",
		);
		assert.equal(
			detectModuleFromPath("/dashboard?tab=supply"),
			"warehouse",
		);
		assert.equal(
			detectModuleFromPath("/dashboard?tab=finance"),
			"finance",
		);
		assert.equal(
			detectModuleFromPath("/dashboard?tab=control"),
			"consolidated",
		);
	});

	it("detectModuleFromPath uses URL prefixes", () => {
		assert.equal(detectModuleFromPath("/crm/leads"), "proptech");
		assert.equal(detectModuleFromPath("/rental/tenants"), "rental");
		assert.equal(detectModuleFromPath("/warehouse/items"), "warehouse");
		assert.equal(detectModuleFromPath("/construction/projects"), "construction");
		assert.equal(detectModuleFromPath("/construction/accounts"), "finance");
		assert.equal(detectModuleFromPath("/construction/analytics/cashflow"), "finance");
	});

	it("rental_manager cannot open finance dashboard tab", () => {
		const mods = resolveAllowedModules("rental_manager");
		assert.deepEqual(mods, ["rental"]);
		assert.equal(
			canAccessPath("/dashboard?tab=finance", mods, "rental_manager"),
			false,
		);
		assert.equal(
			canAccessPath("/dashboard?tab=rental", mods, "rental_manager"),
			true,
		);
		assert.equal(canAccessPath("/crm/leads", mods, "rental_manager"), false);
		assert.equal(canAccessPath("/rental/properties", mods, "rental_manager"), true);
	});

	it("company_admin can access all module paths", () => {
		const mods = resolveAllowedModules("company_admin");
		assert.ok(mods.includes("warehouse"));
		assert.ok(mods.includes("finance"));
		assert.equal(canAccessPath("/crm/leads", mods, "company_admin"), true);
		assert.equal(canAccessPath("/warehouse/marketplace", mods, "company_admin"), true);
	});

	it("finance role opens finance pages without construction module", () => {
		const mods = resolveAllowedModules("finance");
		assert.deepEqual(mods, ["finance"]);
		assert.equal(canAccessPath("/dashboard?tab=finance", mods, "finance"), true);
		assert.equal(canAccessPath("/construction/accounts", mods, "finance"), true);
		assert.equal(canAccessPath("/construction/projects", mods, "finance"), false);
	});
});
