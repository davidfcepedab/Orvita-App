import { test, expect } from "@playwright/test"

/**
 * Smoke `/salud` (brief decisión diaria) en NEXT_PUBLIC_APP_MODE=mock
 * (ver playwright.config.ts → webServer.env).
 */
test.describe("Salud — decisión diaria (smoke)", () => {
  test("hero, insight, Apple (expandible), operativo visibles en main", async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto("/salud", { waitUntil: "domcontentloaded" })

    await expect(page.getByText("Decisión del día")).toBeVisible({ timeout: 60_000 })
    await expect(page.getByRole("main", { name: "Salud — decisión, Apple Health y operativo" })).toBeVisible({
      timeout: 30_000,
    })

    const main = page.getByRole("main", { name: "Salud — decisión, Apple Health y operativo" })
    await expect(main.getByRole("heading", { name: "Insight" })).toBeVisible()
    await expect(main.getByRole("region", { name: "Apple Health" })).toBeVisible()
    await main.getByRole("button", { name: /Abrir panel de token y sincronización/i }).click()
    await expect(main.getByRole("heading", { name: /Datos automáticos/i })).toBeVisible()
    await expect(main.getByText("Estado del día", { exact: true })).toBeVisible()
    await expect(main.getByText("Estratégico")).toBeVisible()
    await expect(main.getByText("Bio-stack y combustible")).toBeVisible()
    await expect(main.getByText("Predictivo e interpretación")).toBeVisible()
    await expect(main.getByRole("link", { name: /Ir a entrenamiento/i })).toBeVisible()
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
