import 'server-only'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool, type PoolClient, type QueryResultRow } from 'pg'
import * as schema from './schema'

// DATABASE_URL viene de Neon (en Vercel: Settings → Environment Variables; en tu PC: .env.local).
const globalForPool = globalThis as unknown as { sonarPool?: Pool }
export const pool = globalForPool.sonarPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 5 })
if (process.env.NODE_ENV !== 'production') globalForPool.sonarPool = pool

/** Drizzle con el esquema tipado (lib/schema.ts). Las consultas del MVP usan SQL parametrizado (q / q1 / tx). */
export const db = drizzle(pool, { schema })

/** Consulta SQL parametrizada. Devuelve las filas tipadas. */
export async function q<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  const result = await pool.query<T>(sql, params)
  return result.rows
}

export async function q1<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  const rows = await q<T>(sql, params)
  return rows[0] ?? null
}

/** Ejecuta varias sentencias en una transacción. */
export async function tx<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
