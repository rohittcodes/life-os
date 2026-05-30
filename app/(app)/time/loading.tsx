export default function Loading() {
  return (
    <div className="space-y-6 p-4 md:p-6 animate-pulse">
      <div className="space-y-1">
        <div className="h-8 w-36 rounded-lg bg-muted" />
        <div className="h-4 w-48 rounded bg-muted" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
            <div className="h-7 w-14 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Timer */}
      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
        <div className="h-10 w-24 rounded-xl bg-muted" />
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="h-4 w-40 rounded bg-muted mb-4" />
        <div className="h-48 rounded-lg bg-muted" />
      </div>

      {/* Session list */}
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-muted" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-muted shrink-0" />
            <div className="h-4 flex-1 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-3 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
