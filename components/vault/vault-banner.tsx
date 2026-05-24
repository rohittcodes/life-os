"use client"

import { useState } from "react"
import { useVault } from "@/contexts/vault-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock, Unlock } from "lucide-react"

interface Props {
  saltB64: string
  verifier: string
}

export function VaultBanner({ saltB64, verifier }: Props) {
  const { isEnabled, isUnlocked, unlock, lock } = useVault()
  const [passphrase, setPassphrase] = useState("")
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!isEnabled) return null

  if (isUnlocked) {
    return (
      <div className="flex items-center justify-between border-b border-border bg-green-500/5 px-4 py-2 text-xs text-green-600 dark:text-green-400">
        <span className="flex items-center gap-1.5"><Unlock className="h-3 w-3" />Vault unlocked — data is encrypted E2E</span>
        <button onClick={lock} className="hover:text-foreground transition-colors">Lock</button>
      </div>
    )
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    const ok = await unlock(passphrase, saltB64, verifier)
    setLoading(false)
    if (!ok) setError(true)
    else setPassphrase("")
  }

  return (
    <div className="border-b border-border bg-amber-500/5 px-4 py-2">
      <form onSubmit={handleUnlock} className="flex items-center gap-2">
        <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
        <span className="text-xs text-amber-600 dark:text-amber-400 mr-1">Vault locked</span>
        <Input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Enter vault passphrase to decrypt your notes…"
          className={`h-7 flex-1 text-xs ${error ? "border-red-500" : ""}`}
        />
        <Button type="submit" size="sm" className="h-7 text-xs" disabled={loading}>
          {loading ? "…" : "Unlock"}
        </Button>
      </form>
      {error && <p className="mt-1 pl-6 text-xs text-red-500">Incorrect passphrase</p>}
    </div>
  )
}
