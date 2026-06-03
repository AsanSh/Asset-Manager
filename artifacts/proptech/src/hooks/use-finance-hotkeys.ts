import { useEffect } from "react";
import { useLocation } from "wouter";

/** ⌘⇧Z — расход (стройка), ⌘⇧X — добавить доход (панель на Операциях). */
export const FINANCE_HOTKEY_EXPENSE_PATH = "/construction/expenses?create=1";
export const FINANCE_HOTKEY_INCOME_PATH = "/construction/operations?create=income";

export function resolveFinanceHotkeyTarget(
	code: string,
	opts: { metaOrCtrl: boolean; shift: boolean; alt: boolean },
): string | null {
	if (!opts.metaOrCtrl || !opts.shift || opts.alt) return null;
	if (code === "KeyZ") return FINANCE_HOTKEY_EXPENSE_PATH;
	if (code === "KeyX") return FINANCE_HOTKEY_INCOME_PATH;
	return null;
}

export function useFinanceHotkeys(enabled = true) {
	const [, setLocation] = useLocation();

	useEffect(() => {
		if (!enabled) return;

		const onKeyDown = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

			const href = resolveFinanceHotkeyTarget(e.code, {
				metaOrCtrl: e.metaKey || e.ctrlKey,
				shift: e.shiftKey,
				alt: e.altKey,
			});
			if (!href) return;
			e.preventDefault();
			setLocation(href);
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [enabled, setLocation]);
}
