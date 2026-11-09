import 'server-only'
import type { Connection, Gig, Post, Profile } from '@/lib/domain/types'
import { seedConnections, seedGigs, seedPosts, seedProfiles } from './seed'

interface Store {
  profiles: Profile[]
  posts: Post[]
  gigs: Gig[]
  connections: Connection[]
}

// In-memory adapter used until a database integration (Neon) is connected.
// globalThis keeps state across hot reloads in development.
const globalForStore = globalThis as unknown as { __sonarStore?: Store }

export const store: Store =
  globalForStore.__sonarStore ??
  (globalForStore.__sonarStore = structuredClone({
    profiles: seedProfiles,
    posts: seedPosts,
    gigs: seedGigs,
    connections: seedConnections,
  }))

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}
