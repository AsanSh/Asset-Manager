import { useMemo, useState } from "react";

type SortDir = "asc" | "desc";

export function useSortable<T extends Record<string, any>>(items: T[], defaultKey = "") {
	const [sortKey, setSortKey] = useState(defaultKey);
	const [sortDir, setSortDir] = useState<SortDir>("asc");

	const toggle = (key: string) => {
		if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		else { setSortKey(key); setSortDir("asc"); }
	};

	const sorted = useMemo(() => {
		if (!sortKey) return items;
		return [...items].sort((a, b) => {
			const av = a[sortKey];
			const bv = b[sortKey];
			if (av == null || av === "") return 1;
			if (bv == null || bv === "") return -1;
			const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv), "ru");
			return sortDir === "asc" ? cmp : -cmp;
		});
	}, [items, sortKey, sortDir]);

	return { sorted, sortKey, sortDir, toggle };
}
