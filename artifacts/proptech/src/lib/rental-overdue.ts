import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const AGING_BUCKETS = [
	{ key: "d14", label: "1–14 дн.", min: 1, max: 14, tone: "blue" as const },
	{ key: "d30", label: "15–30", min: 15, max: 30, tone: "amber" as const },
	{ key: "d60", label: "31–60", min: 31, max: 60, tone: "amber" as const },
	{ key: "d90", label: "61–90", min: 61, max: 90, tone: "rose" as const },
	{ key: "d90plus", label: "90+", min: 91, max: Infinity, tone: "rose" as const },
];

const MONTH_NAMES = [
	"Янв", "Фев", "Мар", "Апр", "Май", "Июн",
	"Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
];

export function tenantLabel(tenant: any) {
	return tenant?.fullName || tenant?.name || "—";
}

export function propertyLabel(contract: any) {
	return (
		contract?.propertyAddress ||
		[contract?.projectName, contract?.unitNumber].filter(Boolean).join(" ") ||
		(contract ? `Дог. #${contract.id}` : "—")
	);
}

export function daysOverdue(dueDate: string) {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const due = new Date(dueDate);
	due.setHours(0, 0, 0, 0);
	return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export function fmtCurrency(n: number | string, currency = "KGS") {
	const v = typeof n === "string" ? parseFloat(n) : n;
	if (Number.isNaN(v)) return "0";
	const cur = currency === "USD" ? "USD" : "KGS";
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: cur,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(v);
}

export function fmtNum(n: number) {
	return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

export function fmtDate(date: string) {
	return new Date(date).toLocaleDateString("ru-KG");
}

export function periodLabel(period: string) {
	if (!period) return "—";
	const m = period.match(/^(\d{4})-(\d{2})$/);
	if (!m) return period;
	const month = parseInt(m[2], 10) - 1;
	return `${MONTH_NAMES[month] ?? m[2]} ${m[1]}`;
}

export function agingBucketKey(days: number): string {
	for (const b of AGING_BUCKETS) {
		if (days >= b.min && days <= b.max) return b.key;
	}
	return AGING_BUCKETS[0].key;
}

export function debtSeverity(days: number) {
	if (days > 60) return "critical";
	if (days > 30) return "high";
	if (days > 14) return "medium";
	return "low";
}

export interface OverdueItem {
	id: number;
	leaseContractId: number;
	period: string;
	amount: string;
	balance: string;
	dueDate: string;
	currency: string;
	contract: any;
	tenant: any;
	days: number;
}

export interface ContractDebtRow {
	key: string;
	contractId: number;
	tenantName: string;
	propertyLabel: string;
	phone: string;
	buckets: Record<string, number>;
	periods: Record<string, number>;
	total: number;
	maxDays: number;
	items: OverdueItem[];
	currency: string;
}

export function useRentalOverdue(search = "") {
	const { data: accruals = [], isLoading } = useQuery<any[]>({
		queryKey: ["rental-accruals"],
		queryFn: () => api.get("/rental/accruals").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery<any[]>({
		queryKey: ["rental-contracts"],
		queryFn: () => api.get("/rental/contracts").then((r) => r.data),
	});
	const { data: tenants = [] } = useQuery<any[]>({
		queryKey: ["rental-tenants"],
		queryFn: () => api.get("/rental/tenants").then((r) => r.data),
	});

	const today = new Date().toISOString().split("T")[0];

	const overdueItems = useMemo(() => {
		const accrualsArray = Array.isArray(accruals) ? accruals : [];
		const contractsArray = Array.isArray(contracts) ? contracts : [];
		const tenantsArray = Array.isArray(tenants) ? tenants : [];

		return accrualsArray
			.filter((a) => parseFloat(a.balance || "0") > 0 && a.dueDate < today)
			.map((a) => {
				const contract = contractsArray.find((c) => c.id === a.leaseContractId);
				const tenant = contract
					? tenantsArray.find((t) => t.id === contract.tenantId)
					: null;
				const days = daysOverdue(a.dueDate);
				return {
					...a,
					contract,
					tenant,
					days,
				} as OverdueItem;
			})
			.filter((a) => {
				if (!search) return true;
				const q = search.toLowerCase();
				return (
					tenantLabel(a.tenant).toLowerCase().includes(q) ||
					propertyLabel(a.contract).toLowerCase().includes(q) ||
					(a.period || "").toLowerCase().includes(q)
				);
			})
			.sort((a, b) => b.days - a.days);
	}, [accruals, contracts, tenants, today, search]);

	const contractRows = useMemo(() => {
		const map = new Map<number, ContractDebtRow>();

		for (const item of overdueItems) {
			const cid = item.leaseContractId;
			let row = map.get(cid);
			if (!row) {
				row = {
					key: `c-${cid}`,
					contractId: cid,
					tenantName: tenantLabel(item.tenant),
					propertyLabel: propertyLabel(item.contract),
					phone: item.tenant?.phone || "",
					buckets: Object.fromEntries(AGING_BUCKETS.map((b) => [b.key, 0])),
					periods: {},
					total: 0,
					maxDays: 0,
					items: [],
					currency: item.currency || "KGS",
				};
				map.set(cid, row);
			}

			const balance = parseFloat(item.balance || "0") || 0;
			const bucket = agingBucketKey(item.days);
			row.buckets[bucket] = (row.buckets[bucket] || 0) + balance;
			if (item.period) {
				row.periods[item.period] = (row.periods[item.period] || 0) + balance;
			}
			row.total += balance;
			row.maxDays = Math.max(row.maxDays, item.days);
			row.items.push(item);
		}

		return Array.from(map.values()).sort((a, b) => b.total - a.total);
	}, [overdueItems]);

	const periodColumns = useMemo(() => {
		const set = new Set<string>();
		for (const item of overdueItems) {
			if (item.period) set.add(item.period);
		}
		return Array.from(set).sort((a, b) => b.localeCompare(a)).slice(0, 8);
	}, [overdueItems]);

	const agingTotals = useMemo(() => {
		const totals = Object.fromEntries(AGING_BUCKETS.map((b) => [b.key, 0]));
		for (const row of contractRows) {
			for (const b of AGING_BUCKETS) {
				totals[b.key] += row.buckets[b.key] || 0;
			}
		}
		return totals;
	}, [contractRows]);

	const totalDebt = overdueItems.reduce(
		(s, a) => s + (parseFloat(a.balance || "0") || 0),
		0,
	);
	const debtorCount = contractRows.length;
	const criticalCount = contractRows.filter((r) => r.maxDays > 60).length;
	const mildCount = contractRows.filter((r) => r.maxDays <= 10).length;

	return {
		isLoading,
		overdueItems,
		contractRows,
		periodColumns,
		agingTotals,
		totalDebt,
		debtorCount,
		criticalCount,
		mildCount,
	};
}

export function useRentalOverdueSearch() {
	const [search, setSearch] = useState("");
	const data = useRentalOverdue(search);
	return { ...data, search, setSearch };
}

export function sortDebtRows(
	rows: ContractDebtRow[],
	sortKey: string,
	sortDir: "asc" | "desc",
) {
	if (!sortKey) return rows;
	const mul = sortDir === "asc" ? 1 : -1;
	return [...rows].sort((a, b) => {
		const getVal = (row: ContractDebtRow): number | string => {
			if (sortKey.startsWith("p-")) return row.periods[sortKey.slice(2)] || 0;
			if (AGING_BUCKETS.some((x) => x.key === sortKey)) return row.buckets[sortKey] || 0;
			return (row as unknown as Record<string, unknown>)[sortKey] as number | string;
		};
		const av = getVal(a);
		const bv = getVal(b);
		if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
		return String(av).localeCompare(String(bv), "ru") * mul;
	});
}
