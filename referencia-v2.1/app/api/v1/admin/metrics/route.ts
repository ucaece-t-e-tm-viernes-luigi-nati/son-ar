import { requireRole } from '@/lib/auth/session'
import { getDailyActivity, getMonthlyActivity, getOverview } from '@/lib/services/metrics'

export async function GET() {
  await requireRole('superadmin')
  return Response.json({
    overview: getOverview(),
    daily: getDailyActivity(30),
    monthly: getMonthlyActivity(),
  })
}
