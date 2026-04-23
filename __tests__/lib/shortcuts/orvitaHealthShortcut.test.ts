import {
  buildOrvitaShortcutImportHref,
  buildOrvitaShortcutImportHrefXCallback,
  getOrvitaHealthShortcutIcloudUrl,
} from "@/lib/shortcuts/orvitaHealthShortcut"

describe("orvitaHealthShortcut", () => {
  const prev = process.env.NEXT_PUBLIC_SITE_URL
  const prevIcloud = process.env.NEXT_PUBLIC_ORVITA_HEALTH_SHORTCUT_ICLOUD_URL

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = prev
    }
    if (prevIcloud === undefined) {
      delete process.env.NEXT_PUBLIC_ORVITA_HEALTH_SHORTCUT_ICLOUD_URL
    } else {
      process.env.NEXT_PUBLIC_ORVITA_HEALTH_SHORTCUT_ICLOUD_URL = prevIcloud
    }
  })

  test("import href uses documented shape without &name= or import-shortcut/ path", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://orvita.app"
    const href = buildOrvitaShortcutImportHref()
    expect(href).toMatch(/^shortcuts:\/\/import-shortcut\?url=/)
    expect(href).not.toContain("&name=")
    expect(href).not.toContain("import-shortcut/?")
    const after = href.split("?url=")[1]
    expect(after).toBeDefined()
    expect(decodeURIComponent(after!)).toBe("https://orvita.app/shortcuts/Orvita-Importar-Salud-Hoy.shortcut")
  })

  test("x-callback import encodes the same file URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://orvita.app"
    const h = buildOrvitaShortcutImportHrefXCallback()
    expect(h.startsWith("shortcuts://x-callback-url/import-shortcut?url=")).toBe(true)
  })

  test("iCloud URL is null when unset; https only when set", () => {
    delete process.env.NEXT_PUBLIC_ORVITA_HEALTH_SHORTCUT_ICLOUD_URL
    expect(getOrvitaHealthShortcutIcloudUrl()).toBeNull()
    process.env.NEXT_PUBLIC_ORVITA_HEALTH_SHORTCUT_ICLOUD_URL = "  https://www.icloud.com/shortcuts/abc  "
    expect(getOrvitaHealthShortcutIcloudUrl()).toBe("https://www.icloud.com/shortcuts/abc")
    process.env.NEXT_PUBLIC_ORVITA_HEALTH_SHORTCUT_ICLOUD_URL = "http://insecure"
    expect(getOrvitaHealthShortcutIcloudUrl()).toBeNull()
  })
})
