"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import {
  deriveKey, encryptText, decryptText, generateSalt, makeVerifier, verifyKey, isEncrypted,
} from "@/lib/crypto"

interface VaultState {
  isEnabled: boolean        // user has set up a passphrase
  isUnlocked: boolean       // passphrase entered this session
  unlock: (passphrase: string, saltB64: string, verifier: string) => Promise<boolean>
  lock: () => void
  setup: (passphrase: string) => Promise<{ saltB64: string; verifier: string }>
  encrypt: (text: string) => Promise<string>
  decrypt: (text: string) => Promise<string>
  isEncryptedValue: (v: string) => boolean
}

const VaultCtx = createContext<VaultState | null>(null)

export function VaultProvider({
  children,
  encryptionEnabled,
}: {
  children: ReactNode
  encryptionEnabled: boolean
}) {
  const [key, setKey] = useState<CryptoKey | null>(null)

  const unlock = useCallback(async (passphrase: string, saltB64: string, verifier: string): Promise<boolean> => {
    try {
      const derived = await deriveKey(passphrase, saltB64)
      const valid = await verifyKey(derived, verifier)
      if (valid) setKey(derived)
      return valid
    } catch {
      return false
    }
  }, [])

  const lock = useCallback(() => setKey(null), [])

  const setup = useCallback(async (passphrase: string) => {
    const saltB64 = generateSalt()
    const derived = await deriveKey(passphrase, saltB64)
    const verifier = await makeVerifier(derived)
    setKey(derived)
    return { saltB64, verifier }
  }, [])

  const encrypt = useCallback(async (text: string): Promise<string> => {
    if (!key) return text
    return encryptText(key, text)
  }, [key])

  const decrypt = useCallback(async (text: string): Promise<string> => {
    if (!key && isEncrypted(text)) return "[🔒 Vault locked]"
    if (!key) return text
    try {
      return await decryptText(key, text)
    } catch {
      return "[⚠ Decryption failed]"
    }
  }, [key])

  return (
    <VaultCtx.Provider value={{
      isEnabled: encryptionEnabled,
      isUnlocked: !!key,
      unlock,
      lock,
      setup,
      encrypt,
      decrypt,
      isEncryptedValue: isEncrypted,
    }}>
      {children}
    </VaultCtx.Provider>
  )
}

export function useVault(): VaultState {
  const ctx = useContext(VaultCtx)
  if (!ctx) throw new Error("useVault must be used inside VaultProvider")
  return ctx
}
