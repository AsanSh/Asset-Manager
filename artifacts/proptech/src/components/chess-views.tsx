import {
	ChevronDown,
	ChevronRight,
	Search,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Fragment, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { badgeCfgFor, type StatusBadgeCfg } from "@/lib/unit-statuses";
import { cn } from "@/lib/utils";

const CHESS_TH =
	"text-[10px] font-semibold uppercase tracking-wide text-am-text-muted h-9";

export type UnitContract = {
	id: number;
	contractNumber: string | null;
	buyerName: string | null;
	buyerPhone: string | null;
	totalAmount: string;
	paidAmount: string;
	remainingAmount: string;
	downPayment?: string;
	status: string;
	contractDate: string | null;
	currency: string;
};

export type OverviewUnit = {
	id: number;
	unitNumber: string;
	floor?: number | null;
	block?: string | null;
	unitType: string;
	roomCount?: number | null;
	area?: string | null;
	pricePerSqm?: string | null;
	totalPrice?: string | null;
	basePricePerSqm?: string | null;
	saleCoefficient?: string | null;
	approvedSalePricePerSqm?: string | null;
	approvedTotalPrice?: string | null;
	isPublishedForSale?: boolean | null;
	currency: string;
	status: string;
	notes?: string | null;
	contract: UnitContract | null;
};

function fmt(n: string | number | null | undefined) {
	const v = parseFloat(String(n ?? "0"));
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(v);
}

function contractAmount(u: OverviewUnit) {
	const c = u.contract;
	if (c) return parseFloat(c.totalAmount || "0");
	return parseFloat(u.totalPrice || "0");
}

function paidAmount(u: OverviewUnit) {
	return parseFloat(u.contract?.paidAmount || "0");
}

function remainingAmount(u: OverviewUnit) {
	const c = u.contract;
	if (c) return parseFloat(c.remainingAmount || "0");
	const total = contractAmount(u);
	const paid = paidAmount(u);
	return Math.max(0, total - paid);
}

export function ChessByUnitView({
	units,
	onSelectUnit,
	statusBadgeMap,
}: {
	units: OverviewUnit[];
	onSelectUnit: (u: OverviewUnit) => void;
	statusBadgeMap: Record<string, StatusBadgeCfg>;
}) {
	const sorted = useMemo(
		() =>
			[...units].sort(
				(a, b) =>
					(b.floor || 0) - (a.floor || 0) ||
					a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }),
			),
		[units],
	);

	const columns = useMemo<ColumnDef<OverviewUnit, unknown>[]>(
		() => [
			{
				id: "unitNumber",
				header: "Квартира",
				size: 90,
				accessorKey: "unitNumber",
				meta: { exportLabel: "Квартира", pinned: "left" },
				cell: ({ row }) => (
					<span className="font-mono font-medium">{row.original.unitNumber}</span>
				),
			},
			{
				id: "floor",
				header: "Этаж / секция",
				size: 120,
				accessorFn: (row) => `${row.floor || ""} ${row.block || ""}`,
				meta: { exportLabel: "Этаж / секция" },
				cell: ({ row }) => (
					<span className="text-sm text-am-text-muted">
						{row.original.floor ? `${row.original.floor} эт.` : "—"}
						{row.original.block ? ` · ${row.original.block}` : ""}
					</span>
				),
			},
			{
				id: "area",
				header: "Площадь",
				size: 90,
				accessorFn: (row) => row.area || "",
				meta: { exportLabel: "Площадь" },
				cell: ({ row }) => (
					<>
						{row.original.area ? `${row.original.area} м²` : "—"}
						{row.original.roomCount ? (
							<span className="text-xs text-am-text-muted ml-1">
								{row.original.roomCount}к
							</span>
						) : null}
					</>
				),
			},
			{
				id: "status",
				header: "Статус",
				size: 110,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => {
					const st = badgeCfgFor(statusBadgeMap, row.original.status);
					return (
						<Badge variant="outline" className={st.color}>
							{st.label}
						</Badge>
					);
				},
			},
			{
				id: "buyer",
				header: "Контрагент",
				size: 180,
				minSize: 140,
				maxSize: 360,
				accessorFn: (row) => row.contract?.buyerName || "",
				meta: { exportLabel: "Контрагент", grow: true },
				cell: ({ row }) =>
					row.original.contract?.buyerName ? (
						<div className="min-w-0">
							<p className="font-medium text-sm truncate" title={row.original.contract.buyerName}>
								{row.original.contract.buyerName}
							</p>
							{row.original.contract.buyerPhone && (
								<p className="text-xs text-am-text-muted truncate">
									{row.original.contract.buyerPhone}
								</p>
							)}
							{row.original.contract.contractNumber && (
								<p className="text-xs text-am-text-muted font-mono truncate">
									{row.original.contract.contractNumber}
								</p>
							)}
						</div>
					) : (
						<span className="text-am-text-muted text-sm">—</span>
					),
			},
			{
				id: "contractTotal",
				header: "Сумма договора",
				size: 130,
				accessorFn: (row) => contractAmount(row),
				meta: { exportLabel: "Сумма договора", align: "right", financeAmount: true },
				cell: ({ row }) => {
					const cur = row.original.contract?.currency || row.original.currency;
					const amt = contractAmount(row.original);
					return (
						<span className="tabular-nums">
							{amt > 0 ? `${fmt(amt)} ${cur}` : "—"}
						</span>
					);
				},
			},
			{
				id: "paid",
				header: "Оплачено",
				size: 110,
				accessorFn: (row) => paidAmount(row),
				meta: { exportLabel: "Оплачено", align: "right", financeAmount: true },
				cell: ({ row }) => (
					<span className="tabular-nums text-emerald-600">
						{paidAmount(row.original) > 0 ? fmt(paidAmount(row.original)) : "0"}
					</span>
				),
			},
			{
				id: "remaining",
				header: "Остаток",
				size: 110,
				accessorFn: (row) => remainingAmount(row),
				meta: { exportLabel: "Остаток", align: "right", financeAmount: true, pinned: "right" },
				cell: ({ row }) => (
					<span className="tabular-nums font-semibold text-amber-600">
						{remainingAmount(row.original) > 0
							? fmt(remainingAmount(row.original))
							: "0"}
					</span>
				),
			},
		],
		[statusBadgeMap],
	);

	return (
		<DataTable
			tableId="chess-by-unit"
			columns={columns}
			data={sorted}
			enableSearch
			searchPlaceholder="Поиск квартиры, контрагента…"
			onRowClick={onSelectUnit}
			initialSorting={[{ id: "unitNumber", desc: false }]}
			emptyState={<p className="py-12 text-center text-am-text-muted">Нет квартир</p>}
		/>
	);
}

type BuyerGroup = {
	key: string;
	name: string;
	phone: string;
	units: OverviewUnit[];
	totalContract: number;
	totalPaid: number;
	totalRemaining: number;
	currency: string;
};

export function ChessByCounterpartyView({
	units,
	onSelectUnit,
	statusBadgeMap,
}: {
	units: OverviewUnit[];
	onSelectUnit: (u: OverviewUnit) => void;
	statusBadgeMap: Record<string, StatusBadgeCfg>;
}) {
	const [search, setSearch] = useState("");
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

	const groups = useMemo(() => {
		const map = new Map<string, BuyerGroup>();
		for (const u of units) {
			const name = u.contract?.buyerName?.trim() || "";
			if (!name) continue;
			const key = name.toLowerCase();
			if (!map.has(key)) {
				map.set(key, {
					key,
					name,
					phone: u.contract?.buyerPhone || "",
					units: [],
					totalContract: 0,
					totalPaid: 0,
					totalRemaining: 0,
					currency: u.contract?.currency || u.currency,
				});
			}
			const g = map.get(key)!;
			g.units.push(u);
			g.totalContract += contractAmount(u);
			g.totalPaid += paidAmount(u);
			g.totalRemaining += remainingAmount(u);
		}
		return [...map.values()].sort((a, b) =>
			a.name.localeCompare(b.name, "ru"),
		);
	}, [units]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return groups;
		return groups.filter(
			(g) =>
				g.name.toLowerCase().includes(q) ||
				g.phone.includes(q) ||
				g.units.some(
					(u) =>
						u.unitNumber.toLowerCase().includes(q) ||
						u.contract?.contractNumber?.toLowerCase().includes(q),
				),
		);
	}, [groups, search]);

	const toggle = (key: string) => {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	if (groups.length === 0) {
		return (
			<div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-600">
				<p>Нет проданных или забронированных квартир с покупателем</p>
				<p className="text-sm mt-1">
					Оформите бронь или продажу через карточку квартиры
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="relative max-w-sm">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
				<Input
					placeholder="Поиск покупателя, телефона, квартиры..."
					className="pl-9 h-9"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
			</div>
			<div className="bg-white rounded-xl border border-gray-200 overflow-auto">
				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
							<TableHead className={cn("w-10", CHESS_TH)} />
							<TableHead className={CHESS_TH}>Контрагент</TableHead>
							<TableHead className={CHESS_TH}>Квартир</TableHead>
							<TableHead className={cn(CHESS_TH, "text-right")}>
								Сумма договоров
							</TableHead>
							<TableHead className={cn(CHESS_TH, "text-right")}>Оплачено</TableHead>
							<TableHead className={cn(CHESS_TH, "text-right")}>Остаток</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center py-8 text-gray-600">
									Ничего не найдено
								</TableCell>
							</TableRow>
						) : (
							filtered.map((g) => {
								const open = expanded.has(g.key);
								return (
									<Fragment key={g.key}>
										<TableRow
											className="cursor-pointer hover:bg-amber-50/40"
											onClick={() => toggle(g.key)}
										>
											<TableCell>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="h-7 w-7 p-0"
													onClick={(e) => {
														e.stopPropagation();
														toggle(g.key);
													}}
												>
													{open ? (
														<ChevronDown className="w-4 h-4" />
													) : (
														<ChevronRight className="w-4 h-4" />
													)}
												</Button>
											</TableCell>
											<TableCell>
												<p className="font-medium">{g.name}</p>
												{g.phone && (
													<p className="text-xs text-gray-600">{g.phone}</p>
												)}
											</TableCell>
											<TableCell>{g.units.length}</TableCell>
											<TableCell className="text-right font-mono">
												{fmt(g.totalContract)} {g.currency}
											</TableCell>
											<TableCell className="text-right font-mono text-emerald-600">
												{fmt(g.totalPaid)}
											</TableCell>
											<TableCell className="text-right font-mono font-bold text-amber-600">
												{fmt(g.totalRemaining)}
											</TableCell>
										</TableRow>
										{open && (
											<TableRow>
												<TableCell colSpan={6} className="p-0 bg-gray-50/80">
													<Table>
														<TableHeader>
															<TableRow className="bg-white hover:bg-white">
																<TableHead className={CHESS_TH}>Квартира</TableHead>
																<TableHead className={CHESS_TH}>Этаж</TableHead>
																<TableHead className={CHESS_TH}>Договор</TableHead>
																<TableHead className={cn(CHESS_TH, "text-right")}>
																	Сумма
																</TableHead>
																<TableHead className={cn(CHESS_TH, "text-right")}>
																	Оплачено
																</TableHead>
																<TableHead className={cn(CHESS_TH, "text-right")}>
																	Остаток
																</TableHead>
																<TableHead className={CHESS_TH}>Статус</TableHead>
															</TableRow>
														</TableHeader>
														<TableBody>
															{g.units.map((u) => {
																const st =
																	badgeCfgFor(statusBadgeMap, u.status);
																const cur =
																	u.contract?.currency || u.currency;
																return (
																	<TableRow
																		key={u.id}
																		className="cursor-pointer hover:bg-white"
																		onClick={() => onSelectUnit(u)}
																	>
																		<TableCell className="font-mono font-medium">
																			{u.unitNumber}
																		</TableCell>
																		<TableCell>
																			{u.floor ? `${u.floor} эт.` : "—"}
																		</TableCell>
																		<TableCell className="text-xs font-mono text-gray-500">
																			{u.contract?.contractNumber || "—"}
																		</TableCell>
																		<TableCell className="text-right font-mono">
																			{fmt(contractAmount(u))} {cur}
																		</TableCell>
																		<TableCell className="text-right font-mono text-emerald-600">
																			{fmt(paidAmount(u))}
																		</TableCell>
																		<TableCell className="text-right font-mono text-amber-600">
																			{fmt(remainingAmount(u))}
																		</TableCell>
																		<TableCell>
																			<Badge
																				variant="outline"
																				className={st.color}
																			>
																				{st.label}
																			</Badge>
																		</TableCell>
																	</TableRow>
																);
															})}
														</TableBody>
													</Table>
												</TableCell>
											</TableRow>
										)}
									</Fragment>
								);
							})
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
