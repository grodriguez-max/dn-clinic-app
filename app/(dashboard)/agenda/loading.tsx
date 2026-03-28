import { CalendarSkeleton } from "@/components/layout/page-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function AgendaLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <div className="card-premium overflow-hidden">
        <CalendarSkeleton />
      </div>
    </div>
  )
}
