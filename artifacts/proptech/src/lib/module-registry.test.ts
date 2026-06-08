import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	canonicalModulesFromUiModules,
	isModuleIntegrationEnabled,
	moduleIdFromSettingsKey,
	settingsKeysToModuleIds,
} from "./module-registry";

describe("module-registry", () => {
	it("maps backend settings keys to current UI modules", () => {
		assert.equal(moduleIdFromSettingsKey("construction"), "construction");
		assert.equal(moduleIdFromSettingsKey("sales"), "construction");
		assert.equal(moduleIdFromSettingsKey("finance"), "finance");
		assert.equal(moduleIdFromSettingsKey("reports"), "finance");
		assert.equal(moduleIdFromSettingsKey("crm"), "proptech");
		assert.equal(moduleIdFromSettingsKey("warehouse"), "warehouse");
		assert.equal(moduleIdFromSettingsKey("rental"), "rental");
		assert.equal(moduleIdFromSettingsKey("unknown"), null);
	});

	it("builds enabled UI modules from tenant settings keys", () => {
		assert.deepEqual(settingsKeysToModuleIds(["rental"]), ["rental"]);
		assert.deepEqual(settingsKeysToModuleIds(["warehouse"]), ["warehouse"]);
		assert.deepEqual(
			settingsKeysToModuleIds(["construction", "sales", "reports"]),
			["construction", "finance", "consolidated"],
		);
		assert.deepEqual(
			settingsKeysToModuleIds(["construction", "warehouse", "crm"]),
			["construction", "warehouse", "proptech", "consolidated"],
		);
		assert.equal(settingsKeysToModuleIds([]), null);
	});

	it("derives canonical modules for integration checks", () => {
		assert.deepEqual(
			canonicalModulesFromUiModules(["construction", "warehouse"]).sort(),
			["construction", "procurement"].sort(),
		);
		assert.deepEqual(
			canonicalModulesFromUiModules(["rental"]).sort(),
			["investors", "rent"].sort(),
		);
	});

	it("enables integrations only when all required modules are active", () => {
		assert.equal(
			isModuleIntegrationEnabled(["construction", "warehouse"], "construction.procurement"),
			true,
		);
		assert.equal(
			isModuleIntegrationEnabled(["construction"], "construction.procurement"),
			false,
		);
		assert.equal(
			isModuleIntegrationEnabled(["construction", "finance"], "construction.finance"),
			true,
		);
		assert.equal(
			isModuleIntegrationEnabled(["construction"], "construction.finance"),
			false,
		);
		assert.equal(
			isModuleIntegrationEnabled(["rental"], "rent.finance"),
			false,
		);
	});
});
