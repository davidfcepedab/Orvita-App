import { canonicalHostname, siteOrigin } from "@/lib/site/origin"

describe("canonicalHostname", () => {
  const prev = { site: process.env.NEXT_PUBLIC_SITE_URL }

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = prev.site
  })

  test("defaults to orvita.app when unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    expect(canonicalHostname()).toBe("orvita.app")
  })

  test("parses hostname from NEXT_PUBLIC_SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://app.example.com/path"
    expect(canonicalHostname()).toBe("app.example.com")
  })
})

describe("siteOrigin", () => {
  const prev = { site: process.env.NEXT_PUBLIC_SITE_URL, vercel: process.env.VERCEL_URL }

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = prev.site
    process.env.VERCEL_URL = prev.vercel
  })

  test("explicit URL wins", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://orvita.app/"
    delete process.env.VERCEL_URL
    expect(siteOrigin()).toBe("https://orvita.app")
  })
})
