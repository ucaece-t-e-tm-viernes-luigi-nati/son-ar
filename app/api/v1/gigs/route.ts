import { connection } from 'next/server'
import { gigRepo } from '@/lib/repositories'

// API pública: convocatorias abiertas de venues visibles (sin la lista de postulantes, solo la cantidad).
export async function GET() {
  await connection() // siempre en tiempo de pedido (lee Neon), nunca en el build
  const gigs = await gigRepo.list({ status: 'open', publicOnly: true, upcoming: true })
  return Response.json({ data: gigs.map(({ applicantIds, ...gig }) => ({ ...gig, applicants: applicantIds.length })) })
}
