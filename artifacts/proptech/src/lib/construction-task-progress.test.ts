import assert from "node:assert/strict";
import { describe, it } from "node:test";

function computeChecklistProgress(items: { isDone: boolean }[]): number {
	if (items.length === 0) return 0;
	const done = items.filter((i) => i.isDone).length;
	return Math.round((done / items.length) * 100);
}

describe("construction task progress", () => {
	it("checklist progress is ratio of done items", () => {
		assert.equal(
			computeChecklistProgress([
				{ isDone: true },
				{ isDone: false },
				{ isDone: true },
				{ isDone: false },
			]),
			50,
		);
		assert.equal(computeChecklistProgress([]), 0);
		assert.equal(computeChecklistProgress([{ isDone: true }]), 100);
	});
});
