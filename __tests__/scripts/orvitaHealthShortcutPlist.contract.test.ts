import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"

const ROOT = path.join(__dirname, "..", "..")
const PLIST_SRC = path.join(ROOT, "scripts", "shortcuts", "orvita-importar-salud-hoy.shortcut.src.plist")
const BUILDER = path.join(ROOT, "scripts", "build-orvita-health-shortcut.py")

describe("orvita-importar-salud-hoy shortcut plist (contrato)", () => {
  test("el plist generado coincide con el contrato (fecha, token, POST, sin ventana 1001)", () => {
    execSync(`python3 "${BUILDER}"`, { cwd: ROOT, stdio: "pipe" })
    const xml = fs.readFileSync(PLIST_SRC, "utf8")

    expect(xml).toContain("<string>Custom</string>")
    expect(xml).toContain("<string>yyyy-MM-dd</string>")
    expect(xml).toContain("<string>Shortcuts/orvita_import_token.txt</string>")
    expect(xml).toContain("<string>x-orvita-health-source</string>")
    expect(xml).toContain("<string>apple_health_shortcut</string>")
    expect(xml).toContain("<string>x-orvita-observed-at</string>")
    expect(xml).toContain("<string>https://orvita.app/api/integrations/health/apple/import</string>")
    expect(xml).toContain("<string>Orvita-Importar-Salud-Hoy</string>")

    // Operador 1001 = ventana relativa (p. ej. «últimos N días»); el atajo diario no debe usarla.
    expect(xml).not.toContain("<integer>1001</integer>")

    // Cada filtro de cantidad «hoy» usa 1002 en Start Date (incl. sueño alineado con pasos/HRV).
    const n1002 = (xml.match(/<integer>1002<\/integer>/g) ?? []).length
    expect(n1002).toBeGreaterThanOrEqual(12)
  })
})
