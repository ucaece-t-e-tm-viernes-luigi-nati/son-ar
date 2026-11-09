import 'server-only'
import { newId, store } from '@/lib/data/store'
import type {
  AccountKind,
  AccountStatus,
  Connection,
  Gig,
  Post,
  PostTag,
  Profile,
} from '@/lib/domain/types'

// Repository contracts. The in-memory implementations below can be swapped
// for Drizzle + Neon implementations without touching services or UI.

export interface ProfileQuery {
  kind?: AccountKind
  genre?: string
  q?: string
  includePaused?: boolean
}

export const profileRepo = {
  async list(query: ProfileQuery = {}): Promise<Profile[]> {
    const q = query.q?.trim().toLowerCase()
    return store.profiles.filter((p) => {
      if (!query.includePaused && p.status !== 'active') return false
      if (query.kind && p.kind !== query.kind) return false
      if (query.genre && !p.genres.includes(query.genre)) return false
      if (q) {
        const haystack = [p.name, p.handle, p.bio, ...p.genres, ...p.instruments, ...p.lookingFor]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  },
  async byId(id: string): Promise<Profile | undefined> {
    return store.profiles.find((p) => p.id === id)
  },
  async byIds(ids: string[]): Promise<Profile[]> {
    return store.profiles.filter((p) => ids.includes(p.id))
  },
  async setStatus(id: string, status: AccountStatus): Promise<Profile | undefined> {
    const profile = store.profiles.find((p) => p.id === id)
    if (profile) profile.status = status
    return profile
  },
  async allGenres(): Promise<string[]> {
    return [...new Set(store.profiles.flatMap((p) => p.genres))].sort()
  },
}

export const postRepo = {
  async feed(): Promise<Post[]> {
    const activeIds = new Set(store.profiles.filter((p) => p.status === 'active').map((p) => p.id))
    return store.posts
      .filter((p) => activeIds.has(p.authorId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  async byAuthor(authorId: string): Promise<Post[]> {
    return store.posts
      .filter((p) => p.authorId === authorId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  async create(input: { authorId: string; content: string; tag: PostTag }): Promise<Post> {
    const post: Post = {
      id: newId('post'),
      ...input,
      likes: 0,
      comments: 0,
      createdAt: new Date().toISOString(),
    }
    store.posts.unshift(post)
    return post
  },
  async count(): Promise<number> {
    return store.posts.length
  },
}

export const gigRepo = {
  async list(filter: { venueId?: string; status?: Gig['status'] } = {}): Promise<Gig[]> {
    return store.gigs
      .filter((g) => (!filter.venueId || g.venueId === filter.venueId) && (!filter.status || g.status === filter.status))
      .sort((a, b) => a.date.localeCompare(b.date))
  },
  async byId(id: string): Promise<Gig | undefined> {
    return store.gigs.find((g) => g.id === id)
  },
  async create(input: Omit<Gig, 'id' | 'status' | 'applicantIds' | 'createdAt'>): Promise<Gig> {
    const gig: Gig = {
      id: newId('gig'),
      ...input,
      status: 'open',
      applicantIds: [],
      createdAt: new Date().toISOString().slice(0, 10),
    }
    store.gigs.push(gig)
    return gig
  },
  async addApplicant(gigId: string, profileId: string): Promise<Gig | undefined> {
    const gig = store.gigs.find((g) => g.id === gigId)
    if (gig && gig.status === 'open' && !gig.applicantIds.includes(profileId)) {
      gig.applicantIds.push(profileId)
    }
    return gig
  },
  async setStatus(gigId: string, venueId: string, status: Gig['status']): Promise<Gig | undefined> {
    const gig = store.gigs.find((g) => g.id === gigId && g.venueId === venueId)
    if (gig) gig.status = status
    return gig
  },
}

export const connectionRepo = {
  async forProfile(profileId: string): Promise<Connection[]> {
    return store.connections.filter((c) => c.fromId === profileId || c.toId === profileId)
  },
  async between(a: string, b: string): Promise<Connection | undefined> {
    return store.connections.find(
      (c) => (c.fromId === a && c.toId === b) || (c.fromId === b && c.toId === a),
    )
  },
  async request(fromId: string, toId: string): Promise<Connection> {
    const existing = await this.between(fromId, toId)
    if (existing) return existing
    const connection: Connection = {
      id: newId('conn'),
      fromId,
      toId,
      status: 'pending',
      createdAt: new Date().toISOString().slice(0, 10),
    }
    store.connections.push(connection)
    return connection
  },
  async accept(id: string, toId: string): Promise<Connection | undefined> {
    const connection = store.connections.find((c) => c.id === id && c.toId === toId)
    if (connection) connection.status = 'accepted'
    return connection
  },
  async count(): Promise<number> {
    return store.connections.length
  },
}
