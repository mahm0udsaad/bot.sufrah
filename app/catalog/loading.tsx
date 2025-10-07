export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-32 bg-muted rounded" />
      <div className="h-8 w-full max-w-md bg-muted rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <div className="aspect-square bg-muted rounded" />
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}


