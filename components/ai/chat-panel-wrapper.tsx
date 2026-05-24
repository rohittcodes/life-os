"use client"

import { usePathname } from "next/navigation"
import { ChatPanel } from "@/components/ai/chat-panel"

type Props = {
  hasApiKey: boolean
  defaultProvider: string
}

export function ChatPanelWrapper({ hasApiKey, defaultProvider }: Props) {
  const pathname = usePathname()
  if (pathname.startsWith("/chats")) return null
  return <ChatPanel hasApiKey={hasApiKey} defaultProvider={defaultProvider} />
}
