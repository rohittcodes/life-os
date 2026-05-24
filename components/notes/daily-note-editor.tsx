"use client"

import { useTransition, useState, useCallback, useEffect } from "react"
import { saveNote } from "@/app/(app)/notes/actions"
import { NovelEditor } from "@/components/editor/novel-editor"
import { useVault } from "@/contexts/vault-context"
import { isEncrypted } from "@/lib/crypto"
import { Lock, ShieldCheck } from "lucide-react"
import type { JSONContent } from "novel"
import type { DailyNote } from "@/lib/types"

interface DailyNoteEditorProps {
  note: DailyNote | null
  date: string
}

export function DailyNoteEditor({ note, date }: DailyNoteEditorProps) {
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [, startTransition] = useTransition()
  const { isUnlocked, isEnabled, decrypt, encrypt } = useVault()
  const [initialContent, setInitialContent] = useState<JSONContent | null>(null)
  const [decryptionPending, setDecryptionPending] = useState(true)

  // Decrypt content when vault unlocks or note changes
  useEffect(() => {
    async function decryptContent() {
      setDecryptionPending(true)
      if (!note?.content) {
        setInitialContent(null)
        setDecryptionPending(false)
        return
      }
      try {
        const contentStr = typeof note.content === "string" ? note.content : JSON.stringify(note.content)
        const decrypted = isEncrypted(contentStr) ? await decrypt(contentStr) : contentStr
        if (decrypted.startsWith("[locked]") || decrypted.startsWith("[error]")) {
          setInitialContent(null)
        } else {
          setInitialContent(JSON.parse(decrypted))
        }
      } catch {
        setInitialContent(null)
      }
      setDecryptionPending(false)
    }
    decryptContent()
  }, [note, isUnlocked, decrypt])

  const handleChange = useCallback(
    (content: JSONContent) => {
      setSaving(true)
      startTransition(async () => {
        const jsonStr = JSON.stringify(content)
        const toSave = isEnabled && isUnlocked ? await encrypt(jsonStr) : jsonStr
        await saveNote(date, toSave)
        setSaving(false)
        setLastSaved(new Date())
      })
    },
    [date, isEnabled, isUnlocked, encrypt]
  )

  // If vault enabled but locked and content is encrypted, show lock overlay
  const noteIsEncrypted = note?.content ? isEncrypted(typeof note.content === "string" ? note.content : "") : false
  if (isEnabled && !isUnlocked && noteIsEncrypted) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-border bg-card text-center p-8">
        <div className="space-y-2">
          <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Note is encrypted</p>
          <p className="text-sm text-muted-foreground">Unlock the vault to read and edit this note</p>
        </div>
      </div>
    )
  }

  if (decryptionPending) {
    return <div className="min-h-[300px] rounded-xl border border-border bg-card animate-pulse" />
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {saving
            ? "Saving…"
            : lastSaved
              ? `Saved ${isEnabled && isUnlocked ? "& encrypted " : ""}at ${lastSaved.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
              : `Start writing — auto-saves${isEnabled && isUnlocked ? " with encryption" : ""}`}
        </p>
        {isEnabled && isUnlocked && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <ShieldCheck className="h-3 w-3" />E2E encrypted
          </span>
        )}
      </div>
      <NovelEditor
        key={`${date}-${isUnlocked}`}
        initialContent={initialContent}
        onChange={handleChange}
        className="min-h-[600px]"
      />
    </div>
  )
}
