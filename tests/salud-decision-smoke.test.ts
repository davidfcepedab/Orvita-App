import { test, expect } from "@playwright/test"

/**
 * Smoke `/salud` (brief decisión diaria) en NEXT_PUBLIC_APP_MODE=mock
 * (ver playwright.config.ts → webServer.env).
 */
test.describe("Salud — decisión diaria (smoke)", () => {
  test("hero, cuatro bloques, Apple y operativo visibles en main", async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto("/salud", { waitUntil: "domcontentloaded" })

    await expect(page.getByRole("main", { name: "Salud — decisión, Apple Health y operativo" })).toBeVisible({
      timeout: 60_000,
    })
    await expect(page.getByText("Decisión del día")).toBeVisible()

    await expect(page.getByRole("heading", { name: /Operativo: combustible/i })).toBeVisible()

    const main = page.getByRole("main", { name: "Salud — decisión, Apple Health y operativo" })
    // Bloques siguientes al hero (orden estable en SaludDashboardV3).
    await expect(main.getByText("Señales Apple · última lectura")).toBeVisible()
    await expect(main.getByText("Interpretación", { exact: true })).toBeVisible()
    await expect(main.getByText("Puente · Hevy")).toBeVisible()
    // Panel Apple Health siempre visible en main (no solo en <details>).
    await expect(main.getByRole("heading", { name: /Datos automáticos/i })).toBeVisible()
    await expect(main.getByText("Estado del día", { exact: true })).toBeVisible()
    await expect(main.getByText("Estratégico")).toBeVisible()
    await expect(main.getByText("Bio-stack y combustible")).toBeVisible()
    await expect(main.getByText("Predictivo e interpretación")).toBeVisible()
  })

  test("Descansar → /training sin query (?action consumido)", async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto("/salud", { waitUntil: "domcontentloaded" })
    await expect(page.getByText("Decisión del día")).toBeVisible()
    const main = page.getByRole("main", { name: "Salud — decisión, Apple Health y operativo" })
    const rest = main.locator('a[href="/training?action=rest"]')
    await expect(rest).toBeVisible()
    await rest.scrollIntoViewIfNeeded()
    const navigated = page.waitForURL(/\/training/, { timeout: 90_000 })
    await rest.click()
    await navigated
    await expect.poll(() => new URL(page.url()).search).toBe("")
  })

  test("Ajustar sesión → /training sin query", async ({ page }) => {
    await page.goto("/salud", { waitUntil: "domcontentloaded" })
    await expect(page.getByText("Decisión del día")).toBeVisible()
    const main = page.getByRole("main", { name: "Salud — decisión, Apple Health y operativo" })
    const adjust = main.locator('a[href="/training?action=adjust"]')
    await expect(adjust).toBeVisible()
    await adjust.scrollIntoViewIfNeeded()
    const navigated = page.waitForURL(/\/training/, { timeout: 90_000 })
    await adjust.click()
    await navigated
    await expect.poll(() => new URL(page.url()).search).toBe("")
  })

  test("Ajustar día → /hoy", async ({ page }) => {
    await page.goto("/salud")
    const hoy = page.getByRole("link", { name: "Ajustar día" })
    await expect(hoy).toHaveAttribute("href", "/hoy")
    await hoy.click()
    await expect(page).toHaveURL(/\/hoy/)
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
