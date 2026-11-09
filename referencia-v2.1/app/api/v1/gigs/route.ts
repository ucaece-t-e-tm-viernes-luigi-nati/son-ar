import { gigRepo } from '@/lib/repositories'

export async function GET() {
  return Response.json({ data: await gigRepo.list({ status: 'open' }) })
}
