import 'server-only'
import { q } from './db'

// Registro de actividad real (tabla activity_events): alimenta el dashboard diario/mensual del superadmin.
export type ActivityType = 'signup' | 'login' | 'visit' | 'post' | 'connection' | 'connection_accepted' | 'gig_application' | 'gig_created'

/** Registra un evento. Nunca rompe el flujo principal si falla. */
export async function track(profileId: string | null, type: ActivityType) {
  try {
    await q(`INSERT INTO activity_events (profile_id, type) VALUES ($1, $2)`, [profileId, type])
  } catch (error) {
    console.error('[activity] No se pudo registrar', type, error)
  }
}

/** Una "visita" por perfil y por día (hora de Argentina): sirve para contar usuarios activos diarios. */
export async function trackDailyVisit(profileId: string) {
  try {
    await q(
      `INSERT INTO activity_events (profile_id, type)
       SELECT $1, 'visit'
        WHERE NOT EXISTS (
          SELECT 1 FROM activity_events
           WHERE profile_id = $1 AND type = 'visit'
             AND created_at >= (date_trunc('day', now() AT TIME ZONE 'America/Argentina/Buenos_Aires') AT TIME ZONE 'America/Argentina/Buenos_Aires'))`,
      [profileId],
    )
  } catch (error) {
    console.error('[activity] No se pudo registrar la visita', error)
  }
}

/** Ingreso de un músico o banda (lo llama el hook de sesión de better-auth). Los venues y el equipo no cuentan. */
export async function trackLogin(userId: string) {
  try {
    await q(
      `INSERT INTO activity_events (profile_id, type)
       SELECT id, 'login' FROM profiles WHERE user_id = $1 AND kind IN ('musician','band')`,
      [userId],
    )
  } catch (error) {
    console.error('[activity] No se pudo registrar el ingreso', error)
  }
}
