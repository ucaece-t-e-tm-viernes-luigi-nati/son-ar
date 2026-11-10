import 'server-only'
import type { Match, Profile } from '@/lib/domain/types'
import { connectionRepo, profileRepo } from '@/lib/repositories'

const ROLE_BY_INSTRUMENT: Record<string, string> = {
  'Bajo eléctrico': 'Bajista',
  Contrabajo: 'Bajista',
  Batería: 'Baterista',
  Voz: 'Voz',
  Violín: 'Violinista',
}

function roleOf(profile: Profile) {
  return profile.instruments.map((i) => ROLE_BY_INSTRUMENT[i]).filter(Boolean)
}

export function scoreMatch(me: Profile, other: Profile): Match {
  const reasons: string[] = []
  let score = 0

  const sharedGenres = me.genres.filter((g) => other.genres.includes(g))
  if (sharedGenres.length) {
    score += sharedGenres.length * 20
    reasons.push(`Comparten ${sharedGenres.slice(0, 2).join(' y ')}`)
  }

  const fillsTheirNeed = roleOf(me).find((r) => other.lookingFor.includes(r))
  if (fillsTheirNeed) {
    score += 30
    reasons.push(`Buscan ${fillsTheirNeed.toLowerCase()}`)
  }

  const fillsMyNeed = roleOf(other).find((r) => me.lookingFor.includes(r))
  if (fillsMyNeed) {
    score += 30
    reasons.push(`Es ${fillsMyNeed.toLowerCase()}`)
  }

  if (me.kind === 'musician' && other.kind === 'band' && me.lookingFor.includes('Banda')) score += 15
  if (other.kind === 'venue' && me.lookingFor.includes('Fechas')) {
    score += 10
    reasons.push('Programa fechas')
  }
  if (me.neighborhood && me.neighborhood === other.neighborhood) {
    score += 5
    reasons.push(`También en ${other.neighborhood}`)
  }

  return { profile: other, score: Math.min(score, 99), reasons }
}

export async function getMatchesFor(profileId: string, limit = 4): Promise<Match[]> {
  const me = await profileRepo.byId(profileId)
  if (!me) return []
  const [candidates, connections] = await Promise.all([
    profileRepo.list(),
    connectionRepo.forProfile(profileId),
  ])
  const connected = new Set(connections.flatMap((c) => [c.fromId, c.toId]))
  return candidates
    .filter((p) => p.id !== me.id && !connected.has(p.id))
    .map((p) => scoreMatch(me, p))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
