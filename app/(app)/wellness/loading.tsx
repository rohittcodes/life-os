export default function Loading() {
  return (
    <div className="space-y-6 p-4 md:p-6 animate-pulse">
      <div className="space-y-1">
        <div className="h-8 w-28 rounded-lg bg-muted" />
        <div className="h-4 w-40 rounded bg-muted" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
            <div className="h-6 w-10 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 rounded bg-muted" />
              <div className="h-9 rounded-lg bg-muted" />
            </div>
          ))}
        </div>
        <div className="h-9 w-full rounded-lg bg-muted" />
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="h-4 w-32 rounded bg-muted mb-4" />
        <div className="h-40 rounded-lg bg-muted" />
      </div>
    </div>
  )
}
