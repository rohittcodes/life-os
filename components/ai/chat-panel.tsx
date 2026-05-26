"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useReducer, useRef, useEffect, useMemo, useCallback, useState } from "react"
import { usePathname } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import {
  type Provider, PROVIDER_LABELS, MODELS, DEFAULT_MODELS, parseThinking,
} from "@/lib/ai/chat-constants"
import { ThinkingBlock } from "@/components/ai/thinking-block"
import { DropdownMenu } from "radix-ui"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  X, Send, Bot, Loader2, Sparkles, CheckCircle2, AlertCircle,
  XCircle, ShieldAlert, SlidersHorizontal, Plus, MessageSquare, Trash2,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"
import { AgentPanel } from "@/components/ai/agent-panel"
import { TOOL_LABELS } from "@/lib/ai/tool-executor"

// ── Types ─────────────────────────────────────────────────────────────────────
interface ConversationSummary {
  id: string
  title: string
  provider: string
  model: string | null
  updated_at: string
}

interface Props {
  hasApiKey: boolean
  defaultProvider?: string
}

const DEFAULT_SUGGESTIONS = [
  "Plan my day from calendar + tasks",
  "Log habit: workout + 2L water",
  "Add expense: lunch 500 INR",
  "Summarize today's notes into action items",
]

const PAGE_SUGGESTIONS: Record<string, string[]> = {
  "/finance":   ["What's my net balance this month?", "Add expense: lunch ₹450", "Where am I spending the most?", "Show income vs expenses"],
  "/todos":     ["What are my overdue todos?", "Add todo: review contract by Friday", "Clear all completed todos", "What should I tackle first today?"],
  "/habits":    ["Log today's habits", "What's my current streak?", "How consistent have I been this week?", "Add a new custom habit"],
  "/wellness":  ["Log today's mood and sleep", "How has my wellness been this week?", "What's my average sleep this month?"],
  "/goals":     ["List my active goals", "Update progress on my fitness goal", "Add a new career goal", "What goals am I close to completing?"],
  "/jobs":      ["What's the status of my applications?", "Add a new job application", "How many jobs have I applied to this week?"],
  "/dashboard": ["What should I focus on today?", "How am I doing overall?", "What's overdue?", "Give me a quick summary of my week"],
  "/notes":     ["Summarize today's notes", "What did I write about last week?", "Start today's daily note"],
  "/freelance": ["What work is in progress?", "Any pending client deliverables?", "Total active project value?"],
  "/time":      ["Am I tracking time right now?", "How many hours did I log this week?", "Start a new time entry"],
}

// ── Tool approval card ────────────────────────────────────────────────────────
type ApprovalResult = { approved: boolean; message: string }

function ToolApprovalCard({
  toolName,
  description,
  args,
  onResult,
}: {
  toolName: string
  description: string
  args: string
  onResult: (r: ApprovalResult) => void
}) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handle(permission: "once" | "always" | "deny" | "never") {
    if (permission === "deny") {
      onResult({ approved: false, message: "Action denied." })
      return
    }
    if (permission === "never") {
      await fetch("/api/ai/tool-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolName, args: {}, permission: "never" }),
      })
      onResult({ approved: false, message: `"${TOOL_LABELS[toolName] ?? toolName}" disabled. Re-enable it in the AI panel → Permissions.` })
      return
    }

    setLoading(permission)
    try {
      const res = await fetch("/api/ai/tool-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolName, args: JSON.parse(args), permission }),
      })
      const data = await res.json()
      onResult({ approved: true, message: data.message ?? "Done." })
    } catch {
      onResult({ approved: false, message: "Request failed. Try again." })
    } finally {
      setLoading(null)
    }
  }

  return (
    <motion.div
      initial={{ scale: 0.97, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="not-prose my-2 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2.5"
    >
      <div className="flex items-start gap-2">
        <ShieldAlert className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-semibold">{TOOL_LABELS[toolName] ?? toolName}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {[
          { id: "once", label: "Run once", style: "bg-foreground text-background hover:opacity-90" },
          { id: "always", label: "Always allow", style: "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 border border-green-500/20" },
          { id: "deny", label: "Deny", style: "border border-border text-muted-foreground hover:text-foreground hover:bg-muted" },
          { id: "never", label: "Don't ask again", style: "border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30" },
        ].map(({ id, label, style }) => (
          <motion.button
            key={id}
            whileTap={{ scale: 0.95 }}
            disabled={!!loading}
            onClick={() => handle(id as "once" | "always" | "deny" | "never")}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all flex items-center justify-center gap-1.5",
              style,
              loading && loading !== id && "opacity-40",
            )}
          >
            {loading === id ? <Loader2 className="h-3 w-3 animate-spin" /> : label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

// ── Tool status line ──────────────────────────────────────────────────────────
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

// ── Model selector ────────────────────────────────────────────────────────────
function ModelSelector({
  provider, modelId, onProviderChange, onModelChange,
}: {
  provider: Provider
  modelId: string
  onProviderChange: (p: Provider) => void
  onModelChange: (id: string) => void
}) {
  const currentModel = MODELS[provider].find(m => m.id === modelId) ?? MODELS[provider][0]
  return (
    <div className="flex items-center gap-1 min-w-0">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-w-0 max-w-[160px]">
            <span className="truncate">{PROVIDER_LABELS[provider]} · {currentModel.label}</span>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-[200] min-w-[200px] overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg"
            sideOffset={6}
            align="start"
          >
            {(Object.keys(MODELS) as Provider[]).map(p => (
              <DropdownMenu.Sub key={p}>
                <DropdownMenu.SubTrigger className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs outline-none transition-colors",
                  provider === p ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", provider === p ? "bg-green-500" : "bg-transparent")} />
                  {PROVIDER_LABELS[p]}
                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent
                    className="z-[201] min-w-[180px] overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg"
                    sideOffset={4}
                  >
                    {MODELS[p].map(m => (
                      <DropdownMenu.Item
                        key={m.id}
                        onSelect={() => { onProviderChange(p); onModelChange(m.id) }}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs outline-none transition-colors hover:bg-muted",
                          provider === p && modelId === m.id ? "text-foreground font-medium" : "text-muted-foreground",
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", provider === p && modelId === m.id ? "bg-green-500" : "bg-transparent")} />
                        {m.label}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}

// ── Conversation history list ─────────────────────────────────────────────────
function ConversationList({
  conversations, currentId, onSelect, onDelete, onNew,
}: {
  conversations: ConversationSummary[]
  currentId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <span className="text-xs font-medium text-muted-foreground">History</span>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onNew}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </motion.button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No conversations yet. Start chatting!</p>
        ) : (
          <AnimatePresence initial={false}>
            {conversations.map((conv) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors",
                  conv.id === currentId ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
                onClick={() => onSelect(conv.id)}
              >
                <MessageSquare className="h-3 w-3 shrink-0" />
                <span className="flex-1 truncate text-xs">{conv.title}</span>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => { e.stopPropagation(); onDelete(conv.id) }}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

// ── Reducer ───────────────────────────────────────────────────────────────────
type ChatState = {
  open: boolean
  showAgentPanel: boolean
  showHistory: boolean
  input: string
  provider: Provider
  modelId: string
  conversationId: string | null
  approvalResults: Record<string, ApprovalResult>
  loadingConvId: string | null
}

type ChatAction =
  | { type: "SET_OPEN"; open: boolean }
  | { type: "TOGGLE_HISTORY" }
  | { type: "TOGGLE_AGENT" }
  | { type: "SET_INPUT"; value: string }
  | { type: "CHANGE_PROVIDER"; provider: Provider }
  | { type: "SET_MODEL"; modelId: string }
  | { type: "SET_CONVERSATION"; id: string; provider?: Provider; modelId?: string }
  | { type: "SET_LOADING_CONV_ID"; id: string | null }
  | { type: "SET_APPROVAL"; toolCallId: string; result: ApprovalResult }
  | { type: "NEW_CHAT" }

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_OPEN":
      return { ...state, open: action.open }
    case "TOGGLE_HISTORY":
      return { ...state, showHistory: !state.showHistory, showAgentPanel: false }
    case "TOGGLE_AGENT":
      return { ...state, showAgentPanel: !state.showAgentPanel, showHistory: false }
    case "SET_INPUT":
      return { ...state, input: action.value }
    case "CHANGE_PROVIDER":
      return { ...state, provider: action.provider, modelId: DEFAULT_MODELS[action.provider] }
    case "SET_MODEL":
      return { ...state, modelId: action.modelId }
    case "SET_CONVERSATION":
      return {
        ...state,
        conversationId: action.id,
        ...(action.provider ? { provider: action.provider as Provider } : {}),
        ...(action.modelId ? { modelId: action.modelId } : {}),
        showHistory: false,
      }
    case "SET_LOADING_CONV_ID":
      return { ...state, loadingConvId: action.id }
    case "SET_APPROVAL":
      return { ...state, approvalResults: { ...state.approvalResults, [action.toolCallId]: action.result } }
    case "NEW_CHAT":
      return { ...state, conversationId: null, input: "", showHistory: false }
    default:
      return state
  }
}

// ── Main chat panel ───────────────────────────────────────────────────────────
export function ChatPanel({ hasApiKey, defaultProvider }: Props) {
  const pathname = usePathname()
  const resolvedDefault = (
    defaultProvider && (defaultProvider in DEFAULT_MODELS) ? defaultProvider : "anthropic"
  ) as Provider

  const [state, dispatch] = useReducer(chatReducer, {
    open: false,
    showAgentPanel: false,
    showHistory: false,
    input: "",
    provider: resolvedDefault,
    modelId: DEFAULT_MODELS[resolvedDefault],
    conversationId: null,
    approvalResults: {},
    loadingConvId: null,
  })

  const { open, showAgentPanel, showHistory, input, provider, modelId, conversationId, approvalResults, loadingConvId } = state

  const qc = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const convIdRef = useRef<string | null>(null)

  // Keep ref in sync
  useEffect(() => { convIdRef.current = conversationId }, [conversationId])

  // Model + pathname refs for transport body (avoids re-creating transport)
  const modelRef = useRef({ provider, modelId })
  useEffect(() => { modelRef.current = { provider, modelId } }, [provider, modelId])
  const pathnameRef = useRef(pathname)
  useEffect(() => { pathnameRef.current = pathname }, [pathname])

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/ai/chat",
      body: () => ({
        provider: modelRef.current.provider,
        model: modelRef.current.modelId,
        currentPage: pathnameRef.current,
      }),
    }),
    []
  )

  const { messages, sendMessage, status, error, stop, setMessages } = useChat({ transport })
  const isLoading = status === "streaming" || status === "submitted"

  const { data: conversations = [], isLoading: loadingConv } = useQuery({
    queryKey: queryKeys.conversations(),
    queryFn: async () => {
      const res = await fetch("/api/ai/conversations")
      if (!res.ok) throw new Error("Failed to fetch conversations")
      const { conversations: convs } = await res.json()
      return convs as ConversationSummary[]
    },
    enabled: showHistory,
    staleTime: 2 * 60 * 1000,
  })

  // Keyboard shortcut Ctrl+Alt+B
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault()
        dispatch({ type: "SET_OPEN", open: !open })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  // Open from command palette
  useEffect(() => {
    function onOpen() { dispatch({ type: "SET_OPEN", open: true }) }
    window.addEventListener("life-os:open-ai", onOpen)
    return () => window.removeEventListener("life-os:open-ai", onOpen)
  }, [])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 160) + "px"
  }, [input])

  // Save conversation to DB after stream completes
  async function saveConversation(msgs: typeof messages) {
    if (msgs.length === 0) return

    const serialized = msgs.map(m => ({
      role: m.role,
      content: m.parts?.find(p => p.type === "text")?.text ?? "",
      parts: m.parts ?? null,
    }))

    if (!convIdRef.current) {
      const firstUserMsg = serialized.find(m => m.role === "user")?.content ?? "New chat"
      const title = firstUserMsg.slice(0, 60) + (firstUserMsg.length > 60 ? "…" : "")
      const res = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, provider, model: modelId }),
      })
      if (res.ok) {
        const { conversation } = await res.json()
        dispatch({ type: "SET_CONVERSATION", id: conversation.id })
        convIdRef.current = conversation.id
        await fetch(`/api/ai/conversations/${conversation.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: serialized, provider, model: modelId }),
        })
        qc.invalidateQueries({ queryKey: queryKeys.conversations() })
      }
    } else {
      await fetch(`/api/ai/conversations/${convIdRef.current}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: serialized, provider, model: modelId }),
      })
    }
  }

  // Save after streaming ends
  const prevStatus = useRef(status)
  useEffect(() => {
    if (prevStatus.current === "streaming" && status === "ready") {
      saveConversation(messages)
    }
    prevStatus.current = status
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  async function loadConversation(id: string) {
    dispatch({ type: "SET_LOADING_CONV_ID", id })
    try {
      const res = await fetch(`/api/ai/conversations/${id}`)
      if (!res.ok) return
      const { conversation, messages: dbMsgs } = await res.json()

      const reconstructed = dbMsgs.map((m: { id?: string; role: string; content: string; parts?: unknown }) => ({
        id: m.id ?? crypto.randomUUID(),
        role: m.role as "user" | "assistant",
        parts: m.parts ?? (m.role === "user"
          ? [{ type: "text", text: m.content }]
          : [{ type: "text", text: m.content }]),
      }))

      setMessages(reconstructed)
      dispatch({
        type: "SET_CONVERSATION",
        id,
        provider: conversation.provider,
        modelId: conversation.model,
      })
    } finally {
      dispatch({ type: "SET_LOADING_CONV_ID", id: null })
    }
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" })
    qc.invalidateQueries({ queryKey: queryKeys.conversations() })
    if (convIdRef.current === id) startNewChat()
  }

  function startNewChat() {
    setMessages([])
    dispatch({ type: "NEW_CHAT" })
    convIdRef.current = null
  }

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    dispatch({ type: "SET_INPUT", value: "" })
    await sendMessage({ text })
  }, [input, isLoading, sendMessage])

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => dispatch({ type: "SET_OPEN", open: true })}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.93 }}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-xl shadow-lg",
          "bg-foreground text-background transition-all duration-200",
          open && "opacity-0 pointer-events-none scale-75",
        )}
        aria-label="Open AI assistant (Ctrl+Alt+B)"
      >
        <Sparkles className="h-5 w-5" />
      </motion.button>

      {/* Sheet */}
      <Sheet open={open} onOpenChange={(o) => dispatch({ type: "SET_OPEN", open: o })}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex flex-col p-0 gap-0 w-full data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        >
          <SheetTitle className="sr-only">Life OS AI Assistant</SheetTitle>

          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 shrink-0">
            <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
            {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
            <button
              onClick={() => dispatch({ type: "SET_OPEN", open: false })}
              className="ml-auto rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Slide-in panels */}
          <AnimatePresence>
            {showAgentPanel && (
              <motion.div
                key="agent"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 320, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden border-b border-border shrink-0"
              >
                <AgentPanel />
              </motion.div>
            )}
            {showHistory && (
              <motion.div
                key="history"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 360, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden border-b border-border shrink-0"
              >
                {loadingConv ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <ConversationList
                    conversations={conversations}
                    currentId={conversationId}
                    onSelect={loadConversation}
                    onDelete={deleteConversation}
                    onNew={startNewChat}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <div className="flex min-h-full flex-col gap-4">
              {!hasApiKey && (
                <div className="flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>No AI key configured. Go to <strong>Settings → AI</strong> to add your key.</span>
                </div>
              )}

              {messages.length === 0 && !showAgentPanel && !showHistory && (
                <div className="flex min-h-full items-center justify-center">
                  <div className="w-full max-w-sm space-y-4">
                    <p className="text-xs text-muted-foreground text-center">
                      Ask me to log habits, add todos, track expenses, and more.
                      <br />
                      <span className="opacity-60 text-[10px]">Ctrl+Alt+B to toggle · Ctrl+K for commands</span>
                    </p>
                    <div className="space-y-2">
                      {(PAGE_SUGGESTIONS[pathname] ?? DEFAULT_SUGGESTIONS).map((s) => (
                        <motion.button
                          key={s}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => dispatch({ type: "SET_INPUT", value: s })}
                          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-left text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all"
                        >
                          {s}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.length > 0 && <div className="mt-auto" />}

              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
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
                            if (part.type === "reasoning") {
                              return <ThinkingBlock key={i} text={(part as { type: string; text: string }).text} />
                            }

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
                              const toolCallId = part.toolCallId
                              const resolved = approvalResults[toolCallId]

                              if (resolved) {
                                return (
                                  <div key={i} className={cn("not-prose flex items-start gap-1.5 my-1.5 text-xs rounded-lg p-2", resolved.approved ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400")}>
                                    {resolved.approved
                                      ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                      : <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                                    <span>{resolved.message}</span>
                                  </div>
                                )
                              }

                              if (output?._approval_needed) {
                                return (
                                  <ToolApprovalCard
                                    key={i}
                                    toolName={String(output._tool ?? part.toolName)}
                                    description={String(output.message ?? "")}
                                    args={String(output._args ?? "{}")}
                                    onResult={(r) => dispatch({ type: "SET_APPROVAL", toolCallId, result: r })}
                                  />
                                )
                              }

                              if (output?._blocked) {
                                return (
                                  <div key={i} className="not-prose flex items-center gap-1.5 my-1.5 text-xs text-red-500/80">
                                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                                    <span className="font-mono">{String(output.message)}</span>
                                  </div>
                                )
                              }

                              if (part.toolName === "listProjects" && output && Array.isArray((output as { projects?: unknown }).projects)) {
                                const projects = (output as { projects: Array<{ name: string; total: number; done: number }> }).projects
                                return (
                                  <div key={i} className="not-prose my-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-xs">
                                    <p className="font-medium">Projects ({projects.length})</p>
                                    {projects.length === 0 ? (
                                      <p className="text-muted-foreground">No active projects.</p>
                                    ) : (
                                      <div className="mt-1 space-y-0.5 text-muted-foreground">
                                        {projects.map((p, idx) => (
                                          <p key={`${p.name}-${idx}`} className="truncate">• {p.name} — {p.done}/{p.total} done</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              }

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

              {/* Typing indicator */}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-start">
                  <div className="rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5">
                    <div className="flex gap-1">
                      {[0, 150, 300].map(delay => (
                        <span key={delay} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                  {error.message}
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-border p-3 shrink-0">
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <ModelSelector
                  provider={provider}
                  modelId={modelId}
                  onProviderChange={(p) => dispatch({ type: "CHANGE_PROVIDER", provider: p })}
                  onModelChange={(id) => dispatch({ type: "SET_MODEL", modelId: id })}
                />
                <div className="flex items-center gap-1">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => dispatch({ type: "TOGGLE_HISTORY" })}
                    title="Chat history"
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      showHistory
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={startNewChat}
                    title="New chat"
                    className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => dispatch({ type: "TOGGLE_AGENT" })}
                    title="Agent context, memory & permissions"
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      showAgentPanel
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </motion.button>
                  {isLoading && (
                    <button
                      type="button"
                      onClick={() => stop()}
                      className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => dispatch({ type: "SET_INPUT", value: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                  placeholder="Ask or tell me anything… (Enter to send, Shift+Enter for newline)"
                  rows={1}
                  style={{ resize: "none", overflow: "hidden" }}
                  className="w-full min-h-[72px] rounded-2xl border border-border bg-background pl-4 pr-12 py-3.5 text-sm shadow-sm outline-none focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10 transition-[border,box-shadow] placeholder:text-foreground/60 disabled:opacity-50 leading-relaxed"
                  disabled={isLoading}
                  autoComplete="off"
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
        </SheetContent>
      </Sheet>
    </>
  )
}
