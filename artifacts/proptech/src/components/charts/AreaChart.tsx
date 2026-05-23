import {
	Area,
	CartesianGrid,
	AreaChart as RechartsAreaChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface AreaChartProps {
	data: Array<{ name: string; value: number }>;
	color?: string;
	height?: number;
	showGrid?: boolean;
}

export function AreaChart({
	data,
	color = "#8b5cf6",
	height = 300,
	showGrid = true,
}: AreaChartProps) {
	return (
		<ResponsiveContainer width="100%" height={height}>
			<RechartsAreaChart data={data}>
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
				<defs>
					<linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor={color} stopOpacity={0.3} />
						<stop offset="95%" stopColor={color} stopOpacity={0} />
					</linearGradient>
				</defs>
				<Area
					type="monotone"
					dataKey="value"
					stroke={color}
					strokeWidth={2}
					fill="url(#colorValue)"
				/>
			</RechartsAreaChart>
		</ResponsiveContainer>
	);
}
