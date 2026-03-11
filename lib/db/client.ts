import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../env'
import * as schema from './schema'

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

const connection = postgres(env.databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 20,
})

export const db = drizzle(connection, { schema })
