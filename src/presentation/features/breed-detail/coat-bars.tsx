"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface CoatBarsProps {
  data: Array<{ family: string; label: string; count: number; current: boolean }>;
}

/**
 * Barras horizontales en la pantalla LCD: la familia de esta raza, encendida.
 * La animación propia de recharts (que reescribe atributos SVG en cada
 * frame) está apagada: el gráfico entra con un fundido de la pestaña.
 */
export default function CoatBars({ data }: CoatBarsProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 34, bottom: 0, left: 0 }} barCategoryGap={4}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={104}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--screen-soft)", fontSize: 11 }}
        />
        <Bar dataKey="count" isAnimationActive={false} radius={[0, 8, 8, 0]}>
          {data.map((row) => (
            <Cell key={row.family} fill={row.current ? "var(--screen-accent)" : "rgb(255 255 255 / 0.16)"} />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            style={{ fill: "var(--screen-ink)", fontSize: 11, fontFamily: "var(--hud-stack)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
