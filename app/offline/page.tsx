import Link from "next/link"

export const metadata = { title: "Offline" }

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-lg font-semibold">
          OS
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">You are offline</h1>
          <p className="text-sm text-muted-foreground">
            Cached Life OS pages will keep working. Reconnect to sync fresh data.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}
