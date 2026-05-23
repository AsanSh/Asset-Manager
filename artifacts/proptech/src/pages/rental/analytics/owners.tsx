import { useQuery } from "@tanstack/react-query";
import { FileText, TrendingDown, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";

function fmtFull(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0 ₸";
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: "KGS",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(v);
}

export default function RentalOwners() {
	const { data: statements = [] } = useQuery<any[]>({
		queryKey: ["rental-owner-statements"],
		queryFn: () => api.get("/rental/owner-statements").then((r) => r.data),
	});

	const statementsArray = Array.isArray(statements) ? statements : [];

	// Group statements by owner
	const byOwner: Record<
		string,
		{
			name: string;
			props: Set<number>;
			income: number;
			expense: number;
			fee: number;
		}
	> = {};
	statementsArray.forEach((s: any) => {
		const key = s.ownerName || `Владелец #${s.id}`;
		if (!byOwner[key])
			byOwner[key] = {
				name: key,
				props: new Set(),
				income: 0,
				expense: 0,
				fee: 0,
			};
		byOwner[key].income += parseFloat(s.grossRent || "0");
		byOwner[key].expense += parseFloat(s.expenses || "0");
		byOwner[key].fee += parseFloat(s.managementFee || "0");
		if (s.propertyId) byOwner[key].props.add(s.propertyId);
	});

	// If no owner statements yet, compute from payments per property
	const showOwners = Object.values(byOwner);

	const totalIncome = showOwners.reduce((s, o) => s + (o.income || 0), 0);
	const totalExpense = showOwners.reduce((s, o) => s + (o.expense || 0), 0);
	const totalFee = showOwners.reduce((s, o) => s + (o.fee || 0), 0);
	const totalNet = totalIncome - totalExpense - totalFee;

	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Отчёты владельцев</h1>
				<p className="text-gray-500 text-sm mt-0.5">
					Доходы и расходы по каждому владельцу
				</p>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<div className="bg-white border rounded-lg p-4">
					<p className="text-xs text-gray-500 mb-1">Валовой доход</p>
					<p className="text-xl font-bold text-emerald-600">
						{fmtFull(totalIncome)}
					</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<p className="text-xs text-gray-500 mb-1">Расходы</p>
					<p className="text-xl font-bold text-rose-600">
						{fmtFull(totalExpense)}
					</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<p className="text-xs text-gray-500 mb-1">Комиссия УК</p>
					<p className="text-xl font-bold text-amber-600">
						{fmtFull(totalFee)}
					</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<p className="text-xs text-gray-500 mb-1">Чистый доход</p>
					<p
						className={`text-xl font-bold ${totalNet >= 0 ? "text-blue-600" : "text-rose-700"}`}
					>
						{fmtFull(totalNet)}
					</p>
				</div>
			</div>

			{showOwners.length === 0 ? (
				<div className="bg-white border rounded-lg p-12 text-center">
					<FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
					<p className="text-sm text-gray-500">
						Нет данных отчётов владельцев.
					</p>
					<p className="text-xs text-gray-400 mt-1">
						Отчёты создаются автоматически при добавлении платежей
					</p>
				</div>
			) : (
				<div className="bg-white border rounded-lg overflow-hidden">
					<table className="w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="text-left p-3 font-medium text-gray-600">
									Владелец
								</th>
								<th className="text-center p-3 font-medium text-gray-600">
									Объектов
								</th>
								<th className="text-right p-3 font-medium text-gray-600">
									Валовой доход
								</th>
								<th className="text-right p-3 font-medium text-gray-600">
									Расходы
								</th>
								<th className="text-right p-3 font-medium text-gray-600">
									Комиссия
								</th>
								<th className="text-right p-3 font-medium text-gray-600">
									Чистый
								</th>
							</tr>
						</thead>
						<tbody>
							{showOwners.map((o, idx) => {
								const net = o.income - o.expense - o.fee;
								return (
									<tr key={idx} className="border-t hover:bg-gray-50">
										<td className="p-3">
											<div className="flex items-center gap-2">
												<div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600">
													{o.name.charAt(0).toUpperCase()}
												</div>
												<span className="font-medium text-gray-900">
													{o.name}
												</span>
											</div>
										</td>
										<td className="p-3 text-center text-gray-600">
											{o.props.size}
										</td>
										<td className="p-3 text-right text-emerald-600 font-medium">
											{fmtFull(o.income)}
										</td>
										<td className="p-3 text-right text-rose-600">
											{fmtFull(o.expense)}
										</td>
										<td className="p-3 text-right text-amber-600">
											{fmtFull(o.fee)}
										</td>
										<td className="p-3 text-right">
											<div className="flex items-center justify-end gap-1">
												{net >= 0 ? (
													<TrendingUp className="w-3.5 h-3.5 text-blue-600" />
												) : (
													<TrendingDown className="w-3.5 h-3.5 text-rose-600" />
												)}
												<span
													className={`font-semibold ${net >= 0 ? "text-blue-600" : "text-rose-700"}`}
												>
													{fmtFull(net)}
												</span>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
