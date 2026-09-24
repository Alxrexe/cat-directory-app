"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface CoatBarsProps {
  data: Array<{ family: string; label: string; count: number; current: boolean }>;
}

/** Barras horizontales: la de esta raza en ámbar, el resto en neutro. */
export default function CoatBars({ data }: CoatBarsProps) {
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }} barCategoryGap={6}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={112}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <Bar dataKey="count" isAnimationActive={!reducedMotion} animationDuration={600} radius={0}>
          {data.map((row) => (
            <Cell key={row.family} fill={row.current ? "var(--chart-1)" : "var(--chart-2)"} />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            style={{ fill: "var(--foreground)", fontSize: 12, fontFamily: "var(--font-technical)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
