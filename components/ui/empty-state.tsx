import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
  size?: "sm" | "md" | "lg"
}

export function EmptyState({ icon: Icon, title, description, action, className, size = "md" }: EmptyStateProps) {
  const sizes = {
    sm: { icon: "w-8 h-8",  title: "text-sm",   desc: "text-xs",  padding: "py-8" },
    md: { icon: "w-10 h-10", title: "text-sm",   desc: "text-xs",  padding: "py-12" },
    lg: { icon: "w-12 h-12", title: "text-base", desc: "text-sm",  padding: "py-16" },
  }
  const s = sizes[size]

  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-6", s.padding, className)}>
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className={cn(s.icon, "text-muted-foreground/50")} />
      </div>
      <p className={cn("font-medium text-foreground", s.title)}>{title}</p>
      {description && (
        <p className={cn("text-muted-foreground mt-1 max-w-xs", s.desc)}>{description}</p>
      )}
      {action && (
        <Button variant="outline" size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
