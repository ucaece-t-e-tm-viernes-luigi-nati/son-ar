import { isSuperadminRequest } from '@/lib/guards'
import { getDailyActivity, getMonthlyActivity, getOverview } from '@/lib/services/metrics'

// Métricas de la plataforma: solo superadmin (sesión de la plataforma). Cualquier otro → 404, no revela que existe.
export async function GET() {
  if (!(await isSuperadminRequest())) return new Response('Not found', { status: 404 })
  const [overview, daily, monthly] = await Promise.all([getOverview(), getDailyActivity(30), getMonthlyActivity(6)])
  return Response.json({ overview, daily, monthly })
}
