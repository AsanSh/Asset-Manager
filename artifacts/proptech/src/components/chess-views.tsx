import {
	ChevronDown,
	ChevronRight,
	Search,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
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

	return (
		<div className="bg-white rounded-xl border border-gray-200 overflow-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Квартира</TableHead>
						<TableHead>Этаж / секция</TableHead>
						<TableHead>Площадь</TableHead>
						<TableHead>Статус</TableHead>
						<TableHead>Контрагент</TableHead>
						<TableHead className="text-right">Сумма договора</TableHead>
						<TableHead className="text-right">Оплачено</TableHead>
						<TableHead className="text-right">Остаток</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sorted.length === 0 ? (
						<TableRow>
							<TableCell colSpan={8} className="text-center py-12 text-gray-400">
								Нет квартир
							</TableCell>
						</TableRow>
					) : (
						sorted.map((u) => {
							const st = badgeCfgFor(statusBadgeMap, u.status);
							const cur = u.contract?.currency || u.currency;
							return (
								<TableRow
									key={u.id}
									className="cursor-pointer hover:bg-amber-50/50"
									onClick={() => onSelectUnit(u)}
								>
									<TableCell className="font-mono font-medium">
										{u.unitNumber}
									</TableCell>
									<TableCell className="text-sm text-gray-600">
										{u.floor ? `${u.floor} эт.` : "—"}
										{u.block ? ` · ${u.block}` : ""}
									</TableCell>
									<TableCell>
										{u.area ? `${u.area} м²` : "—"}
										{u.roomCount ? (
											<span className="text-xs text-gray-400 ml-1">
												{u.roomCount}к
											</span>
										) : null}
									</TableCell>
									<TableCell>
										<Badge variant="outline" className={st.color}>
											{st.label}
										</Badge>
									</TableCell>
									<TableCell>
										{u.contract?.buyerName ? (
											<div>
												<p className="font-medium text-sm">
													{u.contract.buyerName}
												</p>
												{u.contract.buyerPhone && (
													<p className="text-xs text-gray-400">
														{u.contract.buyerPhone}
													</p>
												)}
												{u.contract.contractNumber && (
													<p className="text-xs text-gray-400 font-mono">
														{u.contract.contractNumber}
													</p>
												)}
											</div>
										) : (
											<span className="text-gray-400 text-sm">—</span>
										)}
									</TableCell>
									<TableCell className="text-right font-mono">
										{contractAmount(u) > 0
											? `${fmt(contractAmount(u))} ${cur}`
											: "—"}
									</TableCell>
									<TableCell className="text-right font-mono text-emerald-600">
										{paidAmount(u) > 0 ? fmt(paidAmount(u)) : "0"}
									</TableCell>
									<TableCell className="text-right font-mono font-bold text-amber-600">
										{remainingAmount(u) > 0 ? fmt(remainingAmount(u)) : "0"}
									</TableCell>
								</TableRow>
							);
						})
					)}
				</TableBody>
			</Table>
		</div>
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
			<div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
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
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
						<TableRow>
							<TableHead className="w-10" />
							<TableHead>Контрагент</TableHead>
							<TableHead>Квартир</TableHead>
							<TableHead className="text-right">Сумма договоров</TableHead>
							<TableHead className="text-right">Оплачено</TableHead>
							<TableHead className="text-right">Остаток</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center py-8 text-gray-400">
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
													<p className="text-xs text-gray-400">{g.phone}</p>
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
															<TableRow>
																<TableHead>Квартира</TableHead>
																<TableHead>Этаж</TableHead>
																<TableHead>Договор</TableHead>
																<TableHead className="text-right">
																	Сумма
																</TableHead>
																<TableHead className="text-right">
																	Оплачено
																</TableHead>
																<TableHead className="text-right">
																	Остаток
																</TableHead>
																<TableHead>Статус</TableHead>
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
