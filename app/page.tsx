import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Wallet, Target, Brain, Timer, Globe, Smartphone } from "lucide-react"

export const metadata = {
  title: "Life OS — Your personal operating system",
  description: "Habits, finance, goals, and daily reflection — all in one private dashboard.",
}

// Row 1: 4 equal cols (span-3 each). Row 2: 3 unequal (span-5, span-4, span-3)
const row1 = [
  { icon: CheckCircle2, title: "Habit tracking",  desc: "Streaks, patterns, and a 30-day heatmap.",            glow: "oklch(0.72 0.19 142 / 0.18)" },
  { icon: Wallet,       title: "Finance",          desc: "Log income & expenses, set budgets, track trends.",   glow: "oklch(0.72 0.17 165 / 0.18)" },
  { icon: Target,       title: "Goals",            desc: "Milestones, deadlines, linked to your daily todos.",  glow: "oklch(0.65 0.22 27  / 0.18)" },
  { icon: Brain,        title: "AI assistant",     desc: "Bring your key. Anthropic, OpenAI, Gemini, Groq.",   glow: "oklch(0.68 0.20 290 / 0.18)" },
]
const row2 = [
  { icon: Timer,        title: "Focus timer",      desc: "Log deep work sessions by project and see weekly hours at a glance.",  glow: "oklch(0.70 0.18 240 / 0.18)", span: "col-span-5" },
  { icon: Globe,        title: "Blog",             desc: "Rich editor, full OG metadata, your own domain.",                      glow: "oklch(0.72 0.15 210 / 0.18)", span: "col-span-4" },
  { icon: Smartphone,   title: "PWA",              desc: "Installs on any device. Works offline.",                               glow: "oklch(0.70 0.16 55  / 0.18)", span: "col-span-3" },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{ fontFamily: "var(--font-lato), sans-serif" }}
    >
      {/* Nav */}
      <nav className="flex h-14 items-center border-b border-border px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icon" alt="Life OS" className="h-6 w-6 rounded-md" />
            <span className="text-sm font-bold">Life OS</span>
          </div>
          <Link href="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl">

          {/* Hero */}
          <div className="px-6 pt-20 pb-14 text-center">
            {/* <div className="mb-7 flex justify-center">
              <img src="/icon" alt="Life OS" className="h-14 w-14 rounded-2xl" />
            </div> */}
            <h1 className="text-5xl font-black tracking-tight md:text-6xl">
              Your personal<br />operating system.
            </h1>
            <p className="mt-5 text-lg font-light text-muted-foreground leading-relaxed">
              Habits, finance, goals, projects, and daily reflection —<br className="hidden sm:block" />
              all in one private dashboard you open every morning.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-8 py-3 text-sm font-bold text-background hover:opacity-90 transition-opacity"
              >
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-border px-8 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Feature grid — border-top + border-left on container, border-right + border-bottom on each cell */}
          <div className="border-t border-l border-border">

            {/* Row 1 — 4 equal columns */}
            <div className="grid grid-cols-4">
              {row1.map((f) => {
                const Icon = f.icon
                return (
                  <div key={f.title} className="group relative overflow-hidden border-r border-b border-border p-5">
                    {/* Hover glow blob */}
                    <div
                      className="pointer-events-none absolute left-1/2 top-0 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ backgroundColor: f.glow }}
                    />
                    <Icon className="relative mb-3 h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:text-foreground group-hover:-translate-y-0.5" />
                    <p className="relative text-sm font-semibold mb-1">{f.title}</p>
                    <p className="relative text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                )
              })}
            </div>

            {/* Row 2 — 3 unequal columns (5 + 4 + 3 = 12 twelfths) */}
            <div className="grid grid-cols-12">
              {row2.map((f) => {
                const Icon = f.icon
                return (
                  <div key={f.title} className={`group relative overflow-hidden border-r border-b border-border p-5 ${f.span}`}>
                    <div
                      className="pointer-events-none absolute left-1/2 top-0 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ backgroundColor: f.glow }}
                    />
                    <Icon className="relative mb-3 h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:text-foreground group-hover:-translate-y-0.5" />
                    <p className="relative text-sm font-semibold mb-1">{f.title}</p>
                    <p className="relative text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                )
              })}
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-5">
        <div className="mx-auto max-w-3xl flex items-center justify-center">
          <p className="text-xs text-muted-foreground">
            Made with ❤️ by{" "}
            <a
              href="https://rohitt.codes"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:underline"
            >
              rohitt.codes
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
