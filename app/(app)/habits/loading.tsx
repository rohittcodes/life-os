export default function HabitsLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-24 rounded-lg bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 h-4 w-32 rounded bg-muted" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-4">
              <div className="h-9 w-9 rounded-lg bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 rounded bg-muted" />
              </div>
              <div className="h-6 w-12 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 h-4 w-24 rounded bg-muted" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-8 rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}
