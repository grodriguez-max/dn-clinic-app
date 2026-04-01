"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash2, Clock, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { ServiceModal, type ServiceRow } from "./service-modal"
import { deleteService, toggleService } from "./actions"
import { PackagesSection } from "./packages-section"
import type { PackageRow } from "./package-modal"

const CATEGORY_COLORS: Record<string, string> = {
  facial:       "bg-pink-100 text-pink-700",
  inyectables:  "bg-purple-100 text-purple-700",
  laser:        "bg-blue-100 text-blue-700",
  corporal:     "bg-emerald-100 text-emerald-700",
  capilar:      "bg-amber-100 text-amber-700",
  dental:       "bg-cyan-100 text-cyan-700",
  consulta:     "bg-gray-100 text-gray-600",
  otro:         "bg-gray-100 text-gray-600",
}

interface Props {
  clinicId: string
  initialServices: ServiceRow[]
  initialPackages: PackageRow[]
}

export function ServicesClient({ clinicId, initialServices, initialPackages }: Props) {
  const [services, setServices] = useState(initialServices)
  const [modal, setModal] = useState<{ open: boolean; service: ServiceRow | null }>({ open: false, service: null })
  const [, startTransition] = useTransition()

  const active   = services.filter((s) => s.is_active)
  const inactive = services.filter((s) => !s.is_active)

  function handleToggle(id: string, current: boolean) {
    setServices((ss) => ss.map((s) => s.id === id ? { ...s, is_active: !current } : s))
    startTransition(async () => { await toggleService(id, !current) })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    startTransition(async () => {
      await deleteService(id)
      setServices((ss) => ss.filter((s) => s.id !== id))
    })
  }

  function handleSaved() { window.location.reload() }

  function ServiceCard({ svc }: { svc: ServiceRow }) {
    return (
      <div className={cn(
        "bg-white border border-border rounded-xl p-4 flex items-center gap-4 transition-all",
        !svc.is_active && "opacity-50"
      )}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{svc.name}</p>
            <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", CATEGORY_COLORS[svc.category ?? "otro"] ?? CATEGORY_COLORS.otro)}>
              {svc.category ?? "otro"}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{svc.duration_minutes} min</span>
            <span className="flex items-center gap-1"><Tag className="w-3 h-3" />₡{svc.price.toLocaleString("es-CR")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={svc.is_active}
            onCheckedChange={() => handleToggle(svc.id, svc.is_active)}
          />
          <button
            onClick={() => setModal({ open: true, service: svc })}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(svc.id, svc.name)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{active.length}</span> activos · {inactive.length} inactivos
        </p>
        <Button onClick={() => setModal({ open: true, service: null })} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Nuevo servicio
        </Button>
      </div>

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activos</p>
          {active.map((svc) => <ServiceCard key={svc.id} svc={svc} />)}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Inactivos</p>
          {inactive.map((svc) => <ServiceCard key={svc.id} svc={svc} />)}
        </div>
      )}

      {services.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No hay servicios configurados</p>
        </div>
      )}

      <ServiceModal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSaved={handleSaved}
        clinicId={clinicId}
        service={modal.service}
      />

      {/* ── Paquetes ─────────────────────────────── */}
      <div className="pt-6 border-t border-border">
        <PackagesSection
          clinicId={clinicId}
          initialPackages={initialPackages}
          services={services.map((s) => ({ id: s.id, name: s.name, price: s.price }))}
        />
      </div>
    </div>
  )
}
