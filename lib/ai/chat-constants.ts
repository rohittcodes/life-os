export type Provider = "anthropic" | "openai" | "gemini" | "groq"

export const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
  groq: "Groq",
}

export const MODELS: Record<Provider, { id: string; label: string }[]> = {
  anthropic: [
    { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5 · Fast" },
    { id: "claude-sonnet-4-5-20251001", label: "Sonnet 4.5" },
    { id: "claude-opus-4-5", label: "Opus 4.5 · Best" },
  ],
  openai: [
    { id: "gpt-4o-mini", label: "GPT-4o Mini · Fast" },
    { id: "gpt-4o", label: "GPT-4o" },
    { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
  ],
  gemini: [
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash · Fast" },
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
  groq: [
    { id: "openai/gpt-oss-20b", label: "GPT OSS 20B · 1000t/s" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B · Fast" },
    { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout · Vision" },
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    { id: "openai/gpt-oss-120b", label: "GPT OSS 120B" },
    { id: "qwen/qwen3-32b", label: "Qwen3 32B · Reasoning" },
    { id: "groq/compound-mini", label: "Compound Mini · Agentic" },
    { id: "groq/compound", label: "Compound · Agentic" },
  ],
}

export const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash",
  groq: "openai/gpt-oss-20b",
}

export type ParsedSegment =
  | { kind: "thinking"; text: string }
  | { kind: "text"; text: string }

export function parseThinking(raw: string): ParsedSegment[] {
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
