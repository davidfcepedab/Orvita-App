/**
 * Genera iconos PWA 192 / 512 y variante maskable desde el logo en fondo claro
 * (p. ej. «Agregar a inicio» en iOS muestra este recurso como apple-touch).
 * Uso: node scripts/generate-pwa-icons.mjs
 * Requiere: sharp (dependencia del proyecto).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const src = path.join(root, "public", "brand", "orvita-logo-on-light-bg.png")
const outDir = path.join(root, "public", "pwa")
const pushOut = path.join(root, "public", "brand", "orvita-push-icon-192.png")
/** Fondo para letterboxing al hacer fit contain (#FAFAFA, coherente con marca clara). */
const BG = { r: 250, g: 250, b: 250, alpha: 1 }

if (!fs.existsSync(src)) {
  console.error("No se encontró la fuente:", src)
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

/** Logo contenido en caja NxN (fondo claro). */
async function iconContained(size, fileName) {
  await sharp(src)
    .resize(size, size, { fit: "contain", position: "center", background: BG })
    .png()
    .toFile(path.join(outDir, fileName))
  console.log("OK", fileName)
}

/** Maskable: logo ~72% para zona segura en launchers con recorte circular. */
async function iconMaskable(size, fileName) {
  const inner = Math.round(size * 0.72)
  const innerBuf = await sharp(src)
    .resize(inner, inner, { fit: "contain", position: "center", background: BG })
    .png()
    .toBuffer()

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: innerBuf, gravity: "center" }])
    .png()
    .toFile(path.join(outDir, fileName))
  console.log("OK", fileName)
}

await iconContained(192, "icon-192.png")
await iconContained(512, "icon-512.png")
await iconMaskable(512, "icon-maskable-512.png")

await sharp(src)
  .resize(192, 192, { fit: "contain", position: "center", background: BG })
  .png()
  .toFile(pushOut)
console.log("OK", path.basename(pushOut), "(push)")
