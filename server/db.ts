import postgres from 'postgres'
import { config } from './config'

export const sql = postgres(config.databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 15,
})

export type DbClient = typeof sql
