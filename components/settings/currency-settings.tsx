"use client"

import { useTransition, useState } from "react"
import { saveCurrencySettings } from "@/app/(app)/settings/actions"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CURRENCIES } from "@/lib/currency"
import { Check, Loader2 } from "lucide-react"

interface Props { currency: string }

export function CurrencySettings({ currency }: Props) {
  const [value, setValue] = useState(currency || "INR")
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set("currency", value)
    startTransition(async () => {
      await saveCurrencySettings(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="font-medium">Currency</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Used for formatting amounts across Finance, Budget, and Dashboard.</p>
      </div>

      <div className="space-y-1.5 max-w-xs">
        <Label htmlFor="currency">Display currency</Label>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger id="currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.code} — {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</> : saved ? <><Check className="h-4 w-4 mr-1.5" />Saved</> : "Save currency"}
      </Button>
    </form>
  )
}
