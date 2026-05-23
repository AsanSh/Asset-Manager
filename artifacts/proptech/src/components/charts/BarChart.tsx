import {
	Bar,
	CartesianGrid,
	Cell,
	BarChart as RechartsBarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface BarChartProps {
	data: Array<{ name: string; value: number; color?: string }>;
	color?: string;
	height?: number;
	showGrid?: boolean;
}

export function BarChart({
	data,
	color = "#8b5cf6",
	height = 300,
	showGrid = true,
}: BarChartProps) {
	return (
		<ResponsiveContainer width="100%" height={height}>
			<RechartsBarChart data={data}>
				{showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
				<XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} />
				<YAxis
					stroke="#9ca3af"
					fontSize={12}
					tickLine={false}
					tickFormatter={(value) =>
						new Intl.NumberFormat("ru-RU", { notation: "compact" }).format(
							value,
						)
					}
				/>
				<Tooltip
					contentStyle={{
						backgroundColor: "white",
						border: "1px solid #e5e7eb",
						borderRadius: "8px",
						boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
					}}
					formatter={(value: number) =>
						new Intl.NumberFormat("ru-RU").format(value)
					}
				/>
				<Bar dataKey="value" radius={[8, 8, 0, 0]}>
					{data.map((entry, index) => (
						<Cell key={`cell-${index}`} fill={entry.color || color} />
					))}
				</Bar>
			</RechartsBarChart>
		</ResponsiveContainer>
	);
}
