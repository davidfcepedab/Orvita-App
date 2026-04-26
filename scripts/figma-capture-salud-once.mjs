/**
 * Carga /figma-salud-redesign.html, inyecta html-to-design y envía a Figma (mismo flujo que el snippet oficial).
 * Uso: npm run dev (puerto 3000) y:
 *   node scripts/figma-capture-salud-once.mjs <captureId>
 */
import { chromium } from "playwright"

const captureId = process.argv[2]
if (!captureId) {
  console.error("Uso: node scripts/figma-capture-salud-once.mjs <captureId>")
  process.exit(1)
}

const endpoint = `https://mcp.figma.com/mcp/capture/${captureId}/submit`
const target = "http://localhost:3000/figma-salud-redesign.html"

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.setDefaultTimeout(60_000)

try {
  await page.goto(target, { waitUntil: "domcontentloaded", timeout: 20_000 })
  const r = await page.context().request.get("https://mcp.figma.com/mcp/html-to-design/capture.js")
  const scriptText = await r.text()
  await page.evaluate((s) => {
    const el = document.createElement("script")
    el.textContent = s
    document.head.appendChild(el)
  }, scriptText)
  await page.waitForTimeout(1500)
  const out = await page.evaluate(
    async ({ cap, ep }) => {
      if (typeof window.figma?.captureForDesign !== "function") {
        return { err: "no figma.captureForDesign" }
      }
      return await window.figma.captureForDesign({
        captureId: cap,
        endpoint: ep,
        selector: "body",
      })
    },
    { cap: captureId, ep: endpoint },
  )
  console.log(JSON.stringify(out, null, 2))
} catch (e) {
  console.error(String(e))
  process.exit(1)
} finally {
  await browser.close()
}
