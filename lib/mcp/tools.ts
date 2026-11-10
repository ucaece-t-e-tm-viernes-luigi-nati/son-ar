import 'server-only'
import type { AccountKind } from '@/lib/domain/types'
import { gigRepo, profileRepo } from '@/lib/repositories'
import { getMatchesFor } from '@/lib/services/matching'

// Herramientas MCP públicas (solo datos que ya son públicos en la red: perfiles visibles y convocatorias abiertas).
// La herramienta de métricas de la plataforma de la v2.1 se quitó: expone datos de admin y el MCP es público.

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
    description: 'Busca músicos, bandas o venues activos en Son.ar por texto, tipo o género.',
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
      return profiles.map(({ id, name, kind, genres, lookingFor, neighborhood, city }) => ({ id, name, kind, genres, lookingFor, neighborhood, city }))
    },
  },
  {
    name: 'list_open_gigs',
    description: 'Lista las convocatorias abiertas publicadas por venues.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const gigs = await gigRepo.list({ status: 'open', publicOnly: true, upcoming: true })
      return gigs.map(({ applicantIds, ...gig }) => ({ ...gig, applicants: applicantIds.length }))
    },
  },
  {
    name: 'get_matches',
    description: 'Devuelve las mejores conexiones sugeridas para un perfil visible.',
    inputSchema: {
      type: 'object',
      properties: { profileId: { type: 'string' } },
      required: ['profileId'],
    },
    handler: async (args) => {
      const id = String(args.profileId ?? '')
      if (!(await profileRepo.isVisible(id))) return []
      const matches = await getMatchesFor(id, 5)
      return matches.map((m) => ({ id: m.profile.id, name: m.profile.name, score: m.score, reasons: m.reasons }))
    },
  },
]
