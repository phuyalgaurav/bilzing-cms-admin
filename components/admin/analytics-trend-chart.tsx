"use client";

import { format, parseISO } from "date-fns";
import {
  Bar,
  ComposedChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TrendPoint {
  date: string;
  visitors: number;
  page_views: number;
  conversions: number;
  module_activity: number;
}

export function AnalyticsTrendChart({ data, includeModuleActivity = false }: { data: TrendPoint[]; includeModuleActivity?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 800, height: 288 }}>
      <ComposedChart data={data} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          minTickGap={28}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickFormatter={(value: string) => format(parseISO(value), "MMM d")}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          labelFormatter={(value) => format(parseISO(String(value)), "MMM d, yyyy")}
          contentStyle={{
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "none",
            fontSize: 12,
            background: "var(--popover)",
          }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="circle"
          iconSize={7}
          wrapperStyle={{ fontSize: 11, paddingBottom: 12 }}
        />
        <Bar
          dataKey="page_views"
          name="Page views"
          fill="var(--muted-foreground)"
          fillOpacity={0.18}
          radius={[2, 2, 0, 0]}
          maxBarSize={18}
        />
        {includeModuleActivity ? <Bar dataKey="module_activity" name="New module records" fill="var(--brand)" fillOpacity={0.3} radius={[2, 2, 0, 0]} maxBarSize={18} /> : null}
        <Line
          type="linear"
          dataKey="visitors"
          name="Visitors"
          stroke="var(--brand)"
          fill="none"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3 }}
        />
        <Line
          type="linear"
          dataKey="conversions"
          name="Conversions"
          stroke="var(--foreground)"
          fill="none"
          strokeWidth={1.5}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
