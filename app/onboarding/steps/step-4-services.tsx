"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2 } from "lucide-react"
import type { WizardService, WizardProfessional } from "../types"
import { getTemplatesForSpecialties } from "../service-templates"

interface Props {
  services: WizardService[]
  professionals: WizardProfessional[]
  onNext: (services: WizardService[]) => void
  onBack: () => void
  loading: boolean
}

function newService(profTempIds: string[]): WizardService {
  return {
    tempId: `svc-${Date.now()}-${Math.random()}`,
    name: "",
    category: "otro",
    duration_minutes: 60,
    price: 0,
    professionalTempIds: profTempIds,
    selected: true,
  }
}

export function Step4Services({ services: initial, professionals, onNext, onBack, loading }: Props) {
  const [services, setServices] = useState<WizardService[]>(() => {
    if (initial.length > 0) return initial
    const specialties = Array.from(new Set(professionals.map((p) => p.specialty)))
    const templates = getTemplatesForSpecialties(specialties)
    return templates.map((t) => ({
      ...t,
      professionalTempIds: professionals
        .filter((p) => {
          const sp = p.specialty
          if (sp === "dermatologia" && ["facial", "inyectables"].includes(t.category)) return true
          if (sp === "odontologia" && t.category === "dental") return true
          if (sp === "cosmetologia" && ["laser", "capilar", "corporal"].includes(t.category)) return true
          if (sp === "cirugia_plastica" && t.category === "consulta") return true
          return false
        })
        .map((p) => p.tempId),
    }))
  })

  function toggle(tempId: string) {
    setServices((ss) => ss.map((s) => s.tempId === tempId ? { ...s, selected: !s.selected } : s))
  }

  function update(tempId: string, field: keyof WizardService, value: unknown) {
    setServices((ss) => ss.map((s) => s.tempId === tempId ? { ...s, [field]: value } : s))
  }

  function remove(tempId: string) {
    setServices((ss) => ss.filter((s) => s.tempId !== tempId))
  }

  function addCustom() {
    setServices((ss) => [...ss, newService(professionals.map((p) => p.tempId))])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext(services)
  }

  const selected = services.filter((s) => s.selected)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Marca los servicios que ofreces. Podes editar nombre, duracion y precio.
        <span className="font-medium text-foreground"> {selected.length} seleccionados.</span>
      </p>

      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {services.map((svc) => (
          <div
            key={svc.tempId}
            className={`bg-white border rounded-xl p-4 transition-colors ${svc.selected ? "border-primary/30" : "border-border opacity-60"}`}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={svc.selected}
                onCheckedChange={() => toggle(svc.tempId)}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-3">
                <Input
                  value={svc.name}
                  onChange={(e) => update(svc.tempId, "name", e.target.value)}
                  placeholder="Nombre del servicio"
                  className="h-8 text-sm font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 bg-transparent"
                  disabled={!svc.selected}
                />
                {svc.selected && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground">Duracion (min)</label>
                      <Input
                        type="number"
                        value={svc.duration_minutes}
                        onChange={(e) => update(svc.tempId, "duration_minutes", Number(e.target.value))}
                        className="h-7 text-xs"
                        min={5}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">Precio (CRC)</label>
                      <Input
                        type="number"
                        value={svc.price}
                        onChange={(e) => update(svc.tempId, "price", Number(e.target.value))}
                        className="h-7 text-xs"
                        min={0}
                      />
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(svc.tempId)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addCustom}
        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="w-4 h-4" />
        Agregar servicio personalizado
      </button>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">Anterior</Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? "Guardando..." : "Siguiente →"}
        </Button>
      </div>
    </form>
  )
}
