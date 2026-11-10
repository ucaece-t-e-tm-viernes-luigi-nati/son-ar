import 'server-only'
import type { PoolClient } from 'pg'
import { pool, q, q1 } from '@/lib/db'
import type { AccountKind, AccountStatus, Connection, Gig, Post, PostTag, Profile, VenueType } from '@/lib/domain/types'
import { PUBLIC_VISIBLE_STATUSES } from '@/lib/permissions'

// Repositorios de la red. Misma interfaz que la v2.1 (que usaba memoria), ahora sobre Neon con SQL parametrizado.
// Visibilidad pública: perfil activo y, si es venue, su empresa (client) en un estado visible (no pausada ni dada de baja).

type Db = Pick<PoolClient, 'query'>

const VISIBLE = `(p.status = 'active' AND (p.kind <> 'venue' OR c.status = ANY('{${PUBLIC_VISIBLE_STATUSES.join(',')}}'::text[])))`

const PROFILE_SELECT = `SELECT p.id, p.kind, p.name, p.handle, p.avatar, p.city, p.neighborhood, p.genres, p.instruments,
    p.looking_for AS "lookingFor", p.bio, p.members, p.capacity, p.venue_type AS "venueType", p.verified, p.status,
    p.followers, to_char(p.created_at, 'YYYY-MM-DD') AS "createdAt", p.user_id AS "userId", p.client_id AS "clientId"
  FROM profiles p LEFT JOIN client c ON c.id = p.client_id`

type ProfileRow = Omit<Profile, 'avatar' | 'members' | 'capacity' | 'venueType'> & {
  avatar: string | null
  members: number | null
  capacity: number | null
  venueType: string | null
}

function toProfile(row: ProfileRow): Profile {
  return {
    ...row,
    avatar: row.avatar ?? undefined,
    members: row.members ?? undefined,
    capacity: row.capacity ?? undefined,
    venueType: (row.venueType ?? undefined) as VenueType | undefined,
  }
}

export interface ProfileQuery {
  kind?: AccountKind
  genre?: string
  q?: string
  includePaused?: boolean
}

export const profileRepo = {
  async list(query: ProfileQuery = {}): Promise<Profile[]> {
    const text = query.q?.trim().toLowerCase().slice(0, 80) || null
    const rows = await q<ProfileRow>(
      `${PROFILE_SELECT}
        WHERE ($1::boolean OR ${VISIBLE})
          AND ($2::text IS NULL OR p.kind = $2)
          AND ($3::text IS NULL OR $3 = ANY(p.genres))
          AND ($4::text IS NULL OR lower(p.name || ' ' || p.handle || ' ' || p.bio || ' ' ||
               array_to_string(p.genres, ' ') || ' ' || array_to_string(p.instruments, ' ') || ' ' || array_to_string(p.looking_for, ' ')) LIKE '%' || $4 || '%')
        ORDER BY p.followers DESC, p.created_at DESC
        LIMIT 200`,
      [!!query.includePaused, query.kind ?? null, query.genre ?? null, text],
    )
    return rows.map(toProfile)
  },
  async byId(id: string): Promise<Profile | undefined> {
    const row = await q1<ProfileRow>(`${PROFILE_SELECT} WHERE p.id = $1`, [id])
    return row ? toProfile(row) : undefined
  },
  async byIds(ids: string[]): Promise<Profile[]> {
    if (!ids.length) return []
    const rows = await q<ProfileRow>(`${PROFILE_SELECT} WHERE p.id = ANY($1::text[])`, [ids])
    return rows.map(toProfile)
  },
  /** Perfil público (músico o banda) de un usuario logueado. */
  async byUserId(userId: string): Promise<Profile | undefined> {
    const row = await q1<ProfileRow>(`${PROFILE_SELECT} WHERE p.user_id = $1 AND p.kind IN ('musician','band')`, [userId])
    return row ? toProfile(row) : undefined
  },
  /** Perfil público del venue de una empresa (multi-tenant: siempre por client_id resuelto en el servidor). */
  async byClientId(clientId: string): Promise<Profile | undefined> {
    const row = await q1<ProfileRow>(`${PROFILE_SELECT} WHERE p.client_id = $1`, [clientId])
    return row ? toProfile(row) : undefined
  },
  async isVisible(id: string): Promise<boolean> {
    const row = await q1(`SELECT 1 FROM profiles p LEFT JOIN client c ON c.id = p.client_id WHERE p.id = $1 AND ${VISIBLE}`, [id])
    return !!row
  },
  async setStatus(id: string, status: AccountStatus): Promise<{ name: string; prev: string } | null> {
    return q1<{ name: string; prev: string }>(
      `WITH prev AS (SELECT status FROM profiles WHERE id = $1)
       UPDATE profiles SET status = $2 WHERE id = $1 AND kind IN ('musician','band')
       RETURNING name, (SELECT status FROM prev) AS prev`,
      [id, status],
    )
  },
  async allGenres(): Promise<string[]> {
    const rows = await q<{ genre: string }>(
      `SELECT DISTINCT unnest(p.genres) AS genre FROM profiles p LEFT JOIN client c ON c.id = p.client_id WHERE ${VISIBLE} ORDER BY 1`,
    )
    return rows.map((r) => r.genre)
  },
  /** Handle único a partir de una base (agrega sufijo si está tomado). */
  async uniqueHandle(base: string, db: Db = pool): Promise<string> {
    const clean = base.replace(/-/g, '').slice(0, 24) || 'perfil'
    const { rows } = await db.query<{ handle: string }>(`SELECT handle FROM profiles WHERE handle = $1 OR handle LIKE $1 || '%'`, [clean])
    const taken = new Set(rows.map((r) => r.handle))
    if (!taken.has(clean)) return clean
    for (let i = 2; i < 1000; i++) if (!taken.has(`${clean}${i}`)) return `${clean}${i}`
    return `${clean}${Date.now().toString(36)}`
  },
}

type PostRow = Omit<Post, 'image'> & { image: string | null }
const POST_SELECT = `SELECT po.id, po.author_id AS "authorId", po.content, po.image, po.tag, po.likes, po.comments, po.created_at AS "createdAt" FROM posts po`
const toPost = (r: PostRow): Post => ({ ...r, image: r.image ?? undefined, createdAt: new Date(r.createdAt).toISOString() })

export const postRepo = {
  async feed(limit = 50): Promise<Post[]> {
    const rows = await q<PostRow>(
      `${POST_SELECT} JOIN profiles p ON p.id = po.author_id LEFT JOIN client c ON c.id = p.client_id
        WHERE ${VISIBLE} ORDER BY po.created_at DESC LIMIT $1`,
      [limit],
    )
    return rows.map(toPost)
  },
  async byAuthor(authorId: string): Promise<Post[]> {
    const rows = await q<PostRow>(`${POST_SELECT} WHERE po.author_id = $1 ORDER BY po.created_at DESC LIMIT 100`, [authorId])
    return rows.map(toPost)
  },
  async create(input: { authorId: string; content: string; tag: PostTag }): Promise<Post> {
    const row = await q1<PostRow>(
      `INSERT INTO posts (author_id, content, tag) VALUES ($1, $2, $3)
       RETURNING id, author_id AS "authorId", content, image, tag, likes, comments, created_at AS "createdAt"`,
      [input.authorId, input.content, input.tag],
    )
    return toPost(row!)
  },
  async count(): Promise<number> {
    const row = await q1<{ n: number }>(`SELECT count(*)::int AS n FROM posts`)
    return row?.n ?? 0
  },
}

const GIG_SELECT = `SELECT g.id, g.venue_id AS "venueId", g.title, to_char(g.date, 'YYYY-MM-DD') AS date, g.genres, g.fee, g.description, g.status,
    coalesce((SELECT array_agg(a.profile_id ORDER BY a.created_at) FROM gig_applications a WHERE a.gig_id = g.id), '{}') AS "applicantIds",
    to_char(g.created_at, 'YYYY-MM-DD') AS "createdAt"
  FROM gigs g JOIN profiles p ON p.id = g.venue_id LEFT JOIN client c ON c.id = g.client_id`

export const gigRepo = {
  /** Convocatorias. Con publicOnly=true solo las de venues visibles. clientId filtra por empresa (panel del venue). */
  async list(filter: { clientId?: string; venueId?: string; status?: Gig['status']; publicOnly?: boolean; upcoming?: boolean } = {}): Promise<Gig[]> {
    return q<Gig>(
      `${GIG_SELECT}
        WHERE ($1::uuid IS NULL OR g.client_id = $1)
          AND ($2::text IS NULL OR g.venue_id = $2)
          AND ($3::text IS NULL OR g.status = $3)
          AND (NOT $4::boolean OR ${VISIBLE})
          AND (NOT $5::boolean OR g.date >= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)
        ORDER BY g.date`,
      [filter.clientId ?? null, filter.venueId ?? null, filter.status ?? null, !!filter.publicOnly, !!filter.upcoming],
    )
  },
  async byId(id: string, clientId?: string): Promise<Gig | undefined> {
    const row = await q1<Gig>(`${GIG_SELECT} WHERE g.id = $1 AND ($2::uuid IS NULL OR g.client_id = $2)`, [id, clientId ?? null])
    return row ?? undefined
  },
  async create(input: { clientId: string; venueId: string; title: string; date: string; fee: number; description: string; genres: string[]; createdBy: string }) {
    const row = await q1<{ id: string }>(
      `INSERT INTO gigs (client_id, venue_id, title, date, fee, description, genres, created_by)
       VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8) RETURNING id`,
      [input.clientId, input.venueId, input.title, input.date, input.fee, input.description, input.genres, input.createdBy],
    )
    return row!.id
  },
  /** Postulación: solo a convocatorias abiertas, futuras y de venues visibles. Devuelve true si se agregó. */
  async addApplicant(gigId: string, profileId: string): Promise<boolean> {
    const rows = await q(
      `INSERT INTO gig_applications (gig_id, profile_id)
       SELECT g.id, $2 FROM gigs g JOIN profiles p ON p.id = g.venue_id LEFT JOIN client c ON c.id = g.client_id
        WHERE g.id = $1 AND g.status = 'open' AND g.date >= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AND ${VISIBLE}
       ON CONFLICT DO NOTHING RETURNING gig_id`,
      [gigId, profileId],
    )
    return rows.length > 0
  },
  /** Cambia el estado SOLO si la convocatoria es de esa empresa. */
  async setStatus(gigId: string, clientId: string, status: Gig['status']): Promise<boolean> {
    const rows = await q(`UPDATE gigs SET status = $3 WHERE id = $1 AND client_id = $2 RETURNING id`, [gigId, clientId, status])
    return rows.length > 0
  },
}

const CONN_SELECT = `SELECT id, from_id AS "fromId", to_id AS "toId", status, to_char(created_at, 'YYYY-MM-DD') AS "createdAt" FROM connections`

export const connectionRepo = {
  async forProfile(profileId: string): Promise<Connection[]> {
    return q<Connection>(`${CONN_SELECT} WHERE from_id = $1 OR to_id = $1 ORDER BY created_at DESC`, [profileId])
  },
  async between(a: string, b: string): Promise<Connection | undefined> {
    const row = await q1<Connection>(`${CONN_SELECT} WHERE (from_id = $1 AND to_id = $2) OR (from_id = $2 AND to_id = $1)`, [a, b])
    return row ?? undefined
  },
  /** Crea la solicitud si no existe ninguna entre ambos. Devuelve true si es nueva. */
  async request(fromId: string, toId: string): Promise<boolean> {
    const rows = await q(
      `INSERT INTO connections (from_id, to_id)
       SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM connections WHERE (from_id = $1 AND to_id = $2) OR (from_id = $2 AND to_id = $1))
       ON CONFLICT DO NOTHING RETURNING id`,
      [fromId, toId],
    )
    return rows.length > 0
  },
  /** Solo quien recibió la solicitud puede aceptarla. */
  async accept(id: string, toId: string): Promise<boolean> {
    const rows = await q(`UPDATE connections SET status = 'accepted' WHERE id = $1 AND to_id = $2 AND status = 'pending' RETURNING id`, [id, toId])
    return rows.length > 0
  },
  async count(): Promise<number> {
    const row = await q1<{ n: number }>(`SELECT count(*)::int AS n FROM connections`)
    return row?.n ?? 0
  },
}
