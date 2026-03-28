import { StatCardsSkeleton, ListSkeleton } from "@/components/layout/page-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function FacuracionLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-7 w-40 rounded-full" />
          <Skeleton className="h-7 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <StatCardsSkeleton count={4} />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card-premium overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><Skeleton className="h-4 w-24" /></div>
          <ListSkeleton rows={7} />
        </div>
        <div className="card-premium flex items-center justify-center min-h-[300px]">
          <Skeleton className="h-32 w-32 rounded-full opacity-20" />
        </div>
      </div>
    </div>
  )
}
