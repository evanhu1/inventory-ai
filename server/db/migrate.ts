import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from './client.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.resolve(__dirname, '../../migrations')

const main = async () => {
  await sql`
    create table if not exists schema_migrations (
      id bigserial primary key,
      name text not null unique,
      applied_at timestamptz not null default now()
    )
  `

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const applied = await sql<{ name: string }[]>`
      select name from schema_migrations where name = ${file}
    `
    if (applied.length > 0) {
      continue
    }

    const contents = await fs.readFile(path.join(migrationsDir, file), 'utf8')
    await sql.begin(async (tx) => {
      const db = tx as unknown as typeof sql
      await db.unsafe(contents)
      await db`insert into schema_migrations (name) values (${file})`
    })
    console.log(`applied migration ${file}`)
  }

  await sql.end()
}

main().catch(async (error) => {
  console.error(error)
  await sql.end()
  process.exit(1)
})
