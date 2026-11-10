import { connection } from 'next/server'
import type { AccountKind } from '@/lib/domain/types'
import { profileRepo } from '@/lib/repositories'

const KINDS: AccountKind[] = ['musician', 'band', 'venue']

// API pública: perfiles visibles de la red (sin ids internos de usuario ni de empresa).
export async function GET(req: Request) {
  await connection()
  const { searchParams } = new URL(req.url)
  const kindParam = searchParams.get('kind') as AccountKind | null
  const profiles = await profileRepo.list({
    q: searchParams.get('q') ?? undefined,
    genre: searchParams.get('genre') ?? undefined,
    kind: kindParam && KINDS.includes(kindParam) ? kindParam : undefined,
  })
  return Response.json({ data: profiles.map(({ userId, clientId, ...p }) => p) })
}
