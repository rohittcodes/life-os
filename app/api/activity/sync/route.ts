import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

interface AppEntry {
  app_name: string
  duration_seconds: number
  category?: string
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  productivity: ["code", "cursor", "visual studio", "vscode", "intellij", "webstorm", "xcode", "android studio", "vim", "neovim", "emacs", "terminal", "iterm", "warp", "hyper", "figma", "notion", "obsidian", "linear", "jira", "postman", "insomnia", "datagrip", "tableplus"],
  browser: ["chrome", "firefox", "safari", "edge", "brave", "arc", "opera", "vivaldi"],
  communication: ["slack", "discord", "teams", "zoom", "meet", "skype", "whatsapp", "telegram", "messages", "mail", "outlook", "gmail", "spark", "airmail"],
  entertainment: ["spotify", "youtube", "netflix", "prime video", "vlc", "mpv", "steam", "epicgames", "music", "podcasts"],
  system: ["finder", "explorer", "spotlight", "alfred", "raycast", "settings", "system preferences", "activity monitor", "task manager"],
}

// Android package name → friendly category hints
const ANDROID_PACKAGE_CATS: Record<string, string> = {
  "com.google.android.chrome": "browser",
  "com.android.chrome": "browser",
  "org.mozilla.firefox": "browser",
  "com.microsoft.emmx": "browser",
  "com.brave.browser": "browser",
  "com.google.android.gm": "communication",
  "com.microsoft.teams": "communication",
  "com.slack": "communication",
  "com.discord": "communication",
  "com.whatsapp": "communication",
  "org.telegram.messenger": "communication",
  "com.spotify.music": "entertainment",
  "com.google.android.youtube": "entertainment",
  "com.netflix.mediaclient": "entertainment",
  "com.amazon.avod.thirdpartyclient": "entertainment",
  "com.valvesoftware.android.steam.community": "entertainment",
}

export function categorize(appName: string): string {
  const lower = appName.toLowerCase()
  // Check Android package map first
  if (ANDROID_PACKAGE_CATS[lower]) return ANDROID_PACKAGE_CATS[lower]
  // Check keyword categories
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return cat
  }
  return "other"
}

// Resolve Android package names to friendly labels (stored as app_name after this)
const ANDROID_PACKAGES: Record<string, string> = {
  "com.google.android.chrome": "Chrome",
  "com.android.chrome": "Chrome",
  "org.mozilla.firefox": "Firefox",
  "com.microsoft.emmx": "Edge",
  "com.brave.browser": "Brave",
  "com.google.android.gm": "Gmail",
  "com.microsoft.teams": "Teams",
  "com.slack": "Slack",
  "com.discord": "Discord",
  "com.whatsapp": "WhatsApp",
  "org.telegram.messenger": "Telegram",
  "com.spotify.music": "Spotify",
  "com.google.android.youtube": "YouTube",
  "com.netflix.mediaclient": "Netflix",
  "com.amazon.avod.thirdpartyclient": "Prime Video",
  "com.google.android.apps.maps": "Maps",
  "com.google.android.dialer": "Phone",
  "com.google.android.messaging": "Messages",
  "com.android.settings": "Settings",
  "com.google.android.googlequicksearchbox": "Google Search",
  "com.google.android.apps.photos": "Photos",
  "com.instagram.android": "Instagram",
  "com.twitter.android": "X (Twitter)",
  "com.reddit.frontpage": "Reddit",
  "com.linkedin.android": "LinkedIn",
  "com.phonepe.app": "PhonePe",
  "com.google.android.apps.nbu.paisa.user": "Google Pay",
  "net.one97.paytm": "Paytm",
  "in.amazon.mShop.android.shopping": "Amazon",
  "com.flipkart.android": "Flipkart",
}

function resolveAppName(raw: string): string {
  if (ANDROID_PACKAGES[raw]) return ANDROID_PACKAGES[raw]
  // Generic package name cleanup: com.company.appname → Appname
  if (/^[a-z]+(\.[a-z0-9_]+)+$/.test(raw)) {
    const parts = raw.split(".")
    const last = parts[parts.length - 1]
    return last.charAt(0).toUpperCase() + last.slice(1)
  }
  return raw
}

export async function POST(req: Request) {
  let userId: string | null = null

  const authHeader = req.headers.get("authorization")

  if (authHeader?.startsWith("Bearer ")) {
    // Token-based auth for automated scripts (Android Termux, cron, etc.)
    const token = authHeader.slice(7).trim()
    const admin = createAdminClient()
    const { data } = await admin
      .from("user_profiles")
      .select("id")
      .eq("activity_sync_token", token)
      .single()
    if (data) userId = data.id
  } else {
    // Session-based auth (browser)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
  }

  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  let body: { date?: string; source?: string; apps?: AppEntry[] }
  try { body = await req.json() }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }) }

  const { date, source, apps } = body
  if (!date || !source || !Array.isArray(apps) || apps.length === 0) {
    return Response.json({ error: "Missing date, source, or apps" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Merge entries that resolve to the same app name (e.g. two Chrome package variants)
  const merged = new Map<string, { duration_seconds: number; category: string }>()
  for (const a of apps) {
    const resolvedName = resolveAppName(a.app_name)
    const existing = merged.get(resolvedName)
    if (existing) {
      existing.duration_seconds += Math.max(0, Math.round(a.duration_seconds))
    } else {
      merged.set(resolvedName, {
        duration_seconds: Math.max(0, Math.round(a.duration_seconds)),
        category: a.category ?? categorize(a.app_name),
      })
    }
  }

  const rows = Array.from(merged.entries()).map(([app_name, { duration_seconds, category }]) => ({
    user_id: userId,
    log_date: date,
    source,
    app_name,
    duration_seconds,
    category,
    synced_at: new Date().toISOString(),
  }))

  const { error } = await admin
    .from("screen_time_entries")
    .upsert(rows, { onConflict: "user_id,log_date,source,app_name" })

  if (error) {
    console.error("[activity/sync] upsert error:", error.message, error.code)
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ ok: true, synced: rows.length })
}
