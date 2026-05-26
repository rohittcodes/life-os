export default function TodosLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-24 rounded-lg bg-muted" />
          <div className="h-4 w-48 rounded bg-muted" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="h-8 w-8 rounded bg-muted mb-1" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="h-9 flex-1 rounded-md bg-muted" />
          <div className="h-9 w-16 rounded-md bg-muted" />
        </div>
      </div>

      <div className="space-y-4">
        {["Overdue", "Today", "Upcoming"].map((section) => (
          <div key={section}>
            <div className="h-4 w-20 rounded bg-muted mb-2" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="h-4 w-4 rounded-full bg-muted shrink-0" />
                  <div className="h-4 flex-1 rounded bg-muted" />
                  <div className="h-3 w-16 rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
