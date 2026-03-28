import Link from "next/link"
import { FileQuestion, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <h1 className="text-4xl font-bold font-numeric text-muted-foreground/30 mb-2">404</h1>
        <h2 className="text-lg font-semibold mb-2">Página no encontrada</h2>
        <p className="text-sm text-muted-foreground mb-6">
          La página que buscás no existe o fue movida.
        </p>
        <Button asChild>
          <Link href="/dashboard">
            <Home className="w-4 h-4 mr-2" />
            Ir al dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
