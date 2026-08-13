"use client";

import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TrendPoint {
  date: string;
  visitors: number;
  sessions: number;
  page_views: number;
  conversions: number;
  conversion_rate: number;
  module_activity: number;
}

const axis = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
} as const;

const tooltipStyle = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  boxShadow: "0 8px 24px color-mix(in srgb, var(--foreground) 8%, transparent)",
  fontSize: 12,
  background: "var(--surface)",
  color: "var(--foreground)",
};

function dateTick(value: string) {
  return format(parseISO(value), "MMM d");
}

export function AnalyticsTrafficChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1} initialDimension={{ width: 800, height: 288 }}>
      <AreaChart data={data} margin={{ left: -20, right: 12, top: 12, bottom: 0 }}>
        <defs>
          <linearGradient id="visitorFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
        <XAxis dataKey="date" minTickGap={36} tickFormatter={dateTick} {...axis} />
        <YAxis allowDecimals={false} width={42} {...axis} />
        <Tooltip
          labelFormatter={(value) => format(parseISO(String(value)), "EEE, MMM d, yyyy")}
          contentStyle={tooltipStyle}
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="visitors"
          name="Visitors"
          stroke="var(--brand)"
          strokeWidth={2.25}
          fill="url(#visitorFill)"
          activeDot={{ r: 4, strokeWidth: 2, fill: "var(--surface)" }}
        />
        <Line
          type="monotone"
          dataKey="sessions"
          name="Sessions"
          stroke="var(--foreground)"
          strokeOpacity={0.55}
          strokeWidth={1.75}
          dot={false}
          activeDot={{ r: 3 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AnalyticsConversionChart({ data }: { data: TrendPoint[] }) {
  const rateCeiling = Math.max(
    10,
    Math.ceil(Math.max(...data.map((point) => point.conversion_rate), 0) / 5) * 5,
  );
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1} initialDimension={{ width: 800, height: 288 }}>
      <BarChart data={data} margin={{ left: -20, right: 0, top: 12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
        <XAxis dataKey="date" minTickGap={36} tickFormatter={dateTick} {...axis} />
        <YAxis yAxisId="count" allowDecimals={false} width={42} {...axis} />
        <YAxis
          yAxisId="rate"
          orientation="right"
          domain={[0, rateCeiling]}
          tickFormatter={(value) => `${value}%`}
          width={44}
          {...axis}
        />
        <Tooltip
          labelFormatter={(value) => format(parseISO(String(value)), "EEE, MMM d, yyyy")}
          formatter={(value, name) => [name === "Conversion rate" ? `${value}%` : value, name]}
          contentStyle={tooltipStyle}
          cursor={{ fill: "color-mix(in srgb, var(--brand) 7%, transparent)" }}
        />
        <Bar
          yAxisId="count"
          dataKey="conversions"
          name="Conversions"
          fill="var(--brand)"
          fillOpacity={0.78}
          radius={[4, 4, 0, 0]}
          maxBarSize={22}
        />
        <Line
          yAxisId="rate"
          type="monotone"
          dataKey="conversion_rate"
          name="Conversion rate"
          stroke="var(--foreground)"
          strokeWidth={1.75}
          dot={false}
          activeDot={{ r: 3 }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AnalyticsTrendChart({ data }: { data: TrendPoint[]; includeModuleActivity?: boolean }) {
  return <AnalyticsTrafficChart data={data} />;
}
