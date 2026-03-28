import { StatCardsSkeleton, ListSkeleton } from "@/components/layout/page-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function AgenteLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
      <StatCardsSkeleton count={4} />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card-premium overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-20 rounded-full" />)}
          </div>
          <ListSkeleton rows={6} />
        </div>
        <div className="card-premium p-5 space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
