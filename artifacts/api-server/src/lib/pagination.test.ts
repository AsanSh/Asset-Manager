import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createPaginatedResponse, getPaginationParams } from "./pagination.ts";

describe("pagination", () => {
	it("getPaginationParams defaults", () => {
		const req = { query: {} } as Parameters<typeof getPaginationParams>[0];
		const p = getPaginationParams(req);
		assert.equal(p.page, 1);
		assert.equal(p.limit, 20);
		assert.equal(p.offset, 0);
	});

	it("createPaginatedResponse shape", () => {
		const res = createPaginatedResponse([{ id: 1 }], 1, {
			page: 1,
			limit: 20,
			offset: 0,
		});
		assert.deepEqual(res.data, [{ id: 1 }]);
		assert.equal(res.meta.total, 1);
		assert.equal(res.meta.hasNextPage, false);
	});
});
