import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Settings" }
import { ApiKeysPanel } from "@/components/settings/api-keys-panel"
import { AiSettings } from "@/components/settings/ai-settings"
import { PwaSettings } from "@/components/settings/pwa-settings"
import { AuthorSettings } from "@/components/settings/author-settings"
import { CurrencySettings } from "@/components/settings/currency-settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ApiKey } from "@/lib/types"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: keys = [] }, { data: profile }] = await Promise.all([
    supabase.from("api_keys").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
    supabase.from("user_profiles").select("ai_provider, ai_anthropic_key, ai_openai_key, ai_gemini_key, ai_groq_key, display_name, author_bio, avatar_url, website_url, username, currency").eq("id", user!.id).single(),
  ])

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Account, API access, and preferences</p>
      </div>

      <Tabs defaultValue="ai">
        <TabsList>
          <TabsTrigger value="ai">AI Assistant</TabsTrigger>
          <TabsTrigger value="app">App</TabsTrigger>
          <TabsTrigger value="author">Author</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-6">
          <AiSettings
            provider={profile?.ai_provider ?? "anthropic"}
            savedKeys={{
              anthropic: !!profile?.ai_anthropic_key,
              openai: !!profile?.ai_openai_key,
              gemini: !!profile?.ai_gemini_key,
              groq: !!profile?.ai_groq_key,
            }}
          />
        </TabsContent>

        <TabsContent value="app" className="mt-6">
          <PwaSettings />
        </TabsContent>

        <TabsContent value="author" className="mt-6">
          <AuthorSettings
            displayName={profile?.display_name ?? ""}
            authorBio={profile?.author_bio ?? ""}
            avatarUrl={profile?.avatar_url ?? ""}
            websiteUrl={profile?.website_url ?? ""}
            username={profile?.username ?? ""}
          />
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <CurrencySettings currency={profile?.currency ?? "INR"} />
        </TabsContent>

        <TabsContent value="api" className="mt-6 space-y-4">
          <div className="space-y-1">
            <h2 className="font-medium">API Keys</h2>
            <p className="text-sm text-muted-foreground">
              Generate keys to access your data via the API or connect AI agents via the MCP server.
              Pass the key as <code className="font-mono text-xs">Authorization: Bearer &lt;key&gt;</code>.
            </p>
            <div className="mt-1 rounded-lg bg-muted px-3 py-2 font-mono text-xs space-y-1">
              <p className="text-muted-foreground font-sans text-[11px] font-medium mb-1">Blog API</p>
              <p>GET /api/blog</p>
              <p>GET /api/blog/:slug</p>
              <p className="text-muted-foreground font-sans text-[11px] font-medium mt-2 mb-1">MCP Server (AI agents)</p>
              <p>POST /api/mcp  <span className="text-muted-foreground">— JSON-RPC 2.0</span></p>
            </div>
          </div>
          <ApiKeysPanel keys={(keys ?? []) as ApiKey[]} />
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium">User ID</p>
              <p className="font-mono text-xs text-muted-foreground">{user?.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Joined</p>
              <p className="text-sm text-muted-foreground">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
