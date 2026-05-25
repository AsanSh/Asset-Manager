import { useCallback, useState } from "react";

export function useColResize(initial: Record<string, number>) {
	const [widths, setWidths] = useState<Record<string, number>>(initial);

	const startResize = useCallback(
		(colKey: string) => (e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			const startX = e.clientX;
			const thEl = (e.currentTarget as HTMLElement).parentElement;
			const startW = thEl ? thEl.offsetWidth : (initial[colKey] ?? 100);

			const onMove = (ev: MouseEvent) => {
				const newW = Math.max(40, startW + ev.clientX - startX);
				setWidths((prev) => ({ ...prev, [colKey]: newW }));
			};
			const onUp = () => {
				window.removeEventListener("mousemove", onMove);
				window.removeEventListener("mouseup", onUp);
			};
			window.addEventListener("mousemove", onMove);
			window.addEventListener("mouseup", onUp);
		},
		[initial],
	);

	return { widths, startResize };
}
