import { buildOrvitaShortcutImportHref } from "@/lib/shortcuts/orvitaHealthShortcut"

describe("orvitaHealthShortcut", () => {
  const prev = process.env.NEXT_PUBLIC_SITE_URL

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = prev
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
})
