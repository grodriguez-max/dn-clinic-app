/**
 * Aplica un archivo de migration SQL específico.
 * Uso: npx tsx scripts/apply-migration.ts supabase/migrations/20260328_billing.sql
 */

import { readFileSync } from "fs"
import { join } from "path"
import { Client } from "pg"

function loadEnv() {
  try {
    const env = readFileSync(join(process.cwd(), ".env.local"), "utf-8")
    for (const line of env.split("\n")) {
      const [key, ...rest] = line.split("=")
      if (key && rest.length) process.env[key.trim()] = rest.join("=").trim()
    }
  } catch { /* ignore */ }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const dbPassword = process.env.SUPABASE_DB_PASSWORD

if (!supabaseUrl || !dbPassword) {
  console.error("❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_DB_PASSWORD en .env.local")
  process.exit(1)
}

const migrationFile = process.argv[2]
if (!migrationFile) {
  console.error("❌ Indicá el archivo: npx tsx scripts/apply-migration.ts supabase/migrations/20260328_billing.sql")
  process.exit(1)
}

const projectRef = supabaseUrl.replace("https://", "").replace(".supabase.co", "")
const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

  try {
    await client.connect()
    console.log("✅ Conectado a Supabase")

    const sql = readFileSync(join(process.cwd(), migrationFile), "utf-8")
    await client.query(sql)
    console.log(`✅ Migration aplicada: ${migrationFile}`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("❌ Error:", msg)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
