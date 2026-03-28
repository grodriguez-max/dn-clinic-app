import { Skeleton } from "@/components/ui/skeleton"

// ── Stat cards row ─────────────────────────────────────────────────────────────
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-premium p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-2 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── List skeleton ─────────────────────────────────────────────────────────────
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  )
}

// ── Table skeleton ────────────────────────────────────────────────────────────
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex gap-4 px-4 py-2.5 bg-muted/50 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-border">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={`h-3.5 flex-1 ${j === 0 ? "max-w-[160px]" : ""}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Chart skeleton ────────────────────────────────────────────────────────────
export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="p-4">
      <Skeleton className="h-4 w-40 mb-4" />
      <div className="flex items-end gap-2" style={{ height }}>
        {Array.from({ length: 12 }).map((_, i) => {
          const h = Math.floor(Math.random() * 70 + 20)
          return <Skeleton key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%` }} />
        })}
      </div>
    </div>
  )
}

// ── Calendar skeleton ─────────────────────────────────────────────────────────
export function CalendarSkeleton() {
  return (
    <div className="h-full min-h-[500px] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="text-center py-2">
            <Skeleton className="h-3 w-6 mx-auto" />
          </div>
        ))}
      </div>
      {/* Time slots */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-10 w-12 shrink-0 rounded" />
            <div className="flex-1 grid grid-cols-6 gap-1">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className={`h-10 rounded ${Math.random() > 0.7 ? "opacity-100" : "opacity-20"}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Generic page skeleton ─────────────────────────────────────────────────────
export function DashboardPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <StatCardsSkeleton count={4} />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card-premium overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <Skeleton className="h-4 w-32" />
          </div>
          <ListSkeleton rows={5} />
        </div>
        <div className="card-premium overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <Skeleton className="h-4 w-32" />
          </div>
          <ChartSkeleton />
        </div>
      </div>
    </div>
  )
}

// ── List page skeleton (pacientes, equipo, servicios) ─────────────────────────
export function ListPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 max-w-xs rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <div className="card-premium overflow-hidden">
        <TableSkeleton rows={8} cols={5} />
      </div>
    </div>
  )
}

// ── Metrics page skeleton ─────────────────────────────────────────────────────
export function MetricsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-lg" />)}
        </div>
      </div>
      <StatCardsSkeleton count={4} />
      {/* Tabs skeleton */}
      <div className="space-y-1">
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-24 rounded-md" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4 pt-4">
          <div className="card-premium overflow-hidden"><ChartSkeleton height={220} /></div>
          <div className="card-premium overflow-hidden"><ChartSkeleton height={220} /></div>
        </div>
      </div>
    </div>
  )
}
