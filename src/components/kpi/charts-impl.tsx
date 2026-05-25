"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const PALETTE = ["#2c8a8c", "#5fa8c4", "#8cc6c9", "#bfe0d8", "#e8b0a3", "#d77a61"];

export function CaParMoisChart({ data }: { data: { mois: string; ca: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e7eb" />
        <XAxis dataKey="mois" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} />
        <Tooltip
          formatter={(v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v)}
        />
        <Bar dataKey="ca" fill={PALETTE[0]} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RepartitionPatientsChart({ data }: { data: { patient: string; ca: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="ca" nameKey="patient" outerRadius={90} innerRadius={50}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Tooltip
          formatter={(v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v)}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CaSegmenteChart({
  data,
  segments
}: {
  data: Array<{ mois: string } & Record<string, number>>;
  segments: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e7eb" />
        <XAxis dataKey="mois" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} />
        <Tooltip
          formatter={(v: number) =>
            new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v)
          }
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {segments.map((seg, i) => (
          <Bar
            key={seg}
            dataKey={seg}
            stackId="ca"
            fill={PALETTE[i % PALETTE.length]}
            radius={i === segments.length - 1 ? [4, 4, 0, 0] : 0}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AnnulationsChart({ data }: { data: { mois: string; taux: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e7eb" />
        <XAxis dataKey="mois" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} unit="%" />
        <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
        <Line type="monotone" dataKey="taux" stroke={PALETTE[5]} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
