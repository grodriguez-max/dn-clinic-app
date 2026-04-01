"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash2, Stethoscope } from "lucide-react"
import { cn, getInitials } from "@/lib/utils"
import { ProfessionalModal, type ProfessionalRow } from "./professional-modal"
import { deleteProfessional, toggleProfessional } from "./actions"

interface Service { id: string; name: string; price: number }

interface Props {
  clinicId: string
  initialProfessionals: ProfessionalRow[]
  services: Service[]
  isOwner?: boolean
}

export function TeamClient({ clinicId, initialProfessionals, services, isOwner = false }: Props) {
  const [professionals, setProfessionals] = useState(initialProfessionals)
  const [modal, setModal] = useState<{ open: boolean; professional: ProfessionalRow | null }>({ open: false, professional: null })
  const [, startTransition] = useTransition()

  const active   = professionals.filter((p) => p.is_active)
  const inactive = professionals.filter((p) => !p.is_active)

  function handleToggle(id: string, current: boolean) {
    setProfessionals((ps) => ps.map((p) => p.id === id ? { ...p, is_active: !current } : p))
    startTransition(async () => { await toggleProfessional(id, !current) })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return
    startTransition(async () => {
      await deleteProfessional(id)
      setProfessionals((ps) => ps.filter((p) => p.id !== id))
    })
  }

  function handleSaved() { window.location.reload() }

  function ProfCard({ prof }: { prof: ProfessionalRow }) {
    return (
      <div className={cn(
        "bg-white border border-border rounded-xl p-4 flex items-center gap-4 transition-all",
        !prof.is_active && "opacity-50"
      )}>
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shrink-0">
          {prof.photo_url ? (
            <img src={prof.photo_url} alt={prof.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-primary">{getInitials(prof.name)}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{prof.name}</p>
          {prof.specialty && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Stethoscope className="w-3 h-3" />
              {prof.specialty}
            </p>
          )}
          {prof.bio && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{prof.bio}</p>
          )}
          {(prof as any).default_commission_percentage > 0 && (
            <p className="text-[11px] text-violet-600 mt-0.5">Comisión {(prof as any).default_commission_percentage}%</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={prof.is_active}
            onCheckedChange={() => handleToggle(prof.id, prof.is_active)}
          />
          <button
            onClick={() => setModal({ open: true, professional: prof })}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(prof.id, prof.name)}
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
          <span className="font-medium text-foreground">{active.length}</span> activos
          {inactive.length > 0 && ` · ${inactive.length} inactivos`}
        </p>
        <Button onClick={() => setModal({ open: true, professional: null })} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Agregar profesional
        </Button>
      </div>

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activos</p>
          {active.map((p) => <ProfCard key={p.id} prof={p} />)}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Inactivos</p>
          {inactive.map((p) => <ProfCard key={p.id} prof={p} />)}
        </div>
      )}

      {professionals.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No hay profesionales registrados</p>
        </div>
      )}

      <ProfessionalModal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSaved={handleSaved}
        clinicId={clinicId}
        professional={modal.professional}
        isOwner={isOwner}
        services={services}
      />
    </div>
  )
}
