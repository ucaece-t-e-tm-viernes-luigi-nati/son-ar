import 'server-only'
import type { DailyActivity, MonthlyActivity } from '@/lib/domain/types'
import { store } from '@/lib/data/store'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function seeded(n: number) {
  const x = Math.sin(n * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

// Deterministic synthetic activity until event tracking is persisted in the database.
export function getDailyActivity(days = 30, today = new Date('2026-10-23')): DailyActivity[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (days - 1 - i))
    const weekend = d.getDay() === 5 || d.getDay() === 6 ? 1.35 : 1
    const trend = 1 + i / days / 2
    const r = seeded(i + 1)
    return {
      date: d.toISOString().slice(0, 10),
      activeUsers: Math.round((420 + r * 120) * trend * weekend),
      signups: Math.round((14 + r * 10) * trend),
      connections: Math.round((38 + seeded(i + 7) * 25) * trend * weekend),
      posts: Math.round((52 + seeded(i + 3) * 30) * trend),
      gigApplications: Math.round((9 + seeded(i + 11) * 8) * trend),
    }
  })
}

export function getMonthlyActivity(): MonthlyActivity[] {
  return MONTHS.slice(0, 10).map((month, i) => {
    const growth = 1 + i * 0.22
    return {
      month,
      activeUsers: Math.round(1800 * growth + seeded(i) * 400),
      signups: Math.round(320 * growth + seeded(i + 2) * 80),
      connections: Math.round(940 * growth + seeded(i + 4) * 200),
      gigApplications: Math.round(210 * growth + seeded(i + 6) * 50),
    }
  })
}

export function getOverview() {
  const daily = getDailyActivity(30)
  const today = daily.at(-1)!
  const yesterday = daily.at(-2)!
  const monthly = getMonthlyActivity()
  const thisMonth = monthly.at(-1)!
  const lastMonth = monthly.at(-2)!
  const pct = (a: number, b: number) => Math.round(((a - b) / b) * 1000) / 10

  const accounts = store.profiles
  return {
    accounts: {
      total: accounts.length,
      active: accounts.filter((a) => a.status === 'active').length,
      paused: accounts.filter((a) => a.status === 'paused').length,
      musicians: accounts.filter((a) => a.kind === 'musician').length,
      bands: accounts.filter((a) => a.kind === 'band').length,
      venues: accounts.filter((a) => a.kind === 'venue').length,
    },
    today: {
      activeUsers: today.activeUsers,
      activeUsersDelta: pct(today.activeUsers, yesterday.activeUsers),
      connections: today.connections,
      connectionsDelta: pct(today.connections, yesterday.connections),
    },
    month: {
      signups: thisMonth.signups,
      signupsDelta: pct(thisMonth.signups, lastMonth.signups),
      gigApplications: thisMonth.gigApplications,
      gigApplicationsDelta: pct(thisMonth.gigApplications, lastMonth.gigApplications),
    },
  }
}
