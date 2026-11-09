import 'server-only'
import type { AccountKind } from '@/lib/domain/types'
import { gigRepo, profileRepo } from '@/lib/repositories'
import { getMatchesFor } from '@/lib/services/matching'
import { getOverview } from '@/lib/services/metrics'

interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  handler: (args: Record<string, unknown>) => Promise<unknown>
}

const KINDS: AccountKind[] = ['musician', 'band', 'venue']

export const mcpTools: McpTool[] = [
  {
    name: 'search_profiles',
    description: 'Busca músicos, bandas o venues activos en SonAR por texto, tipo o género.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Texto libre: nombre, instrumento, género' },
        kind: { type: 'string', enum: KINDS },
        genre: { type: 'string' },
      },
    },
    handler: async (args) => {
      const kind = KINDS.includes(args.kind as AccountKind) ? (args.kind as AccountKind) : undefined
      const profiles = await profileRepo.list({
        q: typeof args.q === 'string' ? args.q : undefined,
        genre: typeof args.genre === 'string' ? args.genre : undefined,
        kind,
      })
      return profiles.map(({ id, name, kind, genres, lookingFor, neighborhood }) => ({
        id, name, kind, genres, lookingFor, neighborhood,
      }))
    },
  },
  {
    name: 'list_open_gigs',
    description: 'Lista las convocatorias abiertas publicadas por venues.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => gigRepo.list({ status: 'open' }),
  },
  {
    name: 'get_matches',
    description: 'Devuelve las mejores conexiones sugeridas para un perfil.',
    inputSchema: {
      type: 'object',
      properties: { profileId: { type: 'string' } },
      required: ['profileId'],
    },
    handler: async (args) => {
      const matches = await getMatchesFor(String(args.profileId ?? ''), 5)
      return matches.map((m) => ({ id: m.profile.id, name: m.profile.name, score: m.score, reasons: m.reasons }))
    },
  },
  {
    name: 'get_platform_metrics',
    description: 'Resumen de métricas de actividad de la plataforma (uso interno).',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => getOverview(),
  },
]
