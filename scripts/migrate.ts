import fs from 'node:fs/promises'
import path from 'node:path'
import dotenv from 'dotenv'
import postgres from 'postgres'

dotenv.config()

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

const sql = postgres(databaseUrl, { max: 1 })

async function run() {
  const migrationDir = path.resolve('migrations')
  const files = (await fs.readdir(migrationDir))
    .filter((file) => file.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const statement = await fs.readFile(path.join(migrationDir, file), 'utf8')
    process.stdout.write(`Applying ${file}\n`)
    await sql.unsafe(statement)
  }

  await sql.end()
}

run().catch(async (error) => {
  console.error(error)
  await sql.end({ timeout: 1 })
  process.exit(1)
})
