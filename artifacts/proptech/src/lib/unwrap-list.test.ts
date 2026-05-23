import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { unwrapList } from "./unwrap-list.ts";

describe("unwrapList", () => {
	it("returns array as-is", () => {
		const rows = [{ id: 1 }, { id: 2 }];
		assert.deepEqual(unwrapList(rows), rows);
	});

	it("unwraps paginated { data }", () => {
		const rows = [{ id: 3 }];
		assert.deepEqual(unwrapList({ data: rows, meta: { total: 1 } }), rows);
	});

	it("returns empty for invalid payload", () => {
		assert.deepEqual(unwrapList(null), []);
		assert.deepEqual(unwrapList({ data: "nope" }), []);
		assert.deepEqual(unwrapList(undefined), []);
	});
});
