// Matriz de permisos de Son.ar. ÚNICO lugar donde se define quién puede qué.
// Se chequea SIEMPRE en el servidor (lib/guards.ts), en páginas, server actions y route handlers.

export type PlatformRole = 'superadmin' | 'admin' | 'member'
export type VenueRole = 'owner' | 'staff'

// ---------- Superficie pública: músicos y bandas (/app) ----------
export type UserPermission = 'feed.view' | 'post.create' | 'connection.request' | 'connection.accept' | 'gig.apply' | 'profile.edit'

/** Músicos y bandas activos pueden todo; una cuenta pausada por el equipo solo puede mirar. */
export const USER_PERMISSIONS: Record<'active' | 'paused', readonly UserPermission[]> = {
  active: ['feed.view', 'post.create', 'connection.request', 'connection.accept', 'gig.apply', 'profile.edit'],
  paused: ['feed.view'],
}

export function userCan(status: string | null | undefined, permission: UserPermission) {
  return status === 'active' || status === 'paused' ? USER_PERMISSIONS[status].includes(permission) : false
}

/** Tipos de perfil que entran por /ingresar. Los venues entran solo por su panel. */
export const PUBLIC_KINDS = ['musician', 'band'] as const

// ---------- Superficie de empresas: venues (/empresa) ----------
export type VenuePermission =
  | 'dashboard.view' // ver resumen del venue
  | 'gigs.manage' // crear y cerrar convocatorias
  | 'applicants.view' // ver postulantes y su perfil
  | 'venue.edit' // editar el perfil del local
  | 'team.view' // ver el equipo
  | 'team.manage' // invitar / quitar miembros
  | 'billing.view' // ver plan y pagos

export const VENUE_PERMISSIONS: Record<VenueRole, readonly VenuePermission[]> = {
  owner: ['dashboard.view', 'gigs.manage', 'applicants.view', 'venue.edit', 'team.view', 'team.manage', 'billing.view'],
  staff: ['dashboard.view', 'gigs.manage', 'applicants.view', 'team.view'],
}

export const VENUE_ROLE_LABELS: Record<VenueRole, { name: string; description: string }> = {
  owner: { name: 'Propietario', description: 'Control total del venue: convocatorias, perfil, equipo y plan.' },
  staff: { name: 'Staff', description: 'Publica y cierra convocatorias y revisa a los postulantes.' },
}

export const PERMISSION_LABELS: Record<VenuePermission, string> = {
  'dashboard.view': 'Ver el resumen del venue',
  'gigs.manage': 'Crear y cerrar convocatorias',
  'applicants.view': 'Ver postulantes y su perfil',
  'venue.edit': 'Editar el perfil del local',
  'team.view': 'Ver el equipo',
  'team.manage': 'Invitar y quitar miembros del equipo',
  'billing.view': 'Ver plan y pagos',
}

export function venueCan(role: VenueRole | null | undefined, permission: VenuePermission) {
  return !!role && VENUE_PERMISSIONS[role].includes(permission)
}

/** Estados del cliente en los que el panel queda en solo-lectura y el venue y sus convocatorias se ocultan al público. */
export const READ_ONLY_STATUSES = ['paused', 'cancelled'] as const
export const PUBLIC_VISIBLE_STATUSES = ['trial', 'active', 'past_due'] as const

export function isReadOnlyStatus(status: string) {
  return (READ_ONLY_STATUSES as readonly string[]).includes(status)
}

// ---------- Superficie del equipo (/plataforma) ----------
// Dos niveles, con las MISMAS funciones en /plataforma:
// - superadmin principal: rol 'superadmin' + email en SUPERADMIN_EMAILS (env). Nadie lo puede quitar desde el panel.
// - admin del equipo: rol 'admin', creado desde /plataforma/equipo por otro superadmin o admin. Se puede quitar.
type PlatformUser = { role: string; email: string; emailVerified: boolean } | null

/** Superadmin principal: rol en la base + email en SUPERADMIN_EMAILS + email verificado. Las tres cosas. */
export function isRootSuperadmin(user: PlatformUser, allowedEmails: string[]) {
  return !!user && user.role === 'superadmin' && user.emailVerified && allowedEmails.includes(user.email.toLowerCase())
}

/** Acceso a /plataforma: superadmin principal o admin del equipo con email verificado. */
export function isSuperadmin(user: PlatformUser, allowedEmails: string[]) {
  return isRootSuperadmin(user, allowedEmails) || (!!user && user.role === 'admin' && user.emailVerified)
}

export const PLATFORM_ROLES = ['superadmin', 'admin'] as const
