/**
 * Crea un usuario de QA en Supabase (auth + public.users + household), igual que POST /api/auth/register.
 *
 * Usa la misma URL y service role que el resto del proyecto (p. ej. .env.local).
 * Ejecuta una vez por proyecto Supabase si quieres el mismo email en dev/staging/prod.
 *
 * Uso:
 *   npx tsx scripts/create-qa-test-user.ts --email=qa+grok@tudominio.com
 *   npx tsx scripts/create-qa-test-user.ts --email=qa+grok@tudominio.com --password='Secreto-123'
 *   QA_TEST_USER_PASSWORD='Secreto-123' npx tsx scripts/create-qa-test-user.ts --email=...
 *
 * Opcional: unirse a un hogar existente (mismos datos que tu cuenta principal):
 *   npx tsx scripts/create-qa-test-user.ts --email=... --invite-code=ABCDEF123456
 *
 * Variables (o .env.local en la raíz del repo):
 *   NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEY
 */

import { createClient } from "@supabase/supabase-js"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local")
  if (!fs.existsSync(p)) return
  const text = fs.readFileSync(p, "utf8")
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function parseArgs() {
  const out: Record<string, string> = {}
  for (const a of process.argv.slice(2)) {
    if (a === "--help" || a === "-h") {
      out.help = "1"
      continue
    }
    const m = a.match(/^--([^=]+)=(.*)$/)
    if (m) out[m[1]] = m[2]
  }
  return out
}

function randomPassword() {
  const bytes = crypto.randomBytes(18)
  const b64 = bytes.toString("base64url")
  return `Qa-${b64}Aa1`
}

function buildHouseholdName(email: string) {
  const base = email.split("@")[0]?.trim()
  return base ? `${base} Household` : "Household"
}

function generateInviteCode() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12)
}

function supabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    ""
  )
}

function serviceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    ""
  )
}

async function main() {
  loadEnvLocal()
  const args = parseArgs()

  if (args.help) {
    console.log(`create-qa-test-user.ts — crea auth user + users + household (o join por invite).

  --email=...              obligatorio
  --password=...           opcional (si falta: QA_TEST_USER_PASSWORD o contraseña aleatoria)
  --invite-code=...        opcional: unir al hogar existente
  Requiere NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (o equivalentes en .env.local).
`)
    process.exit(0)
  }

  const email = (args.email ?? "").trim().toLowerCase()
  const inviteCodeRaw = (args["invite-code"] ?? args.inviteCode ?? "").trim()
  const inviteCode = inviteCodeRaw.length > 0 ? inviteCodeRaw : null

  let password = (args.password ?? process.env.QA_TEST_USER_PASSWORD ?? "").trim()
  if (!password) password = randomPassword()

  if (!email) {
    console.error("Falta --email=... (usa un alias real tuyo, ej. qa+grok@gmail.com)")
    process.exit(1)
  }

  const url = supabaseUrl()
  const key = serviceRoleKey()
  if (!url || !key) {
    console.error(
      "Configura NEXT_PUBLIC_SUPABASE_URL (o SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY).",
    )
    process.exit(1)
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    const msg = authError.message.toLowerCase()
    if (msg.includes("already been registered") || msg.includes("already registered")) {
      console.error(`El usuario ya existe en este proyecto Supabase: ${email}`)
      console.error("Inicia sesión en la app con esa URL o borra el usuario en Authentication > Users si quieres recrearlo.")
      process.exit(1)
    }
    console.error("auth.admin.createUser:", authError.message)
    process.exit(1)
  }

  if (!authUser.user) {
    console.error("No se obtuvo usuario tras createUser")
    process.exit(1)
  }

  const userId = authUser.user.id
  let householdId: string

  if (inviteCode) {
    const { data: household, error: householdError } = await admin
      .from("households")
      .select("id")
      .eq("invite_code", inviteCode)
      .single()

    if (householdError || !household) {
      await admin.auth.admin.deleteUser(userId).catch(() => null)
      console.error("Invite code inválido o hogar no encontrado:", householdError?.message ?? "")
      process.exit(1)
    }
    householdId = household.id as string
  } else {
    let createdHouseholdId: string | null = null
    let lastError: Error | null = null

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: newHousehold, error: createError } = await admin
        .from("households")
        .insert({
          owner_user_id: userId,
          name: buildHouseholdName(email),
          invite_code: generateInviteCode(),
        })
        .select("id")
        .single()

      if (!createError && newHousehold) {
        createdHouseholdId = newHousehold.id as string
        break
      }

      lastError = createError ?? new Error("No se pudo crear household")
      const code = (createError as { code?: string } | null)?.code
      if (code !== "23505") break
    }

    if (!createdHouseholdId) {
      await admin.auth.admin.deleteUser(userId).catch(() => null)
      console.error(lastError?.message ?? "No se pudo crear household")
      process.exit(1)
    }

    householdId = createdHouseholdId
  }

  const { error: userInsertError } = await admin.from("users").insert({
    id: userId,
    email,
    household_id: householdId,
  })

  if (userInsertError) {
    await admin.auth.admin.deleteUser(userId).catch(() => null)
    console.error("insert users:", userInsertError.message)
    process.exit(1)
  }

  console.log("\nUsuario QA creado en:", url.replace(/\/$/, ""))
  console.log("  email:", email)
  console.log("  password:", password)
  console.log("  household_id:", householdId)
  console.log("\nEntrar (misma base que apunte tu .env.local):")
  console.log("  Local:   http://localhost:3000/auth")
  console.log("  Producción (si este proyecto es el de orvita.app): https://orvita.app/auth")
  console.log(
    "\nPara Grok u otra IA: pega URL + email + contraseña en un chat privado; no subas credenciales al repo.\n",
  )
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
