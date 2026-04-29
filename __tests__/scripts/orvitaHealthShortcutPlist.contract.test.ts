import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"

const ROOT = path.join(__dirname, "..", "..")
const PLIST_SRC = path.join(ROOT, "scripts", "shortcuts", "orvita-importar-salud-hoy.shortcut.src.plist")
const PLIST_HIST = path.join(ROOT, "scripts", "shortcuts", "orvita-salud-historial-15dias.src.plist")
const BUILDER = path.join(ROOT, "scripts", "build-orvita-health-shortcut.py")

function assertCommonHealthShortcutXml(xml: string, workflowName: string) {
  expect(xml).toContain("<string>Custom</string>")
  expect(xml).toContain("<string>yyyy-MM-dd</string>")
  expect(xml).toContain("<string>Shortcuts/orvita_import_token.txt</string>")
  expect(xml).toContain("<string>x-orvita-health-source</string>")
  expect(xml).toContain("<string>apple_health_shortcut</string>")
  expect(xml).toContain("<string>x-orvita-observed-at</string>")
  expect(xml).toContain("<string>https://orvita.app/api/integrations/health/apple/import</string>")
  expect(xml).toContain(`<string>${workflowName}</string>`)

  expect(xml).not.toContain("<integer>1001</integer>")

  const n1002 = (xml.match(/<integer>1002<\/integer>/g) ?? []).length
  expect(n1002).toBeGreaterThanOrEqual(12)
}

describe("orvita-importar-salud-hoy shortcut plist (contrato)", () => {
  test("plist «hoy» + «historial-15d» comparten contrato (POST, filtros, nombres)", () => {
    execSync(`python3 "${BUILDER}"`, { cwd: ROOT, stdio: "pipe" })
    execSync(`python3 "${BUILDER}" --variant historial-15d`, { cwd: ROOT, stdio: "pipe" })
    const hoy = fs.readFileSync(PLIST_SRC, "utf8")
    const hist = fs.readFileSync(PLIST_HIST, "utf8")

    assertCommonHealthShortcutXml(hoy, "Orvita-Importar-Salud-Hoy")
    assertCommonHealthShortcutXml(hist, "Orvita-Salud-Historial-15Dias")
    expect(hist).toContain("Histórico 15 días")
  })
})
