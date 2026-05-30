export default function Loading() {
  return (
    <div className="space-y-6 p-4 md:p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-8 w-20 rounded-lg bg-muted" />
          <div className="h-4 w-36 rounded bg-muted" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-muted" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
            <div className="h-7 w-8 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Goal cards */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="h-5 w-48 rounded bg-muted" />
                <div className="h-3 w-32 rounded bg-muted" />
              </div>
              <div className="h-6 w-16 rounded-full bg-muted" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <div className="h-3 w-16 rounded bg-muted" />
                <div className="h-3 w-8 rounded bg-muted" />
              </div>
              <div className="h-2 rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
