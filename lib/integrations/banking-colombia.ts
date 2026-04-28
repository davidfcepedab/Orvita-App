/**
 * Integración bancaria Colombia vía Belvo (sandbox / producción).
 * Credenciales: BANKING_COLOMBIA_BASE_URL, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI.
 * Opcional: institución Belvo por banco (ver BELVO_INSTITUTION_*).
 */

import { Buffer } from "node:buffer"

type BankProvider = "bancolombia" | "davivienda" | "nequi"

export type BankingConnectionResult = {
  provider: BankProvider
  providerAccountId: string
  accessToken: string
  refreshToken: string | null
  accountName: string
  accountMask: string
  balanceAvailable: number
  balanceCurrent: number
  metadata: Record<string, unknown>
}

export type BankingTransactionResult = {
  postedAt: string
  description: string
  amount: number
  direction: "credit" | "debit"
  category: string
  externalId: string | null
}

export type BelvoWidgetSession = {
  access: string
  refresh: string | null
  widgetUrl: string
}

function belvoInstitutionForProvider(provider: BankProvider): string {
  const envKey =
    provider === "bancolombia"
      ? "BANKING_BELVO_INSTITUTION_BANCOLOMBIA"
      : provider === "davivienda"
        ? "BANKING_BELVO_INSTITUTION_DAVIVIENDA"
        : "BANKING_BELVO_INSTITUTION_NEQUI"
  const fromEnv = process.env[envKey]?.trim()
  if (fromEnv) return fromEnv
  const fallback = process.env.BANKING_BELVO_SANDBOX_INSTITUTION?.trim()
  if (fallback) return fallback
  const coDefault = process.env.BANKING_BELVO_SANDBOX_DEFAULT_INSTITUTION_CO?.trim()
  if (coDefault) return coDefault
  if (provider === "davivienda") return "davivienda_co_retail"
  if (provider === "nequi") return "nequi_co_retail"
  return "ofmockbank_co_retail"
}

function belvoSandboxFallbackInstitution(): string {
  return (
    process.env.BANKING_BELVO_SANDBOX_FALLBACK_INSTITUTION?.trim() ||
    process.env.BANKING_BELVO_SANDBOX_DEFAULT_INSTITUTION_CO?.trim() ||
    "ofmockbank_co_retail"
  )
}

function belvoSandboxInstitutionCandidates(primary: string): string[] {
  const list = [
    primary,
    process.env.BANKING_BELVO_SANDBOX_DEFAULT_INSTITUTION_CO?.trim(),
    process.env.BANKING_BELVO_SANDBOX_FALLBACK_INSTITUTION?.trim(),
    "ofmockbank_co_retail",
    "ofmockbank_br_retail",
  ].filter(Boolean) as string[]
  return Array.from(new Set(list.map((s) => s.trim()).filter(Boolean)))
}

function sandboxLinkCredentials(): { username: string; password: string } {
  return {
    username: process.env.BANKING_BELVO_SANDBOX_USERNAME?.trim() || "belvouser100",
    password: process.env.BANKING_BELVO_SANDBOX_PASSWORD?.trim() || "sandbox",
  }
}

function isBelvoBrInstitution(institution: string): boolean {
  const n = institution.toLowerCase()
  return n.includes("_br_") || n.includes("ofmockbank_br")
}

function sandboxCountryCodesForInstitution(institution: string): Array<"CO" | "BR"> {
  return isBelvoBrInstitution(institution) ? ["BR"] : ["CO"]
}

function inferWidgetCountryFromInstitutions(institutions: string[]): "CO" | "BR" {
  const forced = process.env.BANKING_BELVO_WIDGET_COUNTRY?.trim().toUpperCase()
  if (forced === "BR" || forced === "CO") return forced
  return institutions.some((name) => isBelvoBrInstitution(name)) ? "BR" : "CO"
}

function normalizeSandboxUsernameForInstitution(institution: string, username: string): string {
  if (isBelvoBrInstitution(institution)) {
    return process.env.BANKING_BELVO_SANDBOX_CPF?.trim() || username || "12345678901"
  }
  return username
}

/** Host sandbox Belvo (links Colombia suelen exigir `username_type` 103 o 104). */
export function isBelvoSandboxBase(baseUrl: string): boolean {
  const u = baseUrl.toLowerCase()
  return u.includes("sandbox.belvo")
}

export function isBelvoSandbox(): boolean {
  const base = process.env.BANKING_COLOMBIA_BASE_URL?.trim() ?? ""
  return base.length > 0 && isBelvoSandboxBase(base)
}

/** Tipo de usuario Belvo Colombia (sandbox): 103 o 104. Lee env con fallback seguro. */
export function getBelvoSandboxUsernameType(): number {
  const raw = process.env.BANKING_BELVO_SANDBOX_USERNAME_TYPE?.trim()
  if (!raw) return 103
  const n = Number.parseInt(raw, 10)
  if (n === 103 || n === 104) return n
  return 103
}

function isBelvoBrSandboxMockInstitution(institution: string): boolean {
  const ins = institution.toLowerCase()
  return ins.includes("ofmockbank_br")
}

/** Enlaces Órvita (CO): siempre `username_type` (103/104) incluso en sandbox. */
function resolveLinkUsernameType(explicit: number | undefined): number {
  if (explicit !== undefined && Number.isFinite(explicit) && (explicit === 103 || explicit === 104)) {
    return explicit
  }
  return getBelvoSandboxUsernameType()
}

function usernameTypeCandidates(explicit?: number): number[] {
  const primary = resolveLinkUsernameType(explicit)
  return primary === 103 ? [103, 104] : [104, 103]
}

type BelvoLinkAttempt = {
  label: string
  institution: string
  payload: Record<string, unknown>
}

/** Cierre sandbox: 4 combinaciones determinísticas en orden. */
function getBelvoLinkPayload(institutionSlug: string): BelvoLinkAttempt[] {
  const creds = sandboxLinkCredentials()
  const username = normalizeSandboxUsernameForInstitution(institutionSlug, creds.username)
  const fallbackInstitution = "ofmockbank_br_retail"
  const fallbackUsernamePrimary = process.env.BANKING_BELVO_SANDBOX_CPF?.trim() || "52998224725"
  const fallbackUsernameCandidates = Array.from(
    new Set([fallbackUsernamePrimary, "52998224725", "11144477735"].map((s) => s.trim()).filter(Boolean)),
  )
  const brMockConsentBase = {
    scopes: ["read_accounts", "read_balances", "read_transactions"],
    consent_type: "explicit",
  }
  const brMockConsentCandidates: Array<Record<string, unknown>> = [
    {
      ...brMockConsentBase,
      consent_mode: "recurrent",
      expiration_date: "2026-12-31",
    },
    {
      ...brMockConsentBase,
      consent_mode: "single",
      expiration_date: "2026-12-31",
    },
    {
      ...brMockConsentBase,
      consent_mode: "recurrent",
      expiration_date: "2026-12-31T00:00:00Z",
    },
    {
      consent: {
        ...brMockConsentBase,
        consent_mode: "recurrent",
        expiration_date: "2026-12-31",
      },
    },
  ]
  const brFallbackAttempts: BelvoLinkAttempt[] = []
  for (const cpf of fallbackUsernameCandidates) {
    for (const [idx, consentVariant] of brMockConsentCandidates.entries()) {
      brFallbackAttempts.push({
        label: `br-fallback-consent-v${idx + 1}-ut-103-cpf-${cpf.slice(-4)}`,
        institution: fallbackInstitution,
        payload: {
          institution: fallbackInstitution,
          username: cpf,
          password: creds.password,
          username_type: "103",
          country_codes: ["BR"],
          ...consentVariant,
        },
      })
      brFallbackAttempts.push({
        label: `br-fallback-consent-v${idx + 1}-ut-104-cpf-${cpf.slice(-4)}`,
        institution: fallbackInstitution,
        payload: {
          institution: fallbackInstitution,
          username: cpf,
          password: creds.password,
          username_type: 104,
          country_codes: ["BR"],
          ...consentVariant,
        },
      })
    }
  }

  return [
    {
      label: "co-ut-103",
      institution: institutionSlug,
      payload: {
        institution: institutionSlug,
        username,
        password: creds.password,
        username_type: "103",
        country_codes: ["CO"],
      },
    },
    {
      label: "co-ut-104",
      institution: institutionSlug,
      payload: {
        institution: institutionSlug,
        username,
        password: creds.password,
        username_type: "104",
        country_codes: ["CO"],
      },
    },
    {
      label: "br-ut-103",
      institution: institutionSlug,
      payload: {
        institution: institutionSlug,
        username,
        password: creds.password,
        username_type: "103",
        country_codes: ["BR"],
      },
    },
    {
      label: "br-fallback-ut-103",
      institution: fallbackInstitution,
      payload: {
        institution: fallbackInstitution,
        username: fallbackUsernamePrimary,
        password: creds.password,
        username_type: "103",
        country_codes: ["BR"],
      },
    },
    ...brFallbackAttempts,
  ]
}

function extractRequestIdFromBelvoErrorMessage(message: string): string | null {
  const m = message.match(/request_id=([a-f0-9]{32})/i)
  return m?.[1] ?? null
}

export function isBelvoBankingConfigured(): boolean {
  const base = process.env.BANKING_COLOMBIA_BASE_URL?.trim()
  const clientId = process.env.BANKING_COLOMBIA_CLIENT_ID?.trim()
  const clientSecret = process.env.BANKING_COLOMBIA_CLIENT_SECRET?.trim()
  const redirectUri = process.env.BANKING_COLOMBIA_REDIRECT_URI?.trim()
  return Boolean(base && clientId && clientSecret && redirectUri)
}

function getEnv(provider: BankProvider) {
  const allowMock = process.env.ORVITA_INTEGRATIONS_ALLOW_MOCK === "1"
  if (!isBelvoBankingConfigured()) {
    if (allowMock) return { fallback: true as const, provider }
    throw new Error(
      `Integración bancaria real no configurada (${provider}). Define BANKING_COLOMBIA_BASE_URL, CLIENT_ID, CLIENT_SECRET y REDIRECT_URI.`,
    )
  }
  const base = process.env.BANKING_COLOMBIA_BASE_URL!.replace(/\/+$/, "")
  const clientId = process.env.BANKING_COLOMBIA_CLIENT_ID!.trim()
  const clientSecret = process.env.BANKING_COLOMBIA_CLIENT_SECRET!.trim()
  const redirectUri = process.env.BANKING_COLOMBIA_REDIRECT_URI!.trim()
  return { fallback: false as const, base, clientId, clientSecret, redirectUri, provider }
}

function basicAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")}`
}

function normalizeBelvoList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === "object" && "results" in payload && Array.isArray((payload as { results: unknown }).results)) {
    return (payload as { results: unknown[] }).results
  }
  return []
}

export function parseBelvoErrorPayload(text: string): { requestId: string | null; summary: string } {
  let requestId: string | null = null
  let summary = text.slice(0, 500)
  try {
    const parsed = JSON.parse(text) as unknown
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0] && typeof parsed[0] === "object") {
      const row = parsed[0] as { request_id?: string; message?: string; field?: string; code?: string }
      if (typeof row.request_id === "string") requestId = row.request_id
      const parts = [row.message, row.field ? `field=${row.field}` : null, row.code ? `code=${row.code}` : null].filter(
        Boolean,
      )
      if (parts.length) summary = parts.join(" · ")
    }
  } catch {
    /* usar texto crudo */
  }
  return { requestId, summary }
}

async function belvoRequestJson<T>(
  base: string,
  path: string,
  clientId: string,
  clientSecret: string,
  init: { method?: string; json?: unknown },
): Promise<T> {
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`
  const headers: Record<string, string> = {
    Authorization: basicAuthHeader(clientId, clientSecret),
  }
  let body: string | undefined
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json"
    body = JSON.stringify(init.json)
  }
  const res = await fetch(url, { method: init.method ?? "GET", headers, body })
  const text = await res.text()
  if (!res.ok) {
    const { requestId, summary } = parseBelvoErrorPayload(text)
    const idPart = requestId ? ` request_id=${requestId}` : ""
    throw new Error(`Belvo ${path} → ${res.status}:${idPart} ${summary}`)
  }
  if (!text) return {} as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Belvo ${path}: respuesta no JSON`)
  }
}

export function mapBelvoInstitutionToProvider(institution: string | null | undefined): BankProvider {
  const s = (institution ?? "").toLowerCase()
  if (s.includes("davivienda")) return "davivienda"
  if (s.includes("nequi")) return "nequi"
  if (s.includes("bancolombia")) return "bancolombia"
  return "bancolombia"
}

/**
 * Token de widget (Hosted Widget).
 * Spec Belvo: `POST /api/token/` con Basic Auth + cuerpo JSON; widget requiere URLs válidas y branding mínimo.
 */
export async function createBelvoWidgetSession(input: { locale?: string } = {}): Promise<BelvoWidgetSession> {
  const env = getEnv("bancolombia")
  if (env.fallback) {
    throw new Error("Widget Belvo no disponible en modo mock.")
  }
  const redirect = env.redirectUri.replace(/\/+$/, "")
  const exitUrl = redirect.includes("?") ? `${redirect}&event=exit` : `${redirect}?event=exit`
  const eventUrl = redirect.includes("?") ? `${redirect}&event=error` : `${redirect}?event=error`
  const companyName = process.env.BANKING_BELVO_WIDGET_COMPANY_NAME?.trim() || "Órvita"
  const termsUrl =
    process.env.BANKING_BELVO_WIDGET_TERMS_URL?.trim() || "https://belvo.com/legal/terms-of-use-and-privacy-policy/"
  const termsVersion = process.env.BANKING_BELVO_WIDGET_TERMS_VERSION?.trim() || "2024-03-15"

  const tokenUrl = `${env.base}/api/token/`
  const sandbox = isBelvoSandboxBase(env.base)
  const usernameType = getBelvoSandboxUsernameType()
  const widgetInstitutions = (() => {
    const fromEnv =
      process.env.BANKING_BELVO_WIDGET_CO_INSTITUTIONS?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? []
    return fromEnv
  })()
  const institutionsFilter = process.env.BANKING_BELVO_WIDGET_CO_INSTITUTIONS?.trim()
  const widgetCountry = inferWidgetCountryFromInstitutions(
    institutionsFilter
      ? institutionsFilter.split(",").map((s) => s.trim()).filter(Boolean)
      : widgetInstitutions,
  )

  const tokenBody: Record<string, unknown> = {
    id: env.clientId,
    password: env.clientSecret,
    scopes: "read_institutions,write_links",
    fetch_resources: ["ACCOUNTS", "TRANSACTIONS"],
    credentials_storage: "store",
    stale_in: "365d",
    country_codes: [widgetCountry],
    ...(widgetCountry === "CO" ? { username_type: usernameType } : {}),
    institution_types: ["retail"],
    widget: {
      callback_urls: {
        success: redirect,
        exit: exitUrl,
        event: eventUrl,
      },
      branding: {
        company_name: companyName,
        company_terms_url: termsUrl,
        company_terms_version: termsVersion,
      },
      theme: [] as unknown[],
      country_codes: [widgetCountry],
      institution_types: ["retail"],
    },
  }

  const postToken = (useBasic: boolean) =>
    fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(useBasic ? { Authorization: basicAuthHeader(env.clientId, env.clientSecret) } : {}),
      },
      body: JSON.stringify(tokenBody),
    })

  let tokenRes = await postToken(false)
  if (tokenRes.status === 401) {
    tokenRes = await postToken(true)
  }
  const tokenText = await tokenRes.text()
  if (!tokenRes.ok) {
    const { requestId, summary } = parseBelvoErrorPayload(tokenText)
    const idPart = requestId ? ` request_id=${requestId}` : ""
    throw new Error(`Belvo /api/token/ → ${tokenRes.status}:${idPart} ${summary}`)
  }
  let tokenPayload: { access?: string; refresh?: string }
  try {
    tokenPayload = JSON.parse(tokenText || "{}") as { access?: string; refresh?: string }
  } catch {
    throw new Error("Belvo /api/token/: respuesta inválida")
  }
  const access = tokenPayload.access
  if (!access) throw new Error("Belvo no devolvió access token para el widget.")
  const locale = input.locale ?? "es"
  const params = new URLSearchParams({
    access_token: access,
    locale,
    country_codes: widgetCountry,
    access_mode: "recurrent",
    institution_types: "retail",
  })
  if (institutionsFilter) {
    params.set("institutions", institutionsFilter)
  }
  const widgetUrl = `https://widget.belvo.io/?${params.toString()}`
  return { access, refresh: tokenPayload.refresh ?? null, widgetUrl }
}

async function registerBelvoLink(
  base: string,
  clientId: string,
  clientSecret: string,
  institution: string,
  usernameType: number | undefined,
  orvitaColombiaBankFlow: boolean,
): Promise<string> {
  const sandbox = isBelvoSandboxBase(base)
  let lastErr: unknown = null
  const attempts = sandbox ? getBelvoLinkPayload(institution) : getBelvoLinkPayload(institution).slice(0, 1)

  for (const [idx, attempt] of attempts.entries()) {
    try {
      const created = await belvoRequestJson<{ id?: string }>(base, "/api/links/", clientId, clientSecret, {
        method: "POST",
        json: attempt.payload,
      })
      if (!created.id) throw new Error("Belvo no devolvió id de link al registrar.")
      return created.id
    } catch (err) {
      lastErr = err
      const msg = err instanceof Error ? err.message : String(err)
      const requestId = extractRequestIdFromBelvoErrorMessage(msg)
      console.warn("[belvo/registerLink] intento fallido", {
        attempt: idx + 1,
        label: attempt.label,
        institution: attempt.institution,
        request_id: requestId,
      })
    }
  }
  throw (lastErr instanceof Error ? lastErr : new Error("Belvo no permitió crear el link con las credenciales sandbox probadas."))
}

async function fetchBelvoAccounts(
  base: string,
  clientId: string,
  clientSecret: string,
  linkId: string,
): Promise<unknown[]> {
  const raw = await belvoRequestJson<unknown>(base, "/api/accounts/", clientId, clientSecret, {
    method: "POST",
    json: { link: linkId },
  })
  return normalizeBelvoList(raw)
}

function pickNumber(...vals: unknown[]): number {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return v
    if (typeof v === "string") {
      const n = Number(v)
      if (Number.isFinite(n)) return n
    }
  }
  return 0
}

function accountMaskFromBelvo(account: Record<string, unknown>): string {
  const num = account.number ?? account.last_four ?? account.lastFourDigits
  if (typeof num === "string" && num.length >= 4) return `****${num.slice(-4)}`
  if (typeof num === "number") return `****${String(num).slice(-4)}`
  const id = account.id
  if (typeof id === "string" && id.length >= 4) return `****${id.slice(-4)}`
  return "****0000"
}

function belvoRowsToConnectionResults(
  provider: BankProvider,
  linkId: string,
  institutionName: string,
  rows: unknown[],
): BankingConnectionResult[] {
  return rows.map((row) => {
    const a = row as Record<string, unknown>
    const bal = (a.balance ?? {}) as Record<string, unknown>
    const name = typeof a.name === "string" && a.name.trim() ? a.name : typeof a.category === "string" ? a.category : "Cuenta"
    const id = typeof a.id === "string" ? a.id : String(a.id ?? "account")
    return {
      provider,
      providerAccountId: id,
      accessToken: linkId,
      refreshToken: null,
      accountName: name,
      accountMask: accountMaskFromBelvo(a),
      balanceAvailable: pickNumber(bal.available, a.available_balance),
      balanceCurrent: pickNumber(bal.current, bal.available, a.current_balance),
      metadata: {
        connector: "belvo",
        belvo_link_id: linkId,
        belvo_account_id: id,
        belvo_institution: institutionName,
        environment: isBelvoSandbox() ? "sandbox" : "production",
      },
    } satisfies BankingConnectionResult
  })
}

export async function connectBankingColombia(input: {
  provider: BankProvider
  authCode?: string
  state?: string
  belvoInstitution?: string
  /** Forzar 103 o 104 (Colombia / sandbox); si se omite, se infiere del entorno. */
  usernameType?: number
}): Promise<BankingConnectionResult[]> {
  const env = getEnv(input.provider)
  if (env.fallback) {
    const suffix = `${Math.floor(1000 + Math.random() * 9000)}`
    const single: BankingConnectionResult = {
      provider: input.provider,
      providerAccountId: `${input.provider}-fallback-${suffix}`,
      accessToken: "fallback-mock-token",
      refreshToken: "fallback-mock-refresh",
      accountName:
        input.provider === "bancolombia"
          ? "Ahorros Bancolombia"
          : input.provider === "davivienda"
            ? "Cuenta Davivienda"
            : "Nequi principal",
      accountMask: `****${suffix}`,
      balanceAvailable: Math.round(2_000_000 + Math.random() * 5_000_000),
      balanceCurrent: Math.round(2_200_000 + Math.random() * 5_000_000),
      metadata: { fallback: true, provider: input.provider },
    }
    return [single]
  }

  const institution = input.belvoInstitution?.trim() || belvoInstitutionForProvider(input.provider)
  let linkId = ""
  if (input.authCode?.trim()) {
    linkId = input.authCode.trim()
    await belvoRequestJson<unknown>(env.base, `/api/links/${encodeURIComponent(linkId)}/`, env.clientId, env.clientSecret, {
      method: "GET",
    })
  } else {
    let lastErr: unknown = null
    const candidates = belvoSandboxInstitutionCandidates(institution)
    for (const candidate of candidates) {
      try {
        linkId = await registerBelvoLink(env.base, env.clientId, env.clientSecret, candidate, input.usernameType, true)
        break
      } catch (err) {
        lastErr = err
        const msg = err instanceof Error ? err.message : String(err)
        const missingInstitution = msg.toLowerCase().includes("does_not_exist") || msg.toLowerCase().includes("object with name")
        if (!missingInstitution) {
          throw err
        }
      }
    }
    if (!linkId) {
      const fallbackHint = belvoSandboxFallbackInstitution()
      const suffix = fallbackHint ? ` Configura un slug válido en BANKING_BELVO_SANDBOX_DEFAULT_INSTITUTION_CO o BANKING_BELVO_SANDBOX_FALLBACK_INSTITUTION (actual sugerido: ${fallbackHint}).` : ""
      const raw = lastErr instanceof Error ? lastErr.message : "No se encontró una institución sandbox válida."
      throw new Error(`${raw}${suffix}`)
    }
  }

  const accountRows = await fetchBelvoAccounts(env.base, env.clientId, env.clientSecret, linkId)
  if (accountRows.length === 0) {
    throw new Error(
      "Belvo no devolvió cuentas para este link. Si usaste el widget, espera unos segundos y pulsa «Sincronizar ahora».",
    )
  }

  return belvoRowsToConnectionResults(input.provider, linkId, institution, accountRows)
}

export type BelvoAccountBalance = {
  belvoAccountId: string
  balanceAvailable: number
  balanceCurrent: number
}

export async function fetchBelvoAccountBalances(input: {
  provider: BankProvider
  linkId: string
}): Promise<BelvoAccountBalance[]> {
  const env = getEnv(input.provider)
  if (env.fallback) return []

  const rows = await fetchBelvoAccounts(env.base, env.clientId, env.clientSecret, input.linkId)
  return rows.map((row) => {
    const a = row as Record<string, unknown>
    const bal = (a.balance ?? {}) as Record<string, unknown>
    const id = typeof a.id === "string" ? a.id : String(a.id ?? "")
    return {
      belvoAccountId: id,
      balanceAvailable: pickNumber(bal.available, a.available_balance),
      balanceCurrent: pickNumber(bal.current, bal.available, a.current_balance),
    }
  })
}

export async function listBelvoInstitutions(input: { countryCode: "CO" | "BR" }) {
  const env = getEnv("bancolombia")
  if (env.fallback) return []
  const raw = await belvoRequestJson<unknown>(
    env.base,
    `/api/institutions/?country_code=${encodeURIComponent(input.countryCode)}&page_size=100`,
    env.clientId,
    env.clientSecret,
    { method: "GET" },
  )
  return normalizeBelvoList(raw).map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: row.id ?? null,
      name: row.name ?? null,
      display_name: row.display_name ?? null,
      type: row.type ?? null,
      country_codes: row.country_codes ?? [],
      form_fields: row.form_fields ?? [],
      status: row.status ?? null,
    }
  })
}

function transactionDirectionFromBelvo(row: Record<string, unknown>): "credit" | "debit" {
  const t = typeof row.type === "string" ? row.type.toUpperCase() : ""
  if (t.includes("INFLOW") || t === "IN" || t === "CREDIT") return "credit"
  if (t.includes("OUTFLOW") || t === "OUT" || t === "DEBIT") return "debit"
  const amount = pickNumber(row.amount, row.value)
  return amount >= 0 ? "credit" : "debit"
}

function transactionAmountAbs(row: Record<string, unknown>): number {
  return Math.abs(pickNumber(row.amount, row.value, row.local_currency_amount))
}

export async function syncBankingColombia(input: {
  provider: BankProvider
  accessToken: string
  belvoAccountId?: string | null
}): Promise<BankingTransactionResult[]> {
  const env = getEnv(input.provider)
  if (env.fallback) {
    return [
      {
        postedAt: new Date().toISOString(),
        description: "Movimiento fallback integración bancaria",
        amount: 120000,
        direction: "debit",
        category: "operativo",
        externalId: null,
      },
    ]
  }

  const linkId = input.accessToken
  const end = new Date()
  const start = new Date()
  start.setUTCDate(end.getUTCDate() - 30)
  const date_from = start.toISOString().slice(0, 10)
  const date_to = end.toISOString().slice(0, 10)

  const body: Record<string, string> = { link: linkId, date_from, date_to }
  if (input.belvoAccountId) body.account = input.belvoAccountId

  const raw = await belvoRequestJson<unknown>(env.base, "/api/transactions/", env.clientId, env.clientSecret, {
    method: "POST",
    json: body,
  })
  const list = normalizeBelvoList(raw)

  return list
    .map((item) => {
      const tx = item as Record<string, unknown>
      const amount = transactionAmountAbs(tx)
      if (!amount) return null
      const direction = transactionDirectionFromBelvo(tx)
      const posted =
        typeof tx.value_date === "string"
          ? tx.value_date
          : typeof tx.posted_at === "string"
            ? tx.posted_at
            : typeof tx.created_at === "string"
              ? tx.created_at
              : new Date().toISOString()
      const merchantName =
        tx.merchant && typeof tx.merchant === "object" && tx.merchant !== null && "name" in tx.merchant
          ? String((tx.merchant as { name?: unknown }).name ?? "").trim()
          : ""
      const desc =
        typeof tx.description === "string" && tx.description.trim()
          ? tx.description.trim()
          : merchantName || "Movimiento bancario"
      const cat =
        typeof tx.category === "string" && tx.category.trim()
          ? tx.category.trim()
          : typeof tx.subcategory === "string" && tx.subcategory.trim()
            ? tx.subcategory.trim()
            : "sin_categoria"
      const extId = typeof tx.id === "string" ? tx.id : tx.id != null ? String(tx.id) : null
      return {
        postedAt: posted.length >= 10 ? `${posted.slice(0, 10)}T12:00:00.000Z` : new Date().toISOString(),
        description: desc,
        amount,
        direction,
        category: cat,
        externalId: extId,
      } satisfies BankingTransactionResult
    })
    .filter((x): x is BankingTransactionResult => Boolean(x))
}
