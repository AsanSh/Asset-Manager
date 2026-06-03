import { useEffect } from "react";
import { useLocation } from "wouter";

/** ⌘⇧Z — фактический расход (стройка), ⌘⇧X — доход (ОДДС) */
export function useFinanceHotkeys(enabled = true) {
	const [, setLocation] = useLocation();

	useEffect(() => {
		if (!enabled) return;

		const onKeyDown = (e: KeyboardEvent) => {
			const mod = e.metaKey || e.ctrlKey;
			if (!mod || !e.shiftKey || e.altKey) return;

			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

			const key = e.key.toLowerCase();
			if (key === "z") {
				e.preventDefault();
				setLocation("/construction/expenses?create=1");
				return;
			}
			if (key === "x") {
				e.preventDefault();
				setLocation("/construction/operations?quick=income");
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [enabled, setLocation]);
}
