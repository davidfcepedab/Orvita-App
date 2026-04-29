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

/** Diccionario y cabeceras POST: variables nombradas como WFTextTokenAttachment (Type Variable + VariableName). */
function assertDictionaryVariableTokens(xml: string) {
  const nTokenVar = (xml.match(/<key>VariableName<\/key>/g) ?? []).length
  const nSetVar = (xml.match(/<key>WFVariableName<\/key>/g) ?? []).length
  expect(nTokenVar + nSetVar).toBeGreaterThanOrEqual(28)
  expect(nTokenVar).toBeGreaterThanOrEqual(14)
  expect((xml.match(/<string>WFTextTokenAttachment<\/string>/g) ?? []).length).toBeGreaterThanOrEqual(30)
  expect(xml).toContain("<string>workouts_count_num</string>")
  expect(xml).toContain("<string>workouts_duration_seconds_num</string>")
  expect(xml).toContain("<string>apple_bundle</string>")
  expect(xml).toContain("<string>is.workflow.actions.dictionary</string>")
  expect(xml).toContain("<string>Type</string>")
  expect(xml).toContain("<string>Variable</string>")
}

describe("orvita-importar-salud-hoy shortcut plist (contrato)", () => {
  test("plist «hoy» + «historial-15d» comparten contrato (POST, filtros, nombres)", () => {
    execSync(`python3 "${BUILDER}"`, { cwd: ROOT, stdio: "pipe" })
    execSync(`python3 "${BUILDER}" --variant historial-15d`, { cwd: ROOT, stdio: "pipe" })
    const hoy = fs.readFileSync(PLIST_SRC, "utf8")
    const hist = fs.readFileSync(PLIST_HIST, "utf8")

    assertCommonHealthShortcutXml(hoy, "Orvita-Importar-Salud-Hoy")
    assertCommonHealthShortcutXml(hist, "Orvita-Salud-Historial-15Dias")
    expect(hist).toContain("Historial-15Dias")
    assertDictionaryVariableTokens(hoy)
    assertDictionaryVariableTokens(hist)

    for (const xml of [hoy, hist]) {
      expect(xml).toContain("<string>Sleep Analysis</string>")
      expect(xml).toContain("<string>Awake</string>")
      expect(xml).toContain("<string>In Bed</string>")
      expect(xml).toContain("<string>Value</string>")
      const nOp5 = (xml.match(/<key>Operator<\/key>\s*<integer>5<\/integer>/g) ?? []).length
      expect(nOp5).toBeGreaterThanOrEqual(4)
    }
  })
})
