"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { useRouter } from "next/navigation"
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { DropdownMenu } from "radix-ui"
import { motion, AnimatePresence } from "motion/react"
import {
  MessageSquare, Trash2, Calendar, Cpu, ArrowLeft,
  Send, Loader2, CheckCircle2, Eye, ChevronDown, SlidersHorizontal,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AgentPanel } from "@/components/ai/agent-panel"

interface Conversation {
  id: string
  title: string
  provider: string
  model: string | null
  created_at: string
  updated_at: string
}

interface ConversationMessage {
  id?: string
  role: string
  content: string
  parts?: unknown
}

type Provider = "anthropic" | "openai" | "gemini" | "groq"

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "text-orange-500",
  openai: "text-green-500",
  gemini: "text-blue-500",
  groq: "text-purple-500",
}

const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
  groq: "Groq",
}

const MODELS: Record<Provider, { id: string; label: string }[]> = {
  anthropic: [
    { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5 (Fast)" },
    { id: "claude-sonnet-4-5-20251001", label: "Sonnet 4.5" },
    { id: "claude-opus-4-5", label: "Opus 4.5" },
  ],
  openai: [
    { id: "gpt-4o-mini", label: "GPT-4o Mini" },
    { id: "gpt-4o", label: "GPT-4o" },
    { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
  ],
  gemini: [
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Fast)" },
    { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
  ],
}

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash",
  groq: "llama-3.3-70b-versatile",
}

type ParsedSegment =
  | { kind: "thinking"; text: string }
  | { kind: "text"; text: string }

function parseThinking(raw: string): ParsedSegment[] {
  const segments: ParsedSegment[] = []
  const re = /<think>([\s\S]*?)<\/think>/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) segments.push({ kind: "text", text: raw.slice(last, m.index).trim() })
    if (m[1].trim()) segments.push({ kind: "thinking", text: m[1].trim() })
    last = re.lastIndex
  }
  if (last < raw.length && raw.slice(last).trim()) segments.push({ kind: "text", text: raw.slice(last).trim() })
  return segments
}

function ThinkingBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="not-prose my-1.5 overflow-hidden rounded-lg border border-border/50 bg-muted/20">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="font-medium">Reasoning</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-auto"
        >
          <ArrowLeft className="h-3 w-3 rotate-180" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-3 pb-2.5 text-xs leading-relaxed text-muted-foreground/80 italic">
              {text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ToolStatusLine({ part }: { part: { type: string; toolName: string; state: string; output?: unknown; errorText?: string } }) {
  const output = part.output as Record<string, unknown> | undefined
  const isApprovalPending = part.state === "output-available" && output?._approval_needed
  const isBlocked = part.state === "output-available" && output?._blocked
  const isDone = part.state === "output-available" && !isApprovalPending && !isBlocked
  if (isApprovalPending || isBlocked || part.state === "output-error") return null

  return (
    <div className="not-prose flex items-center gap-1.5 my-1.5 text-xs text-muted-foreground">
      {isDone ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
      ) : (
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
      )}
      <span className="font-mono">
        {part.toolName}
        {isDone && output && typeof output === "object" && "message" in output
          ? `: ${(output as { message: string }).message}`
          : isDone ? " ✓" : "…"}
      </span>
    </div>
  )
}

function ModelSelector({
  provider, modelId,
  onProviderChange, onModelChange,
}: {
  provider: Provider
  modelId: string
  onProviderChange: (p: Provider) => void
  onModelChange: (id: string) => void
}) {
  const currentModel = MODELS[provider].find(m => m.id === modelId)

  return (
    <div className="flex items-center gap-2">
      <Select value={provider} onValueChange={(value) => onProviderChange(value as Provider)}>
        <SelectTrigger
          className="h-7 w-28 text-xs sm:hidden"
          aria-label="Select AI provider"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PROVIDER_LABELS) as Provider[]).map(p => (
            <SelectItem key={p} value={p}>
              {PROVIDER_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="hidden items-center rounded-xl border border-border bg-muted/40 p-0.5 sm:flex">
        {(Object.keys(PROVIDER_LABELS) as Provider[]).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => onProviderChange(p)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
              provider === p
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {PROVIDER_LABELS[p]}
          </button>
        ))}
      </div>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none group">
            <span className="max-w-[160px] truncate font-medium">{currentModel?.label ?? modelId}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground/60 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="bottom"
            align="start"
            sideOffset={6}
            className={cn(
              "z-[200] min-w-[220px] rounded-xl border border-border bg-popover p-1.5 shadow-lg",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            )}
          >
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {PROVIDER_LABELS[provider]} models
            </p>
            {MODELS[provider].map(m => (
              <DropdownMenu.Item
                key={m.id}
                onSelect={() => onModelChange(m.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs cursor-pointer outline-none",
                  "data-[highlighted]:bg-muted transition-colors",
                  modelId === m.id ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", modelId === m.id ? "bg-green-500" : "bg-transparent")} />
                {m.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}

function reconstructMessages(dbMsgs: ConversationMessage[]): UIMessage[] {
  return (dbMsgs ?? []).map((m) => ({
    id: m.id ?? crypto.randomUUID(),
    role: m.role as "user" | "assistant",
    parts: (Array.isArray(m.parts) ? m.parts : (m.role === "user"
      ? [{ type: "text", text: m.content }]
      : [{ type: "text", text: m.content }])) as UIMessage["parts"],
  }))
}

export function ChatsClient({
  initialConversations,
  initialSelected = null,
  initialMessages = [],
}: {
  initialConversations: Conversation[]
  initialSelected?: Conversation | null
  initialMessages?: ConversationMessage[]
}) {
  const router = useRouter()
  const [conversations, setConversations] = useState(initialConversations)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selected, setSelected] = useState<Conversation | null>(initialSelected)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [showAgentPanel, setShowAgentPanel] = useState(false)
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const initialProvider = ((initialSelected?.provider as Provider | undefined) ?? "anthropic")
  const [provider, setProvider] = useState<Provider>(initialProvider)
  const [modelId, setModelId] = useState<string>(initialSelected?.model ?? DEFAULT_MODELS[initialProvider])

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/ai/chat",
      body: () => ({ provider, model: modelId }),
    }),
    [provider, modelId]
  )

  const { messages, sendMessage, status, error, setMessages } = useChat({ transport })
  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    if (!initialSelected) return
    setMessages(reconstructMessages(initialMessages))
  }, [initialSelected, initialMessages, setMessages])

  useEffect(() => {
    if (!selected) return
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" })
  }, [selected, messages.length, isLoading])

  async function deleteConversation(id: string) {
    setDeleting(id)
    try {
      await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" })
      setConversations(prev => prev.filter(c => c.id !== id))
      if (selected?.id === id) {
        setSelected(null)
        setMessages([])
        router.push("/chats")
      }
    } finally {
      setDeleting(null)
    }
  }

  const openConversation = useCallback((conv: Conversation) => {
    setLoadingConversation(true)
    router.push(`/chats/${conv.id}`)
  }, [router])

  const saveConversation = useCallback(async (msgs: typeof messages) => {
    if (!selected) return
    const serialized = msgs.map(m => ({
      role: m.role,
      content: m.parts?.find(p => p.type === "text")?.text ?? "",
      parts: m.parts ?? null,
    }))

    await fetch(`/api/ai/conversations/${selected.id}` , {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: serialized, provider, model: modelId }),
    })

    setConversations(prev => prev.map(c => (
      c.id === selected.id
        ? { ...c, updated_at: new Date().toISOString(), provider: provider ?? c.provider, model: modelId ?? c.model }
        : c
    )))
  }, [selected, provider, modelId])

  const prevStatus = useRef(status)
  useEffect(() => {
    if (prevStatus.current === "streaming" && status === "ready") {
      saveConversation(messages)
    }
    prevStatus.current = status
  }, [status, messages, saveConversation])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput("")
    await sendMessage({ text })
  }, [input, isLoading, sendMessage])

  // Group by date
  const groups = conversations.reduce<Record<string, Conversation[]>>((acc, conv) => {
    const date = new Date(conv.updated_at)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    let label: string
    if (date.toDateString() === today.toDateString()) label = "Today"
    else if (date.toDateString() === yesterday.toDateString()) label = "Yesterday"
    else label = date.toLocaleDateString("en-IN", { month: "long", year: "numeric" })

    if (!acc[label]) acc[label] = []
    acc[label].push(conv)
    return acc
  }, {})

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(251,146,60,0.12),_transparent_55%)]" />

      <div className={cn(
        "mx-auto w-full px-4 md:px-6",
        selected ? "max-w-none" : "max-w-3xl"
      )}>
        {!selected && (
          <div className="space-y-6">
            {/* Empty state */}
            {conversations.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center text-center space-y-3"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="text-xs text-muted-foreground max-w-[280px]">
                  Start chatting with the AI assistant using the button in the bottom-right corner.
                </p>
              </motion.div>
            )}

            {/* Grouped conversations */}
            {Object.entries(groups).map(([label, convs]) => (
              <div key={label} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">{label}</p>
                <AnimatePresence initial={false}>
                  {convs.map((conv) => (
                    <motion.div
                      key={conv.id}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="group flex items-start gap-3 rounded-2xl border border-border bg-card/80 backdrop-blur p-4 hover:border-foreground/20 transition-colors cursor-pointer"
                      onClick={() => openConversation(conv)}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted shrink-0 mt-0.5">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate leading-snug">{conv.title}</p>
                        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={cn("flex shrink-0 items-center gap-1 text-xs font-medium capitalize", PROVIDER_COLORS[conv.provider] ?? "text-muted-foreground")}>
                              <Cpu className="h-3 w-3" />
                              {conv.provider}
                            </span>
                            {conv.model && (
                              <span className="min-w-0 truncate text-xs text-muted-foreground/70">{conv.model}</span>
                            )}
                          </div>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground/50 sm:ml-auto sm:shrink-0">
                            <Calendar className="h-3 w-3" />
                            {new Date(conv.updated_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => { e.stopPropagation(); openConversation(conv) }}
                        className="opacity-0 group-hover:opacity-100 shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        title="Open"
                      >
                        <Eye className="h-4 w-4" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                        disabled={deleting === conv.id}
                        className="opacity-0 group-hover:opacity-100 shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                      >
                        {deleting === conv.id ? (
                          <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div className="flex min-h-[87.5vh] w-full flex-col">
            <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <button
                aria-label="Back to chats"
                title="Back to chats"
                onClick={() => { setSelected(null); setMessages([]); router.push("/chats") }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{selected.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {selected.provider}{selected.model ? ` · ${selected.model}` : ""}
                </p>
              </div>
              <div className="ml-auto text-xs text-muted-foreground/70">
                {new Date(selected.updated_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <div className="flex min-h-full flex-col justify-end gap-4">
              {loadingConversation && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading conversation…
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex flex-col gap-0.5",
                      msg.role === "user" ? "items-end" : "items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm",
                        msg.role === "user"
                          ? "bg-foreground text-background rounded-br-sm"
                          : "bg-muted rounded-bl-sm w-full max-w-full",
                      )}
                    >
                      {msg.role === "user" ? (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {msg.parts?.find(p => p.type === "text")?.text ?? ""}
                        </p>
                      ) : (
                        <div className="space-y-0.5">
                          {msg.parts?.map((part, i) => {
                            if (part.type === "text") {
                              const segments = parseThinking(part.text)
                              return (
                                <div key={i}>
                                  {segments.map((seg, j) =>
                                    seg.kind === "thinking" ? (
                                      <ThinkingBlock key={j} text={seg.text} />
                                    ) : seg.text ? (
                                      <div key={j} className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2">
                                        <ReactMarkdown>{seg.text}</ReactMarkdown>
                                      </div>
                                    ) : null
                                  )}
                                </div>
                              )
                            }

                            if (part.type === "dynamic-tool") {
                              const output = part.state === "output-available" ? part.output as Record<string, unknown> : null
                              return <ToolStatusLine key={i} part={{ type: part.type, toolName: part.toolName, state: part.state, output: output ?? undefined, errorText: part.state === "output-error" ? part.errorText : undefined }} />
                            }

                            return null
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                  {error.message}
                </div>
              )}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="mt-auto py-2 sticky bottom-0 bg-background">

              <AnimatePresence>
                {showAgentPanel && (
                  <motion.div
                    key="agent"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 320, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden border border-border rounded-xl mb-2"
                  >
                    <AgentPanel />
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <ModelSelector
                    provider={provider}
                    modelId={modelId}
                    onProviderChange={(p) => { setProvider(p); setModelId(DEFAULT_MODELS[p]) }}
                    onModelChange={setModelId}
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowAgentPanel(v => !v)}
                    title="Context, memory & permissions"
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      showAgentPanel
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </motion.button>
                </div>
                <div className="relative">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit()
                      }
                    }}
                    placeholder="Continue the conversation…"
                    rows={1}
                    style={{ resize: "none", overflow: "hidden" }}
                    className="w-full min-h-[72px] rounded-2xl border border-border bg-background pl-4 pr-12 py-3.5 text-sm shadow-sm outline-none focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10 transition-[border,box-shadow] placeholder:text-foreground/60 disabled:opacity-50 leading-relaxed"
                    disabled={isLoading}
                  />
                  <motion.div whileTap={{ scale: 0.9 }} className="absolute bottom-2 right-2">
                    <Button
                      type="submit"
                      size="icon"
                      disabled={isLoading || !input.trim()}
                      className="h-8 w-8 rounded-xl"
                    >
                      {isLoading
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Send className="h-4 w-4" />}
                    </Button>
                  </motion.div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
