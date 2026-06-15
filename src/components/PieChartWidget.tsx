"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "@/i18n/useTranslation";

// Vibrant gradient palette colors
const COLORS = [
  "#a78bfa", // violet-400
  "#34d399", // emerald-400
  "#60a5fa", // blue-400
  "#f59e0b", // amber-500
  "#fb7185", // rose-400
  "#22d3ee", // cyan-400
];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  const { t } = useTranslation();
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 p-3.5 rounded-xl shadow-xl">
        <p className="text-xs text-zinc-400 font-medium mb-1">{payload[0].name}</p>
        <p className="text-sm font-bold text-emerald-400">
          {t("chart.quantity")} <span className="text-white">{payload[0].value} {t("chart.units")}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function PieChartWidget({
  data,
  height = 350,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={95}
          paddingAngle={3}
          stroke="#18181b"
          strokeWidth={2}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: "#a1a1aa", paddingTop: 15 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

