import {
	Cell,
	Legend,
	Pie,
	PieChart as RechartsPieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";

interface PieChartProps {
	data: Array<{ name: string; value: number; color?: string }>;
	height?: number;
	showLegend?: boolean;
}

const COLORS = [
	"#8b5cf6",
	"#14b8a6",
	"#fb923c",
	"#ef4444",
	"#22c55e",
	"#eab308",
];

export function PieChart({
	data,
	height = 300,
	showLegend = true,
}: PieChartProps) {
	return (
		<ResponsiveContainer width="100%" height={height}>
			<RechartsPieChart>
				<Pie
					data={data}
					cx="50%"
					cy="50%"
					labelLine={false}
					label={({ name, percent }) =>
						`${name}: ${(percent * 100).toFixed(0)}%`
					}
					outerRadius={80}
					fill="#8884d8"
					dataKey="value"
				>
					{data.map((entry, index) => (
						<Cell
							key={`cell-${index}`}
							fill={entry.color || COLORS[index % COLORS.length]}
						/>
					))}
				</Pie>
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
				{showLegend && <Legend />}
			</RechartsPieChart>
		</ResponsiveContainer>
	);
}
