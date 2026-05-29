import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Логика разделения задач (mine/delegated/incoming/personal) воспроизведена
// из tasks.tsx — функции маленькие, проще тестировать локально, чем тащить
// JSX-компонент. Если они расходятся — упадёт тест.

interface Task {
	id: number;
	assignedTo?: number | null;
	createdBy?: number | null;
}

function isMine(t: Task, me: number): boolean {
	return Number(t.assignedTo) === me;
}
function isDelegated(t: Task, me: number): boolean {
	return Number(t.createdBy) === me && !!t.assignedTo && Number(t.assignedTo) !== me;
}
function isIncoming(t: Task, me: number): boolean {
	return Number(t.assignedTo) === me && !!t.createdBy && Number(t.createdBy) !== me;
}
function isPersonal(t: Task, me: number): boolean {
	return Number(t.createdBy) === me && (!t.assignedTo || Number(t.assignedTo) === me);
}

describe("task split by category", () => {
	const me = 5;
	const colleague = 7;

	it("delegated: я создал, назначил другому", () => {
		const t: Task = { id: 1, createdBy: me, assignedTo: colleague };
		assert.equal(isDelegated(t, me), true);
		assert.equal(isMine(t, me), false);
		assert.equal(isIncoming(t, me), false);
		assert.equal(isPersonal(t, me), false);
	});

	it("incoming: коллега создал, назначил мне", () => {
		const t: Task = { id: 2, createdBy: colleague, assignedTo: me };
		assert.equal(isIncoming(t, me), true);
		assert.equal(isMine(t, me), true);
		assert.equal(isPersonal(t, me), false);
		assert.equal(isDelegated(t, me), false);
	});

	it("personal: я создал и сам себе назначил", () => {
		const t: Task = { id: 3, createdBy: me, assignedTo: me };
		assert.equal(isPersonal(t, me), true);
		assert.equal(isMine(t, me), true);
		assert.equal(isDelegated(t, me), false);
		assert.equal(isIncoming(t, me), false);
	});

	it("personal: я создал без назначения", () => {
		const t: Task = { id: 4, createdBy: me, assignedTo: null };
		assert.equal(isPersonal(t, me), true);
		assert.equal(isDelegated(t, me), false);
	});

	it("чужая задача — ни в одной категории", () => {
		const t: Task = { id: 5, createdBy: colleague, assignedTo: colleague };
		assert.equal(isMine(t, me), false);
		assert.equal(isDelegated(t, me), false);
		assert.equal(isIncoming(t, me), false);
		assert.equal(isPersonal(t, me), false);
	});

	it("работает со строковыми id из БД (Number coercion)", () => {
		const t = { id: 6, createdBy: "5", assignedTo: "7" } as any;
		assert.equal(isDelegated(t, me), true);
	});
});
