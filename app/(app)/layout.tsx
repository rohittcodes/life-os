import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { VaultProvider } from "@/contexts/vault-context"
import { VaultBanner } from "@/components/vault/vault-banner"
import { createClient } from "@/lib/supabase/server"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("encryption_enabled, encryption_salt, encryption_hint")
    .eq("id", user?.id)
    .single()

  // Load verifier from localStorage key (stored client-side) — server doesn't know the key
  // We pass salt + enabled flag to client; verifier stored in localStorage by settings page
  const encryptionEnabled = profile?.encryption_enabled ?? false
  const saltB64 = profile?.encryption_salt ?? ""

  return (
    <VaultProvider encryptionEnabled={encryptionEnabled}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </header>
          {/* Vault unlock banner — only visible when E2E is enabled */}
          {encryptionEnabled && (
            <VaultBannerLoader saltB64={saltB64} />
          )}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </VaultProvider>
  )
}

// Thin server component to load verifier from DB and pass to client banner
async function VaultBannerLoader({ saltB64 }: { saltB64: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("encryption_hint")
    .eq("id", user?.id)
    .single()

  // Verifier is stored in encryption_hint column (it's an encrypted blob, not a secret itself)
  return <VaultBanner saltB64={saltB64} verifier={profile?.encryption_hint ?? ""} />
}
