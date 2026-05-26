import { useEffect, useState } from "react";

export type RentalViewMode = "report" | "classic";

export function useRentalViewMode(pageId: string): [RentalViewMode, (mode: RentalViewMode) => void] {
	const storageKey = `rental-view-${pageId}`;

	const [mode, setModeState] = useState<RentalViewMode>(() => {
		if (typeof window === "undefined") return "report";
		const saved = localStorage.getItem(storageKey) as RentalViewMode | null;
		return saved === "classic" ? "classic" : "report";
	});

	useEffect(() => {
		localStorage.setItem(storageKey, mode);
	}, [mode, storageKey]);

	return [mode, setModeState];
}
