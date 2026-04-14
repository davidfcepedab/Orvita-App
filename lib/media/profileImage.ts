export const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"])

export function validateProfileImage(file: File): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED.has(file.type)) {
    return { ok: false, error: "Formato no admitido. Usa JPG, PNG o WebP." }
  }
  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return { ok: false, error: "La imagen supera 2 MB." }
  }
  return { ok: true }
}

export function extensionForProfileImageMime(type: string): string {
  if (type === "image/jpeg") return "jpg"
  if (type === "image/png") return "png"
  if (type === "image/webp") return "webp"
  return "bin"
}
