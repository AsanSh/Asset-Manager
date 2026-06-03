import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	FINANCE_HOTKEY_EXPENSE_PATH,
	FINANCE_HOTKEY_INCOME_PATH,
	resolveFinanceHotkeyTarget,
} from "./use-finance-hotkeys";

describe("resolveFinanceHotkeyTarget", () => {
	it("⌘⇧Z открывает расход, ⌘⇧X — панель дохода", () => {
		assert.equal(
			resolveFinanceHotkeyTarget("KeyZ", { metaOrCtrl: true, shift: true }),
			FINANCE_HOTKEY_EXPENSE_PATH,
		);
		assert.equal(
			resolveFinanceHotkeyTarget("KeyX", { metaOrCtrl: true, shift: true }),
			FINANCE_HOTKEY_INCOME_PATH,
		);
	});

	it("старые ⌘⇧R и ⌘⇧D не срабатывают", () => {
		assert.equal(resolveFinanceHotkeyTarget("KeyR", { metaOrCtrl: true, shift: true }), null);
		assert.equal(resolveFinanceHotkeyTarget("KeyD", { metaOrCtrl: true, shift: true }), null);
	});

	it("без модификаторов — null", () => {
		assert.equal(
			resolveFinanceHotkeyTarget("KeyZ", { metaOrCtrl: false, shift: false, alt: false }),
			null,
		);
		assert.equal(
			resolveFinanceHotkeyTarget("KeyZ", { metaOrCtrl: true, shift: false, alt: false }),
			null,
		);
	});
});
