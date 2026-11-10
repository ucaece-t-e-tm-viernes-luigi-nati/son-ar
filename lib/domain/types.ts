// Tipos y catálogos del dominio (servidor y navegador). Los datos vienen de Neon (lib/repositories).

export type AccountKind = 'musician' | 'band' | 'venue'
export type AccountStatus = 'active' | 'paused'
export type VenueType = 'Bar' | 'Restaurante' | 'Teatro' | 'Centro cultural'

export interface Profile {
  id: string
  kind: AccountKind
  name: string
  handle: string
  avatar?: string
  city: string
  neighborhood: string
  genres: string[]
  instruments: string[]
  lookingFor: string[]
  bio: string
  members?: number
  capacity?: number
  venueType?: VenueType
  verified: boolean
  status: AccountStatus
  followers: number
  createdAt: string
  userId?: string | null
  clientId?: string | null
}

export type PostTag = 'busqueda' | 'show' | 'novedad'

export interface Post {
  id: string
  authorId: string
  content: string
  image?: string
  tag: PostTag
  likes: number
  comments: number
  createdAt: string
}

export type GigStatus = 'open' | 'closed'

export interface Gig {
  id: string
  venueId: string
  title: string
  date: string
  genres: string[]
  fee: number
  description: string
  status: GigStatus
  applicantIds: string[]
  createdAt: string
}

export type ConnectionStatus = 'pending' | 'accepted'

export interface Connection {
  id: string
  fromId: string
  toId: string
  status: ConnectionStatus
  createdAt: string
}

export interface DailyActivity {
  date: string
  activeUsers: number
  signups: number
  connections: number
  posts: number
  gigApplications: number
}

export interface MonthlyActivity {
  month: string
  activeUsers: number
  signups: number
  connections: number
  gigApplications: number
}

export interface Match {
  profile: Profile
  score: number
  reasons: string[]
}

export const KIND_LABEL: Record<AccountKind, string> = {
  musician: 'Músico',
  band: 'Banda',
  venue: 'Venue',
}

export const TAG_LABEL: Record<PostTag, string> = {
  busqueda: 'Búsqueda',
  show: 'Show',
  novedad: 'Novedad',
}

export const VENUE_TYPES: VenueType[] = ['Bar', 'Restaurante', 'Teatro', 'Centro cultural']

export const GENRES = [
  'Rock',
  'Indie',
  'Alternativo',
  'Pop',
  'Folk',
  'Acústico',
  'Jazz',
  'Blues',
  'Funk',
  'Neo soul',
  'Cumbia',
  'Tropical',
  'Reggae',
  'Electrónica',
  'Synthpop',
  'Bossa nova',
  'Tango',
  'Folklore',
  'Trap',
  'Hip hop',
] as const

export const INSTRUMENTS = [
  'Voz',
  'Guitarra',
  'Guitarra acústica',
  'Guitarra eléctrica',
  'Bajo eléctrico',
  'Contrabajo',
  'Batería',
  'Percusión',
  'Teclados',
  'Sintetizadores',
  'Violín',
  'Saxo',
  'Trompeta',
  'Ukelele',
  'Producción',
] as const

export const LOOKING_FOR = ['Banda', 'Bajista', 'Baterista', 'Guitarrista', 'Voz', 'Violinista', 'Tecladista', 'Fechas', 'Sesiones', 'Productor'] as const

export const NEIGHBORHOODS = [
  'Centro',
  'Güemes',
  'La Perla',
  'Puerto',
  'Constitución',
  'Playa Grande',
  'Plaza Mitre',
  'Los Troncos',
  'Punta Mogotes',
] as const
