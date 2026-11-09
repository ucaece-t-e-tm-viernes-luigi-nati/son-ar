import 'server-only'

export type Role = 'user' | 'business' | 'superadmin'

export interface Session {
  profileId: string
  role: Role
}

// Demo sessions per surface. Replace with Better Auth `auth.api.getSession`
// once the auth integration is connected; callers already depend only on this contract.
const DEMO_SESSIONS: Record<Role, Session> = {
  user: { profileId: 'u1', role: 'user' },
  business: { profileId: 'v1', role: 'business' },
  superadmin: { profileId: 'admin', role: 'superadmin' },
}

export async function getSession(role: Role): Promise<Session> {
  return DEMO_SESSIONS[role]
}

export async function requireRole(role: Role): Promise<Session> {
  const session = await getSession(role)
  if (session.role !== role) throw new Error('Forbidden')
  return session
}
