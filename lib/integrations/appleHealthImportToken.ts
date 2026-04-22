import crypto from "node:crypto"

export function generatePlainImportToken() {
  return crypto.randomBytes(24).toString("base64url")
}

export function hashImportToken(plain: string) {
  return crypto.createHash("sha256").update(plain, "utf8").digest("hex")
}
