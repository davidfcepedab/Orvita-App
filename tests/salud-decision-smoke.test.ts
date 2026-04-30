import { test, expect } from "@playwright/test"

/**
 * Smoke `/salud` (brief decisión diaria) en NEXT_PUBLIC_APP_MODE=mock
 * (ver playwright.config.ts → webServer.env).
 */
test.describe("Salud — decisión diaria (smoke)", () => {
  test("hero, Apple, insight y operativo visibles (landmark salud)", async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto("/salud", { waitUntil: "domcontentloaded" })

    const saludLandmark = page.getByRole("region", { name: /Salud: decisión, Apple Health e interpretación/i })
    await expect(saludLandmark).toBeVisible({ timeout: 90_000 })
    await expect(page.getByText("Decisión del día")).toBeVisible()

    await expect(saludLandmark.getByRole("region", { name: "Apple Health" })).toBeVisible()
    await expect(saludLandmark.getByRole("heading", { name: /Datos automáticos/i })).toBeVisible()
    await expect(saludLandmark.getByText("Estado del día", { exact: true })).toBeVisible()
    await expect(saludLandmark.getByRole("heading", { name: "Insight" })).toBeVisible()
    await expect(saludLandmark.getByText("Estratégico")).toBeVisible()
    await expect(saludLandmark.getByText("Bio-stack y combustible")).toBeVisible()
    await expect(saludLandmark.getByText("Predictivo e interpretación")).toBeVisible()
    await expect(saludLandmark.getByRole("link", { name: /Entrenamiento/i })).toBeVisible()
  })

  test("entrada directa ?action=rest|adjust en /training limpia la URL", async ({ page }) => {
    await page.goto("/training?action=rest")
    await expect(page).toHaveURL(/\/training\/?$/)
    expect(new URL(page.url()).search).toBe("")

    await page.goto("/training?action=adjust")
    await expect(page).toHaveURL(/\/training\/?$/)
    expect(new URL(page.url()).search).toBe("")
  })
})
