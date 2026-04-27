export type ShoppingPrepRow = { title: string; detail: string; minutes: number }

export function buildShoppingListPlainText(args: {
  targets: { kcal: number; p: number; c: number; f: number }
  prep: ShoppingPrepRow[]
}): string {
  const { targets, prep } = args
  const header = `Lista compra · Órvita\nObjetivo ~${targets.kcal || "—"} kcal/día · P${targets.p || "—"} C${targets.c || "—"} F${targets.f || "—"}\n`
  const body = prep.map((r) => `• ${r.title} (${r.minutes} min)\n  ${r.detail}`).join("\n\n")
  return `${header}\n${body}`
}

export function buildShoppingListPrintHtml(title: string, plainBody: string): string {
  const escaped = plainBody
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>")
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;padding:1.5rem;max-width:40rem;color:#0f172a;line-height:1.5;}h1{font-size:1.1rem;margin:0 0 1rem;}</style></head>
<body><h1>${title}</h1><div>${escaped}</div><script>window.onload=function(){window.print();}</script></body></html>`
}

/** Abre ventana mínima y dispara impresión (el usuario puede guardar como PDF). */
export function openShoppingListPrintWindow(plainText: string): void {
  if (typeof window === "undefined") return
  const w = window.open("", "_blank", "noopener,noreferrer")
  if (!w) return
  const html = buildShoppingListPrintHtml("Lista compra · Órvita", plainText)
  w.document.open()
  w.document.write(html)
  w.document.close()
}

export async function sharePlainText(text: string, title?: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false
  try {
    await navigator.share({ title: title ?? "Lista compra", text })
    return true
  } catch {
    return false
  }
}
