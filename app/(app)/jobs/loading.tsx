export default function JobsLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-16 rounded-lg bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
        </div>
        <div className="h-9 w-28 rounded-md bg-muted" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="h-8 w-8 rounded bg-muted mb-1" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, col) => (
          <div key={col} className="rounded-xl border border-border bg-card/50 p-3">
            <div className="h-4 w-20 rounded bg-muted mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-3 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
