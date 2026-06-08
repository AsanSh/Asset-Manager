import { Line, LineChart, ResponsiveContainer } from "recharts";

interface SparkLineProps {
	data: number[];
	color?: string;
	height?: number;
}

export function SparkLine({
	data,
	color = "#0ea5e9",
	height = 40,
}: SparkLineProps) {
	const chartData = data.map((value, index) => ({ value, index }));

	return (
		<ResponsiveContainer width="100%" height={height}>
			<LineChart data={chartData}>
				<Line
					type="monotone"
					dataKey="value"
					stroke={color}
					strokeWidth={2}
					dot={false}
					isAnimationActive={false}
				/>
			</LineChart>
		</ResponsiveContainer>
	);
}
