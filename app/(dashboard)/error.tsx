"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[dashboard error]", error)
  }, [error])

  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>
      <h2 className="text-base font-semibold mb-1">Algo salió mal</h2>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        {error.message?.includes("JSON") || error.message?.includes("fetch")
          ? "Error de conexión. Verificá tu internet e intentá de nuevo."
          : "Ocurrió un error inesperado. Ya fue registrado automáticamente."}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground font-mono mb-4">ID: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
          <Home className="w-3.5 h-3.5 mr-1.5" />Dashboard
        </Button>
        <Button size="sm" onClick={reset}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Reintentar
        </Button>
      </div>
    </div>
  )
}
