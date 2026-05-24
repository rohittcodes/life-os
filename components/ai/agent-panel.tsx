"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  CheckCircle2, Clock, Wallet, HeartPulse, ListTodo,
  Plus, X, Loader2, ShieldCheck, ShieldOff, ShieldQuestion,
  Brain, RefreshCw,
} from "lucide-react"
import { TOOL_LABELS, WRITE_TOOLS } from "@/lib/ai/tool-executor"
import { cn } from "@/lib/utils"

type ContextData = {
  todos: Array<{ title: string; priority: string; due_date?: string }>
  habits: { gym_done: boolean; english_done: boolean; diet_clean: boolean } | null
  wellness: { mood: number; sleep_hours: number; water_glasses: number } | null
  timer: { description: string; started_at: string } | null
  finance: { income: number; expense: number; net: number }
  permissions: Record<string, string>
  memory: string[]
  today: string
}

type Tab = "context" | "memory" | "permissions"

const PERMISSION_OPTS = [
  { value: "always", label: "Always", icon: ShieldCheck, color: "text-green-500" },
  { value: "ask", label: "Ask", icon: ShieldQuestion, color: "text-yellow-500" },
  { value: "never", label: "Never", icon: ShieldOff, color: "text-red-500" },
] as const

export function AgentPanel() {
  const [tab, setTab] = useState<Tab>("context")
  const [data, setData] = useState<ContextData | null>(null)
  const [loading, setLoading] = useState(false)
  const [newFact, setNewFact] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/ai/context")
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [fetchData])

  async function setPermission(toolName: string, permission: string) {
    if (!data) return
    // Optimistic update
    setData(d => d ? { ...d, permissions: { ...d.permissions, [toolName]: permission } } : d)
    await fetch("/api/ai/tool-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolName, args: {}, permission }),
    })
  }

  async function addMemory() {
    if (!newFact.trim() || !data) return
    setSaving(true)
    try {
      const res = await fetch("/api/ai/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", fact: newFact }),
      })
      const { memory } = await res.json()
      setData(d => d ? { ...d, memory } : d)
      setNewFact("")
    } finally {
      setSaving(false)
    }
  }

  async function removeMemory(index: number) {
    if (!data) return
    const updated = data.memory.filter((_, i) => i !== index)
    setData(d => d ? { ...d, memory: updated } : d)
    await fetch("/api/ai/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", index }),
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border px-3 pt-2 pb-0">
        {(["context", "memory", "permissions"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-t-md capitalize transition-colors border-b-2 -mb-px",
              tab === t
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={fetchData}
          disabled={loading}
          className="ml-auto mb-1 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
        </motion.button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === "context" && (
            <motion.div key="context" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.15 }} className="w-full p-3 space-y-3 h-full">
              {loading && !data ? (
                <div className="flex h-20 items-center justify-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : data ? (
                <>
                  {/* Timer */}
                  {data.timer && (
                    <div className="w-full flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-2.5 py-2 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                      <span className="font-medium text-green-700 dark:text-green-400 truncate">
                        Timer: {data.timer.description}
                      </span>
                    </div>
                  )}

                  {/* Habits */}
                  <div className="w-full rounded-lg border border-border bg-card p-2.5 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3" /> Today&apos;s habits
                    </p>
                    {data.habits ? (
                      <div className="flex gap-3 text-xs">
                        {[["Gym", data.habits.gym_done], ["English", data.habits.english_done], ["Diet", data.habits.diet_clean]].map(([label, done]) => (
                          <span key={String(label)} className={cn("flex items-center gap-1", done ? "text-green-600 dark:text-green-400" : "text-muted-foreground/60")}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", done ? "bg-green-500" : "bg-muted-foreground/30")} />
                            {String(label)}
                          </span>
                        ))}
                      </div>
                    ) : <p className="text-xs text-muted-foreground/60">Not logged yet today</p>}
                  </div>

                  {/* Wellness */}
                  <div className="w-full rounded-lg border border-border bg-card p-2.5 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <HeartPulse className="h-3 w-3" /> Wellness
                    </p>
                    {data.wellness ? (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {data.wellness.mood && <span>Mood {data.wellness.mood}/5</span>}
                        {data.wellness.sleep_hours && <span>{data.wellness.sleep_hours}h sleep</span>}
                        {data.wellness.water_glasses > 0 && <span>{data.wellness.water_glasses} glasses</span>}
                      </div>
                    ) : <p className="text-xs text-muted-foreground/60">Not logged yet today</p>}
                  </div>

                  {/* Finance */}
                  <div className="w-full rounded-lg border border-border bg-card p-2.5 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Wallet className="h-3 w-3" /> This month
                    </p>
                    <div className="flex gap-3 text-xs">
                      <span className="text-green-600 dark:text-green-400">+₹{data.finance.income.toLocaleString("en-IN")}</span>
                      <span className="text-red-500">−₹{data.finance.expense.toLocaleString("en-IN")}</span>
                      <span className={data.finance.net >= 0 ? "text-foreground font-medium" : "text-red-500 font-medium"}>
                        Net ₹{data.finance.net.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Todos */}
                  <div className="w-full rounded-lg border border-border bg-card p-2.5 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <ListTodo className="h-3 w-3" /> Pending todos ({data.todos.length})
                    </p>
                    <div className="space-y-0.5">
                      {data.todos.slice(0, 5).map((t, i) => (
                        <p key={i} className="text-xs text-muted-foreground truncate">· {t.title}</p>
                      ))}
                      {data.todos.length > 5 && <p className="text-xs text-muted-foreground/60">+{data.todos.length - 5} more</p>}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">Failed to load context</p>
              )}
            </motion.div>
          )}

          {tab === "memory" && (
            <motion.div key="memory" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.15 }} className="w-full p-3 space-y-3 h-full">
              <p className="text-xs text-muted-foreground">Facts the agent remembers about you. These are included in every conversation.</p>

              <div className="flex gap-2">
                <input
                  value={newFact}
                  onChange={e => setNewFact(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addMemory()}
                  placeholder="Add a fact… e.g. 'Budget is ₹30k/month'"
                  className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-foreground/30 transition-colors placeholder:text-muted-foreground/50"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={addMemory}
                  disabled={!newFact.trim() || saving}
                  className="rounded-lg bg-foreground text-background px-2.5 py-1.5 text-xs font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                </motion.button>
              </div>

              <AnimatePresence initial={false}>
                {data?.memory.length === 0 && (
                  <p className="text-xs text-muted-foreground/60 text-center py-4">No memories yet. Add facts the agent should always know.</p>
                )}
                {data?.memory.map((fact, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="w-full flex items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2"
                  >
                    <Brain className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="flex-1 text-xs leading-relaxed">{fact}</p>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => removeMemory(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                      <X className="h-3 w-3" />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {tab === "permissions" && (
            <motion.div key="permissions" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.15 }} className="w-full p-3 space-y-2 h-full">
              <p className="text-xs text-muted-foreground">Control whether the AI asks for confirmation before each action.</p>
              {Array.from(WRITE_TOOLS).map((toolName) => {
                const current = data?.permissions[toolName] ?? "ask"
                return (
                  <div key={toolName} className="w-full rounded-lg border border-border bg-card p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium truncate">{TOOL_LABELS[toolName] ?? toolName}</p>
                      <div className="flex gap-1 shrink-0">
                        {PERMISSION_OPTS.map(({ value, label, icon: Icon, color }) => (
                          <motion.button
                            key={value}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setPermission(toolName, value)}
                            title={label}
                            className={cn(
                              "rounded-md px-1.5 py-1 text-xs transition-all flex items-center gap-1",
                              current === value
                                ? `${color} bg-muted font-medium`
                                : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50"
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            <span className="hidden sm:inline">{label}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
