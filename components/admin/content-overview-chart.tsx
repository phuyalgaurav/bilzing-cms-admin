"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ContentOverviewChart({ data }: { data: Array<{ name: string; records: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis dataKey="name" type="category" width={82} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={{ border: "1px solid var(--border)", borderRadius: 8, boxShadow: "none", fontSize: 12 }} />
        <Bar dataKey="records" fill="var(--brand)" radius={[0, 3, 3, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
