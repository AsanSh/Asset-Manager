import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	canQuickCreateAction,
	resolveQuickActions,
} from "./quick-create-access";

describe("quick-create-access", () => {
	it("finance role sees only finance-related construction actions", () => {
		const actions = resolveQuickActions(
			"construction",
			"finance",
			[],
			["consolidated", "rental", "construction"],
		);
		const labels = actions.map((a) => a.label);
		assert.ok(labels.includes("Новая операция"));
		assert.ok(labels.includes("Согласование"));
		assert.ok(!labels.includes("Новый проект"));
		assert.ok(!labels.includes("Новый договор"));
	});

	it("custom role without write permissions gets no create items", () => {
		const actions = resolveQuickActions(
			"construction",
			"custom:99",
			["finance.read", "construction.read"],
			["construction"],
		);
		assert.equal(actions.length, 0);
	});

	it("custom role with finance.write can create operations", () => {
		const actions = resolveQuickActions(
			"construction",
			"custom:99",
			["finance.write"],
			["construction"],
		);
		assert.deepEqual(actions.map((a) => a.label), [
			"Новая операция",
			"Согласование",
		]);
	});

	it("admin sees all construction quick actions", () => {
		const actions = resolveQuickActions(
			"construction",
			"company_admin",
			[],
			["construction"],
		);
		assert.equal(actions.length, 5);
	});

	it("canQuickCreateAction respects path access", () => {
		const ok = canQuickCreateAction(
			{
				label: "Новая операция",
				href: "/construction/operations",
				anyPermissions: ["finance.write"],
			},
			"finance",
			[],
			["consolidated"],
		);
		assert.equal(ok, false);
	});
});
