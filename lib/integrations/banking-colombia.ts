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
}

function getEnv(provider: BankProvider) {
  const base = process.env.BANKING_COLOMBIA_BASE_URL?.trim()
  const clientId = process.env.BANKING_COLOMBIA_CLIENT_ID?.trim()
  const clientSecret = process.env.BANKING_COLOMBIA_CLIENT_SECRET?.trim()
  const redirectUri = process.env.BANKING_COLOMBIA_REDIRECT_URI?.trim()
  const fallback = process.env.ORVITA_INTEGRATIONS_ALLOW_MOCK === "1"
  if (!base || !clientId || !clientSecret || !redirectUri) {
    if (fallback) return { fallback: true as const, provider }
    throw new Error(
      `Integración bancaria real no configurada (${provider}). Define BANKING_COLOMBIA_BASE_URL, CLIENT_ID, CLIENT_SECRET y REDIRECT_URI.`,
    )
  }
  return { fallback: false as const, base, clientId, clientSecret, redirectUri, provider }
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

export async function connectBankingColombia(input: {
  provider: BankProvider
  authCode?: string
  state?: string
}): Promise<BankingConnectionResult> {
  const env = getEnv(input.provider)
  if (env.fallback) {
    const suffix = `${Math.floor(1000 + Math.random() * 9000)}`
    return {
      provider: input.provider,
      providerAccountId: `${input.provider}-fallback-${suffix}`,
      accessToken: "fallback-mock-token",
      refreshToken: "fallback-mock-refresh",
      accountName: input.provider === "bancolombia" ? "Ahorros Bancolombia" : input.provider === "davivienda" ? "Cuenta Davivienda" : "Nequi principal",
      accountMask: `****${suffix}`,
      balanceAvailable: Math.round(2_000_000 + Math.random() * 5_000_000),
      balanceCurrent: Math.round(2_200_000 + Math.random() * 5_000_000),
      metadata: { fallback: true, provider: input.provider },
    }
  }

  const tokenRes = await fetch(`${env.base}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      code: input.authCode,
      redirect_uri: env.redirectUri,
      provider: input.provider,
      grant_type: "authorization_code",
      state: input.state,
    }),
  })
  if (!tokenRes.ok) {
    const detail = await tokenRes.text()
    throw new Error(`OAuth bancario falló (${input.provider}): ${detail.slice(0, 300)}`)
  }
  const tokenPayload = (await tokenRes.json()) as {
    access_token?: string
    refresh_token?: string
    account_id?: string
  }
  if (!tokenPayload.access_token) throw new Error(`No se recibió access_token de ${input.provider}`)

  const accountRes = await fetch(`${env.base}/accounts/primary`, {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
  })
  if (!accountRes.ok) {
    const detail = await accountRes.text()
    throw new Error(`No se pudo leer cuenta principal (${input.provider}): ${detail.slice(0, 300)}`)
  }
  const accountPayload = (await accountRes.json()) as {
    id?: string
    name?: string
    mask?: string
    balances?: { available?: number | string; current?: number | string }
  }

  return {
    provider: input.provider,
    providerAccountId: accountPayload.id ?? tokenPayload.account_id ?? `${input.provider}-primary`,
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token ?? null,
    accountName: accountPayload.name ?? `Cuenta ${input.provider}`,
    accountMask: accountPayload.mask ?? "****0000",
    balanceAvailable: toNumber(accountPayload.balances?.available, 0),
    balanceCurrent: toNumber(accountPayload.balances?.current, 0),
    metadata: { provider: input.provider, connector: "banking-colombia-real-adapter" },
  }
}

export async function syncBankingColombia(input: {
  provider: BankProvider
  accessToken: string
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
      },
    ]
  }

  const res = await fetch(`${env.base}/transactions?provider=${input.provider}&range=30d`, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Sync bancario falló (${input.provider}): ${detail.slice(0, 350)}`)
  }
  const payload = (await res.json()) as {
    transactions?: Array<{
      posted_at?: string
      description?: string
      amount?: number | string
      direction?: "credit" | "debit" | string
      category?: string
    }>
  }
  return (payload.transactions ?? [])
    .map((tx) => {
      const amount = Math.abs(toNumber(tx.amount, 0))
      if (!amount) return null
      const direction = tx.direction === "credit" ? "credit" : "debit"
      return {
        postedAt: tx.posted_at ?? new Date().toISOString(),
        description: tx.description?.trim() || "Movimiento bancario",
        amount,
        direction,
        category: tx.category?.trim() || "sin_categoria",
      } satisfies BankingTransactionResult
    })
    .filter((tx): tx is BankingTransactionResult => Boolean(tx))
}
