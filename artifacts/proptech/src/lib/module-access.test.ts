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
			"construction",
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
		assert.equal(canAccessPath("/crm/leads", mods, "company_admin"), true);
		assert.equal(canAccessPath("/warehouse/marketplace", mods, "company_admin"), true);
	});
});
