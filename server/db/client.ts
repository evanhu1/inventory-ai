import postgres from 'postgres'
import { env } from '../env'

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

export const sql = postgres(env.databaseUrl, {
  max: process.env.VERCEL ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 20,
  prepare: false,
})
