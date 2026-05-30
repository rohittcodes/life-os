"use client"

import { useState, useTransition } from "react"
import { createApiKey, revokeApiKey } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmButton } from "@/components/ui/confirm-button"
import type { ApiKey } from "@/lib/types"

interface Props { keys: ApiKey[] }

export function ApiKeysPanel({ keys }: Props) {
  const [name, setName] = useState("")
  const [newKey, setNewKey] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set("name", name)
    startTransition(async () => {
      const result = await createApiKey(fd)
      if (result) {
        setNewKey(result.key)
        setName("")
      }
    })
  }

  function handleRevoke(id: string) {
    startTransition(() => revokeApiKey(id))
  }

  const active = keys.filter((k) => !k.revoked)
  const revoked = keys.filter((k) => k.revoked)

  return (
    <div className="space-y-6">
      {newKey && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 space-y-2">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Key created — copy it now. You won&apos;t see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-xs font-mono break-all">
              {newKey}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { navigator.clipboard.writeText(newKey); }}
            >
              Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use as: <code className="font-mono">Authorization: Bearer {newKey}</code>
          </p>
          <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>Dismiss</Button>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex gap-3">
        <div className="flex-1 space-y-1">
          <Label htmlFor="key-name">Key name</Label>
          <Input
            id="key-name"
            placeholder="My portfolio site, n8n workflow..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="flex items-end">
          <Button type="submit">Generate key</Button>
        </div>
      </form>

      {active.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Active keys</h3>
          {active.map((key) => (
            <div key={key.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <div>
                <p className="text-sm font-medium">{key.name}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {key.key_prefix}••••••••••••
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Created {new Date(key.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  {key.last_used_at && ` · Last used ${new Date(key.last_used_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                </p>
              </div>
              <ConfirmButton
                title="Revoke API key?"
                description="Any apps using this key will stop working immediately."
                confirmLabel="Revoke"
                onConfirm={() => handleRevoke(key.id)}
              >
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                  Revoke
                </Button>
              </ConfirmButton>
            </div>
          ))}
        </div>
      )}

      {active.length === 0 && !newKey && (
        <p className="text-sm text-muted-foreground">No active keys. Generate one to access the API.</p>
      )}

      {revoked.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Revoked</h3>
          {revoked.map((key) => (
            <div key={key.id} className="flex items-center gap-4 rounded-lg border border-border/50 bg-card/50 px-4 py-3 opacity-50">
              <div>
                <p className="text-sm line-through">{key.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{key.key_prefix}••••••••••••</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
