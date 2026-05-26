"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"

const ChatPanel = dynamic(
  () => import("@/components/ai/chat-panel").then((m) => ({ default: m.ChatPanel })),
  { ssr: false }
)

type Props = {
  hasApiKey: boolean
  defaultProvider: string
}

export function ChatPanelWrapper({ hasApiKey, defaultProvider }: Props) {
  const pathname = usePathname()
  if (pathname.startsWith("/chats")) return null
  return <ChatPanel hasApiKey={hasApiKey} defaultProvider={defaultProvider} />
}
