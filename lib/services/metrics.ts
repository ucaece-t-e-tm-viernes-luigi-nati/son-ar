import 'server-only'
import { q, q1 } from '@/lib/db'
import { TZ } from '@/lib/dates'
import type { DailyActivity, MonthlyActivity } from '@/lib/domain/types'

// Métricas del superadmin calculadas desde activity_events (actividad real + demo si SEED_DEMO=true).
// Usuarios activos = perfiles distintos con algún evento ese día / mes.

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const LOCAL = `(e.created_at AT TIME ZONE '${TZ}')`
const TODAY = `(now() AT TIME ZONE '${TZ}')::date`

export async function getDailyActivity(days = 30): Promise<DailyActivity[]> {
  return q<DailyActivity>(
    `WITH d AS (SELECT generate_series(${TODAY} - ($1::int - 1), ${TODAY}, interval '1 day')::date AS day)
     SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
            count(DISTINCT e.profile_id)::int AS "activeUsers",
            (count(*) FILTER (WHERE e.type = 'signup'))::int AS signups,
            (count(*) FILTER (WHERE e.type = 'connection'))::int AS connections,
            (count(*) FILTER (WHERE e.type = 'post'))::int AS posts,
            (count(*) FILTER (WHERE e.type = 'gig_application'))::int AS "gigApplications"
       FROM d
       LEFT JOIN activity_events e
         ON e.created_at >= ((${TODAY} - ($1::int - 1))::timestamp AT TIME ZONE '${TZ}')
        AND ${LOCAL}::date = d.day
      GROUP BY d.day
      ORDER BY d.day`,
    [days],
  )
}

export async function getMonthlyActivity(months = 6): Promise<MonthlyActivity[]> {
  const rows = await q<{ month: number; year: number; activeUsers: number; signups: number; connections: number; gigApplications: number }>(
    `WITH m AS (
       SELECT generate_series(date_trunc('month', ${TODAY}) - make_interval(months => $1::int - 1), date_trunc('month', ${TODAY}), interval '1 month')::date AS month
     )
     SELECT extract(month FROM m.month)::int AS month, extract(year FROM m.month)::int AS year,
            count(DISTINCT e.profile_id)::int AS "activeUsers",
            (count(*) FILTER (WHERE e.type = 'signup'))::int AS signups,
            (count(*) FILTER (WHERE e.type = 'connection'))::int AS connections,
            (count(*) FILTER (WHERE e.type = 'gig_application'))::int AS "gigApplications"
       FROM m
       LEFT JOIN activity_events e
         ON e.created_at >= ((date_trunc('month', ${TODAY}) - make_interval(months => $1::int - 1))::timestamp AT TIME ZONE '${TZ}')
        AND date_trunc('month', ${LOCAL})::date = m.month
      GROUP BY m.month
      ORDER BY m.month`,
    [months],
  )
  return rows.map((r) => ({
    month: `${MONTHS[r.month - 1]} ${String(r.year).slice(2)}`,
    activeUsers: r.activeUsers,
    signups: r.signups,
    connections: r.connections,
    gigApplications: r.gigApplications,
  }))
}

/** Variación porcentual; null si no hay base de comparación. */
function pct(a: number, b: number) {
  if (!b) return null
  return Math.round(((a - b) / b) * 1000) / 10
}

export async function getOverview() {
  const [daily, monthly, accounts] = await Promise.all([
    getDailyActivity(2),
    getMonthlyActivity(2),
    q1<{ total: number; active: number; paused: number; musicians: number; bands: number; venues: number }>(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status = 'active')::int AS active,
              count(*) FILTER (WHERE status = 'paused')::int AS paused,
              count(*) FILTER (WHERE kind = 'musician')::int AS musicians,
              count(*) FILTER (WHERE kind = 'band')::int AS bands,
              count(*) FILTER (WHERE kind = 'venue')::int AS venues
         FROM profiles`,
    ),
  ])
  const [yesterday, today] = daily
  const [lastMonth, thisMonth] = monthly
  return {
    accounts: accounts ?? { total: 0, active: 0, paused: 0, musicians: 0, bands: 0, venues: 0 },
    today: {
      activeUsers: today?.activeUsers ?? 0,
      activeUsersDelta: pct(today?.activeUsers ?? 0, yesterday?.activeUsers ?? 0),
      connections: today?.connections ?? 0,
      connectionsDelta: pct(today?.connections ?? 0, yesterday?.connections ?? 0),
    },
    month: {
      signups: thisMonth?.signups ?? 0,
      signupsDelta: pct(thisMonth?.signups ?? 0, lastMonth?.signups ?? 0),
      gigApplications: thisMonth?.gigApplications ?? 0,
      gigApplicationsDelta: pct(thisMonth?.gigApplications ?? 0, lastMonth?.gigApplications ?? 0),
    },
  }
}
