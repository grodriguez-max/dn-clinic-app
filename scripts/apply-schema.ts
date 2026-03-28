/**
 * Aplica el schema SQL completo a la base de datos de Supabase.
 *
 * Requiere la variable SUPABASE_DB_PASSWORD en .env.local.
 * La contraseña está en: Supabase Dashboard → Settings → Database → Database password
 *
 * Uso:
 *   npm run db:setup
 */

import { readFileSync } from "fs"
import { join } from "path"
import { Client } from "pg"

// Leer .env.local manualmente (tsx no carga dotenv por defecto)
function loadEnv() {
  try {
    const env = readFileSync(join(process.cwd(), ".env.local"), "utf-8")
    for (const line of env.split("\n")) {
      const [key, ...rest] = line.split("=")
      if (key && rest.length) {
        process.env[key.trim()] = rest.join("=").trim()
      }
    }
  } catch {
    // Ignorar si no existe
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const dbPassword = process.env.SUPABASE_DB_PASSWORD

if (!supabaseUrl || !dbPassword) {
  console.error("❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_DB_PASSWORD en .env.local")
  console.error("   La contraseña está en: Supabase Dashboard → Settings → Database → Database password")
  process.exit(1)
}

// Construir connection string a partir de la URL del proyecto
const projectRef = supabaseUrl.replace("https://", "").replace(".supabase.co", "")
const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`

async function applySchema() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

  try {
    await client.connect()
    console.log("✅ Conectado a Supabase")

    const sql = readFileSync(join(process.cwd(), "scripts/schema.sql"), "utf-8")

    // Separar en statements individuales (ignorar comentarios de bloque)
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"))

    let applied = 0
    let skipped = 0

    for (const stmt of statements) {
      const preview = stmt.slice(0, 60).replace(/\n/g, " ")
      try {
        await client.query(stmt)
        console.log(`  ✓ ${preview}...`)
        applied++
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        // Ignorar errores "ya existe" (idempotente)
        if (
          msg.includes("already exists") ||
          msg.includes("duplicate key") ||
          msg.includes("ya existe")
        ) {
          console.log(`  ↩ (ya existe) ${preview}...`)
          skipped++
        } else {
          console.error(`  ✗ ERROR: ${msg}`)
          console.error(`    Statement: ${preview}...`)
        }
      }
    }

    console.log(`\n✅ Schema aplicado: ${applied} statements, ${skipped} omitidos (ya existían)`)
  } catch (err) {
    console.error("❌ Error de conexión:", err)
    console.error("\nSi la región no es us-east-1, buscá la connection string correcta en:")
    console.error("Supabase Dashboard → Settings → Database → Connection string (Session pooler)")
    process.exit(1)
  } finally {
    await client.end()
  }
}

applySchema()
