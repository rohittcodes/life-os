"use client"

import { useTransition } from "react"
import { markContacted, deleteContact } from "@/app/(app)/contacts/actions"
import type { Contact } from "@/lib/types"

const warmthEmoji = ["","🥶","😐","🙂","😊","🤝"]
const warmthLabel = ["","Cold","Cool","Warm","Good","Close"]

function daysSince(date: string | null): number | null {
  if (!date) return null
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

export function ContactsList({ contacts }: { contacts: Contact[] }) {
  const [, startTransition] = useTransition()

  if (contacts.length === 0) {
    return <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">No contacts yet — build your network</div>
  }

  const overdueFollowUp = contacts.filter((c) => c.next_follow_up && new Date(c.next_follow_up) <= new Date())
  const normal = contacts.filter((c) => !c.next_follow_up || new Date(c.next_follow_up) > new Date())

  return (
    <div className="space-y-4">
      {overdueFollowUp.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-orange-600 dark:text-orange-400">⚠ Follow-up needed</h3>
          {overdueFollowUp.map((c) => <ContactRow key={c.id} contact={c} onContact={() => startTransition(() => markContacted(c.id))} onDelete={() => startTransition(() => deleteContact(c.id))} />)}
        </div>
      )}
      <div className="space-y-2">
        {normal.map((c) => <ContactRow key={c.id} contact={c} onContact={() => startTransition(() => markContacted(c.id))} onDelete={() => startTransition(() => deleteContact(c.id))} />)}
      </div>
    </div>
  )
}

function ContactRow({ contact: c, onContact, onDelete }: { contact: Contact; onContact: () => void; onDelete: () => void }) {
  const since = daysSince(c.last_contacted_at)

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-foreground/20 transition-colors">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
        {c.name[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{c.name}</span>
          <span title={warmthLabel[c.warmth]} className="text-base leading-none">{warmthEmoji[c.warmth]}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {[c.role, c.company].filter(Boolean).join(" · ")}
          {since !== null && <span className="ml-2 text-muted-foreground/60">contacted {since === 0 ? "today" : `${since}d ago`}</span>}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onContact} className="rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-muted transition-colors">
          Contacted
        </button>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
      </div>
    </div>
  )
}
