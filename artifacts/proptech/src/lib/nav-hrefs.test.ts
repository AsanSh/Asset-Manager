import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getModuleDashboardHref } from "./dashboard-access";
import { resolveNavItemHref } from "./nav-hrefs";

describe("nav-hrefs", () => {
	it("resolveNavItemHref rewrites dashboard links by role", () => {
		const href = resolveNavItemHref(
			{ href: "/dashboard?tab=control" },
			"rental",
			"rental_manager",
			[],
			["rental"],
		);
		assert.equal(href, getModuleDashboardHref("rental", "rental_manager", [], ["rental"]));
		assert.equal(href, "/dashboard?tab=rental");
	});

	it("resolveNavItemHref leaves module paths unchanged", () => {
		assert.equal(
			resolveNavItemHref(
				{ href: "/crm/leads" },
				"proptech",
				"company_admin",
				[],
				["proptech"],
			),
			"/crm/leads",
		);
	});
});
