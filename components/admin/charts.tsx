"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Couleurs de la charte : bleu marine dominant, rouge en accent. */
export const CHART = {
  navy: "#004060",
  navySoft: "#9bbbcd",
  red: "#C01030",
  grid: "#e2e8ee",
  axis: "#4a5d6a",
  neutral: "#8a96a0",
  suggestion: "#c98a00",
  positive: "#1f6f9a",
};

const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: "1px solid #e2e8ee", fontSize: 13, color: "#152a38" },
  cursor: { fill: "rgba(0,64,96,0.06)" },
};

/** Moyenne /5 par critère — barres horizontales, une seule série. */
export function CriteriaBarChart({ data }: { data: { label: string; average: number | null; count: number }[] }) {
  const rows = data.map((d) => ({ ...d, value: d.average ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 38)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} stroke={CHART.grid} />
        <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fill: CHART.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={170} tick={{ fill: "#152a38", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v, _n, p) => [`${Number(v).toFixed(2)} / 5 (${p.payload.count} notes)`, "Moyenne"]} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {rows.map((r) => (
            <Cell key={r.label} fill={r.value < 3.5 ? CHART.red : CHART.navy} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Répartition 1..5 (étoiles ou Live Pulse). */
export function DistributionChart({ distribution, labels }: { distribution: number[]; labels: string[] }) {
  const rows = distribution.map((count, i) => ({ label: labels[i], count }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ left: -16, right: 8, top: 8, bottom: 0 }} barCategoryGap={8}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
        <YAxis allowDecimals={false} tick={{ fill: CHART.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v) => [v, "Réponses"]} />
        <Bar dataKey="count" fill={CHART.navy} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CriteriaRadar({ data }: { data: { label: string; average: number | null }[] }) {
  const rows = data.map((d) => ({ label: d.label.length > 18 ? `${d.label.slice(0, 17)}…` : d.label, value: d.average ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={rows} outerRadius="70%">
        <PolarGrid stroke={CHART.grid} />
        <PolarAngleAxis dataKey="label" tick={{ fill: "#152a38", fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fill: CHART.axis, fontSize: 10 }} axisLine={false} />
        <Radar dataKey="value" stroke={CHART.navy} strokeWidth={2} fill={CHART.navy} fillOpacity={0.18} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${Number(v).toFixed(2)} / 5`, "Moyenne"]} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function TimelineChart({ data }: { data: { bucket: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: -16, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="bucket" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
        <YAxis allowDecimals={false} tick={{ fill: CHART.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle.contentStyle} formatter={(v) => [v, "Réponses"]} />
        <Line type="monotone" dataKey="count" stroke={CHART.navy} strokeWidth={2} dot={{ r: 4, fill: CHART.navy, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Comparaison entre événements : une métrique à la fois (un seul axe). */
export function CompareBarChart({ data, max, unit }: { data: { name: string; value: number | null }[]; max?: number; unit: string }) {
  const rows = data.map((d) => ({ name: d.name.length > 26 ? `${d.name.slice(0, 25)}…` : d.name, value: d.value ?? 0, missing: d.value === null }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 44)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={CHART.grid} />
        <XAxis type="number" domain={[0, max ?? "auto"]} tick={{ fill: CHART.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={180} tick={{ fill: "#152a38", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v, _n, p) => [p.payload.missing ? "Pas de données" : `${Number(v).toFixed(2)} ${unit}`, ""]} />
        <Bar dataKey="value" fill={CHART.navy} radius={[0, 4, 4, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
