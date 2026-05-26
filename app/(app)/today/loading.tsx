export default function Loading() {
  return (
    <div className="space-y-5 p-4 md:p-6 max-w-2xl animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-lg bg-muted" />
          <div className="h-4 w-32 rounded-md bg-muted" />
        </div>
        <div className="h-8 w-28 rounded-xl bg-muted" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-16 rounded bg-muted" />
        {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-muted" />)}
      </div>
      <div className="h-48 rounded-xl bg-muted" />
      <div className="h-16 rounded-xl bg-muted" />
      <div className="space-y-2">
        {[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-muted" />)}
      </div>
    </div>
  )
}
