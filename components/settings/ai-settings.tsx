"use client"

import { useState, useTransition } from "react"
import { saveAiSettings } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, EyeOff, CheckCircle2, ExternalLink } from "lucide-react"

const PROVIDERS = [
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    model: "claude-haiku-4-5",
    placeholder: "sk-ant-api03-...",
    link: "https://console.anthropic.com/keys",
    linkLabel: "Anthropic Console",
    field: "anthropic_key",
  },
  {
    id: "openai",
    label: "OpenAI (GPT)",
    model: "gpt-4o-mini",
    placeholder: "sk-proj-...",
    link: "https://platform.openai.com/api-keys",
    linkLabel: "OpenAI Platform",
    field: "openai_key",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    model: "gemini-2.0-flash",
    placeholder: "AIza...",
    link: "https://aistudio.google.com/apikey",
    linkLabel: "Google AI Studio",
    field: "gemini_key",
  },
  {
    id: "groq",
    label: "Groq (Llama)",
    model: "llama-3.3-70b-versatile",
    placeholder: "gsk_...",
    link: "https://console.groq.com/keys",
    linkLabel: "Groq Console",
    field: "groq_key",
  },
] as const

interface Props {
  provider: string
  savedKeys: Record<string, boolean>
}

export function AiSettings({ provider, savedKeys }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedProvider, setSelectedProvider] = useState(provider)
  const [keyValues, setKeyValues] = useState<Record<string, string>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState(false)

  function handleSave() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set("provider", selectedProvider)
      Object.entries(keyValues).forEach(([k, v]) => { if (v.trim()) fd.set(k, v.trim()) })
      await saveAiSettings(fd)
      setKeyValues({})
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  const hasChanged = selectedProvider !== provider || Object.values(keyValues).some(v => v.trim())

  return (
    <div className="space-y-5">
      {/* Default provider selector */}
      <div className="space-y-2">
        <Label>Default provider</Label>
        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Pre-selected when you open a new chat. You can switch provider and model any time inside the chat panel.
        </p>
      </div>

      {/* Key cards for all providers */}
      <div className="space-y-3">
        {PROVIDERS.map(p => {
          const hasSaved = savedKeys[p.id]
          const val = keyValues[p.field] ?? ""
          const show = showKeys[p.id] ?? false
          return (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.model}</p>
                </div>
                <div className="flex items-center gap-2">
                  {hasSaved && (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                    </span>
                  )}
                  {selectedProvider === p.id && (
                    <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium">Active</span>
                  )}
                </div>
              </div>
              <div className="relative">
                <Input
                  type={show ? "text" : "password"}
                  value={val}
                  onChange={(e) => setKeyValues(prev => ({ ...prev, [p.field]: e.target.value }))}
                  placeholder={hasSaved ? "••••••••••••••••••••" : p.placeholder}
                  className="pr-9 font-mono text-xs"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowKeys(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <a
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Get key from {p.linkLabel} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending || !hasChanged}>
          {isPending ? "Saving…" : "Save settings"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" /> Saved
          </span>
        )}
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-1.5">
        <p className="text-xs font-medium">Security</p>
        <p className="text-xs text-muted-foreground">
          Keys are stored in your private Supabase account protected by Row-Level Security — only you can read them. They are only used server-side and are never sent to the browser.
        </p>
      </div>
    </div>
  )
}
