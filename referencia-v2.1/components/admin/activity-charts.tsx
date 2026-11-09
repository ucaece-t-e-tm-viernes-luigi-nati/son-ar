'use client'

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { DailyActivity, MonthlyActivity } from '@/lib/domain/types'

const dailyConfig = {
  activeUsers: { label: 'Usuarios activos', color: 'var(--chart-1)' },
  connections: { label: 'Conexiones', color: 'var(--chart-2)' },
} satisfies ChartConfig

const monthlyConfig = {
  signups: { label: 'Registros', color: 'var(--chart-1)' },
  gigApplications: { label: 'Postulaciones', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function DailyChart({ data }: { data: DailyActivity[] }) {
  const rows = data.map((d) => ({ ...d, label: d.date.slice(8, 10) + '/' + d.date.slice(5, 7) }))
  return (
    <ChartContainer config={dailyConfig} className="aspect-auto h-72 w-full">
      <AreaChart data={rows} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fillActive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-activeUsers)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-activeUsers)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area dataKey="activeUsers" type="monotone" stroke="var(--color-activeUsers)" fill="url(#fillActive)" strokeWidth={2} />
        <Area dataKey="connections" type="monotone" stroke="var(--color-connections)" fill="transparent" strokeWidth={2} />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  )
}

export function MonthlyChart({ data }: { data: MonthlyActivity[] }) {
  return (
    <ChartContainer config={monthlyConfig} className="aspect-auto h-72 w-full">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="signups" fill="var(--color-signups)" radius={4} />
        <Bar dataKey="gigApplications" fill="var(--color-gigApplications)" radius={4} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  )
}
