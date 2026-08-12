"use client";

import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
}

export function AnalyticsTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="visitorFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.22} />
            <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
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
          }}
        />
        <Area
          type="monotone"
          dataKey="visitors"
          name="Visitors"
          stroke="var(--brand)"
          fill="url(#visitorFill)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="conversions"
          name="Conversions"
          stroke="var(--foreground)"
          fill="transparent"
          strokeWidth={1.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
