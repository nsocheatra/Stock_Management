"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Custom premium glass tooltip component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 p-3.5 rounded-xl shadow-xl">
        <p className="text-xs text-zinc-400 font-medium mb-1">{payload[0].payload.name}</p>
        <p className="text-sm font-bold text-violet-400">
          Stock: <span className="text-white">{payload[0].value} units</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function BarChartWidget({
  data,
  height = 300,
}: {
  data: { name: string; quantity: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.3} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#a1a1aa" }}
          dy={10}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#a1a1aa" }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(167, 139, 250, 0.05)" }} />
        <Bar dataKey="quantity" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={45} />
      </BarChart>
    </ResponsiveContainer>
  );
}

