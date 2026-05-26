"use client"

import { useEffect, useState, useCallback } from "react"
import { Command } from "cmdk"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import {
  LayoutDashboard, CheckCircle2, ListTodo, StickyNote, Target, MessageSquare,
  Briefcase, Users, FolderKanban, Timer, Wallet, HeartPulse, Brain, Library,
  UserCircle, PenLine, Sunrise, BookOpen, Settings, Sparkles, Search, CalendarCheck,
} from "lucide-react"

const NAV_GROUPS = [
  {
    label: "Navigate",
    items: [
      { label: "Today", href: "/today", icon: CalendarCheck },
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Habits", href: "/habits", icon: CheckCircle2 },
      { label: "To-Do", href: "/todos", icon: ListTodo },
      { label: "Daily Notes", href: "/notes", icon: StickyNote },
      { label: "Goals", href: "/goals", icon: Target },
      { label: "AI Chats", href: "/chats", icon: MessageSquare },
      { label: "Morning Routine", href: "/routine", icon: Sunrise },
      { label: "Weekly Review", href: "/review", icon: BookOpen },
    ],
  },
  {
    label: "Work",
    items: [
      { label: "Jobs", href: "/jobs", icon: Briefcase },
      { label: "Work Pipeline", href: "/freelance", icon: Users },
      { label: "Work Tasks", href: "/product", icon: FolderKanban },
      { label: "Time Tracker", href: "/time", icon: Timer },
    ],
  },
  {
    label: "Life",
    items: [
      { label: "Finance", href: "/finance", icon: Wallet },
      { label: "Wellness", href: "/wellness", icon: HeartPulse },
      { label: "Knowledge", href: "/knowledge", icon: Brain },
      { label: "Library", href: "/bookmarks", icon: Library },
      { label: "People & Subs", href: "/contacts", icon: UserCircle },
      { label: "Blog", href: "/blog", icon: PenLine },
    ],
  },
]

const groupHeadingClass =
  "[&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:pb-1 [&>[cmdk-group-heading]]:pt-2 [&>[cmdk-group-heading]]:text-[10px] [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-widest [&>[cmdk-group-heading]]:text-muted-foreground/60"

const itemClass =
  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground outline-none data-[selected=true]:bg-muted data-[selected=true]:text-foreground transition-colors"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  const go = useCallback((href: string) => {
    setOpen(false)
    router.push(href)
  }, [router])

  const openAI = useCallback(() => {
    setOpen(false)
    window.dispatchEvent(new CustomEvent("life-os:open-ai"))
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-background/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            key="palette"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed left-1/2 top-[18%] z-[101] w-full max-w-lg -translate-x-1/2 px-4"
          >
            <Command
              loop
              className="overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
            >
              {/* Input */}
              <div className="flex items-center gap-2 border-b border-border px-3">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Command.Input
                  placeholder="Jump to page or action..."
                  className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
                  autoFocus
                />
                <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                <Command.Group heading="Actions" className={groupHeadingClass}>
                  <Command.Item onSelect={openAI} className={itemClass}>
                    <Sparkles className="h-4 w-4 shrink-0" />
                    Open AI Assistant
                    <span className="ml-auto text-[10px] text-muted-foreground/50">Ctrl+Alt+B</span>
                  </Command.Item>
                  <Command.Item onSelect={() => go("/settings")} className={itemClass}>
                    <Settings className="h-4 w-4 shrink-0" />
                    Settings
                  </Command.Item>
                </Command.Group>

                {NAV_GROUPS.map(group => (
                  <Command.Group key={group.label} heading={group.label} className={groupHeadingClass}>
                    {group.items.map(({ label, href, icon: Icon }) => (
                      <Command.Item key={href} value={label} onSelect={() => go(href)} className={itemClass}>
                        <Icon className="h-4 w-4 shrink-0" />
                        {label}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              {/* Footer hints */}
              <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[10px] text-muted-foreground/60">
                <span><kbd className="rounded border border-border bg-muted px-1 py-0.5 mr-1">↑↓</kbd>navigate</span>
                <span><kbd className="rounded border border-border bg-muted px-1 py-0.5 mr-1">↵</kbd>select</span>
                <span className="ml-auto">Ctrl+K to toggle</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
