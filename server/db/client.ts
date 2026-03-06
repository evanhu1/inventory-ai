import postgres from 'postgres'
import { env } from '../env.js'

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

export const sql = postgres(env.databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 20,
})
