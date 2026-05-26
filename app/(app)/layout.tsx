import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { VaultProvider } from "@/contexts/vault-context"
import { VaultBanner } from "@/components/vault/vault-banner"
import { ChatPanelWrapper } from "@/components/ai/chat-panel-wrapper"
import { CommandPalette } from "@/components/command-palette"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { createClient } from "@/lib/supabase/server"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("encryption_enabled, encryption_salt, encryption_hint, ai_provider, ai_anthropic_key, ai_openai_key, ai_gemini_key, ai_groq_key")
    .eq("id", user?.id)
    .single()

  const encryptionEnabled = profile?.encryption_enabled ?? false
  const saltB64 = profile?.encryption_salt ?? ""
  const hasAiKey = !!(profile?.ai_anthropic_key || profile?.ai_openai_key || profile?.ai_gemini_key || profile?.ai_groq_key)
  const defaultProvider = (profile?.ai_provider ?? "anthropic") as string

  return (
    <VaultProvider encryptionEnabled={encryptionEnabled}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {/* Header — NOT sticky; scroll is contained inside <main> below */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b-2 border-border/70 bg-background px-5">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="mr-1 h-5 opacity-40" />
            <div className="ml-auto lg:hidden">
              <ThemeToggle className="h-9 w-9" />
            </div>
          </header>

          {encryptionEnabled && (
            <VaultBannerLoader saltB64={saltB64} />
          )}

          {/* All scrolling happens here — inside the rounded inset */}
          <main className="flex-1 overflow-y-auto pb-24">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
      <ChatPanelWrapper hasApiKey={hasAiKey} defaultProvider={defaultProvider} />
      <CommandPalette />
    </VaultProvider>
  )
}

async function VaultBannerLoader({ saltB64 }: { saltB64: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("encryption_hint")
    .eq("id", user?.id)
    .single()
  return <VaultBanner saltB64={saltB64} verifier={profile?.encryption_hint ?? ""} />
}
