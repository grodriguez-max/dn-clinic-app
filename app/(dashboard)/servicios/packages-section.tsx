"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash2, Package, Tag, CalendarDays, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { PackageModal, type PackageRow } from "./package-modal"
import { deletePackage, togglePackage } from "./package-actions"

interface Service { id: string; name: string; price: number }

interface Props {
  clinicId: string
  initialPackages: PackageRow[]
  services: Service[]
}

export function PackagesSection({ clinicId, initialPackages, services }: Props) {
  const [packages, setPackages] = useState(initialPackages)
  const [modal, setModal] = useState<{ open: boolean; pkg: PackageRow | null }>({ open: false, pkg: null })
  const [, startTransition] = useTransition()

  const active   = packages.filter((p) => p.is_active)
  const inactive = packages.filter((p) => !p.is_active)

  function handleToggle(id: string, current: boolean) {
    setPackages((ps) => ps.map((p) => p.id === id ? { ...p, is_active: !current } : p))
    startTransition(async () => { await togglePackage(id, !current) })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar paquete "${name}"?`)) return
    startTransition(async () => {
      await deletePackage(id)
      setPackages((ps) => ps.filter((p) => p.id !== id))
    })
  }

  function handleSaved() { window.location.reload() }

  function serviceNameById(serviceId: string) {
    return services.find((s) => s.id === serviceId)?.name ?? "—"
  }

  function servicePriceById(serviceId: string) {
    return services.find((s) => s.id === serviceId)?.price ?? 0
  }

  function PackageCard({ pkg }: { pkg: PackageRow }) {
    const svcPrice = servicePriceById(pkg.service_id)
    const originalTotal = svcPrice * pkg.total_sessions
    const pricePerSession = pkg.total_sessions > 0 ? pkg.price / pkg.total_sessions : 0
    const savings = originalTotal > 0 ? originalTotal - pkg.price : 0

    return (
      <div className={cn(
        "bg-white border border-border rounded-xl p-4 flex items-center gap-4 transition-all",
        !pkg.is_active && "opacity-50"
      )}>
        <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{pkg.name}</p>
            {pkg.discount_percentage > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
                -{pkg.discount_percentage}%
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{serviceNameById(pkg.service_id)}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {pkg.total_sessions} sesiones
            </span>
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              ₡{pkg.price.toLocaleString("es-CR")} total
            </span>
            <span className="flex items-center gap-1 text-muted-foreground/70">
              ₡{Math.round(pricePerSession).toLocaleString("es-CR")}/sesión
            </span>
            {savings > 0 && (
              <span className="text-emerald-600 font-medium">
                Ahorro ₡{Math.round(savings).toLocaleString("es-CR")}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {pkg.validity_days} días
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={pkg.is_active}
            onCheckedChange={() => handleToggle(pkg.id, pkg.is_active)}
          />
          <button
            onClick={() => setModal({ open: true, pkg })}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(pkg.id, pkg.name)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Paquetes</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-medium text-foreground">{active.length}</span> activos · {inactive.length} inactivos
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, pkg: null })} size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-1.5" />
          Nuevo paquete
        </Button>
      </div>

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activos</p>
          {active.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Inactivos</p>
          {inactive.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)}
        </div>
      )}

      {packages.length === 0 && (
        <div className="text-center py-10 border border-dashed border-border rounded-xl text-muted-foreground">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin paquetes configurados</p>
          <p className="text-xs mt-1">Creá un paquete para vender múltiples sesiones con descuento</p>
        </div>
      )}

      <PackageModal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSaved={handleSaved}
        clinicId={clinicId}
        pkg={modal.pkg}
        services={services}
      />
    </div>
  )
}
