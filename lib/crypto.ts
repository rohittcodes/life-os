// Client-side E2E encryption using Web Crypto API (AES-256-GCM + PBKDF2)
// All functions run in the browser — the server never sees plaintext or keys.

const ENC_PREFIX = "v1:enc:"
const PBKDF2_ITERATIONS = 200_000

export function isEncrypted(value: string): boolean {
  return typeof value === "string" && value.startsWith(ENC_PREFIX)
}

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}

export async function deriveKey(passphrase: string, saltB64: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const saltBytes = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))

  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  )

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

export async function encryptText(key: CryptoKey, plaintext: string): Promise<string> {
  const enc = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  )
  // Pack IV + ciphertext into single base64 string
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return ENC_PREFIX + btoa(String.fromCharCode(...combined))
}

export async function decryptText(key: CryptoKey, encrypted: string): Promise<string> {
  if (!isEncrypted(encrypted)) return encrypted // passthrough unencrypted data
  const combined = Uint8Array.from(atob(encrypted.slice(ENC_PREFIX.length)), (c) => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}

// Produce a small verification string to confirm passphrase is correct on subsequent unlocks
export async function makeVerifier(key: CryptoKey): Promise<string> {
  return encryptText(key, "life-os-vault-v1")
}

export async function verifyKey(key: CryptoKey, verifier: string): Promise<boolean> {
  try {
    const result = await decryptText(key, verifier)
    return result === "life-os-vault-v1"
  } catch {
    return false
  }
}
