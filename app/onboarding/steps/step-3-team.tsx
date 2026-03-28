"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import type { WizardProfessional, BusinessHours } from "../types"
import { DEFAULT_BUSINESS_HOURS, DAY_LABELS, SPECIALTY_OPTIONS } from "../types"

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`)

function newProfessional(): WizardProfessional {
  return {
    tempId: `prof-${Date.now()}-${Math.random()}`,
    name: "",
    specialty: "dermatologia",
    email: "",
    schedule: { ...DEFAULT_BUSINESS_HOURS },
  }
}

interface Props {
  professionals: WizardProfessional[]
  onNext: (professionals: WizardProfessional[]) => void
  onBack: () => void
  loading: boolean
}

export function Step3Team({ professionals: initial, onNext, onBack, loading }: Props) {
  const [profs, setProfs] = useState<WizardProfessional[]>(
    initial.length > 0 ? initial : [newProfessional()]
  )
  const [expanded, setExpanded] = useState<string | null>(profs[0]?.tempId ?? null)

  function update(tempId: string, field: keyof WizardProfessional, value: unknown) {
    setProfs((ps) => ps.map((p) => (p.tempId === tempId ? { ...p, [field]: value } : p)))
  }

  function setDay(tempId: string, day: keyof BusinessHours, field: "start" | "end" | "active", value: string | boolean) {
    setProfs((ps) =>
      ps.map((p) =>
        p.tempId === tempId
          ? { ...p, schedule: { ...p.schedule, [day]: { ...p.schedule[day], [field]: value } } }
          : p
      )
    )
  }

  function addProfessional() {
    const p = newProfessional()
    setProfs((ps) => [...ps, p])
    setExpanded(p.tempId)
  }

  function remove(tempId: string) {
    setProfs((ps) => ps.filter((p) => p.tempId !== tempId))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valid = profs.filter((p) => p.name.trim())
    if (valid.length === 0) return
    onNext(valid)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Agrega los profesionales que trabajan en tu clinica. Podes editarlos despues.
      </p>

      <div className="space-y-3">
        {profs.map((prof, idx) => (
          <div key={prof.tempId} className="bg-white border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              onClick={() => setExpanded(expanded === prof.tempId ? null : prof.tempId)}
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                {idx + 1}
              </div>
              <span className="text-sm font-medium flex-1">
                {prof.name || "Profesional sin nombre"}
              </span>
              <div className="flex items-center gap-2">
                {profs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); remove(prof.tempId) }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {expanded === prof.tempId ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {/* Body */}
            {expanded === prof.tempId && (
              <div className="px-4 pb-4 space-y-4 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nombre completo *</Label>
                    <Input
                      value={prof.name}
                      onChange={(e) => update(prof.tempId, "name", e.target.value)}
                      placeholder="Dra. Ana Mora"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Especialidad</Label>
                    <Select value={prof.specialty} onValueChange={(v) => update(prof.tempId, "specialty", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SPECIALTY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs">Email (para invitar al sistema)</Label>
                    <Input
                      value={prof.email}
                      onChange={(e) => update(prof.tempId, "email", e.target.value)}
                      placeholder="ana@clinica.com"
                      type="email"
                    />
                  </div>
                </div>

                {/* Horario individual */}
                <div>
                  <Label className="text-xs mb-2 block">Horario individual</Label>
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {DAYS.map((day) => {
                      const sched = prof.schedule[day]
                      return (
                        <div key={day} className="flex items-center gap-3 px-3 py-2">
                          <Switch
                            checked={sched.active}
                            onCheckedChange={(v) => setDay(prof.tempId, day, "active", v)}
                          />
                          <span className="w-16 text-xs font-medium">{DAY_LABELS[day]}</span>
                          {sched.active ? (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <Select value={sched.start} onValueChange={(v) => setDay(prof.tempId, day, "start", v)}>
                                <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                              </Select>
                              <span className="text-xs text-muted-foreground">a</span>
                              <Select value={sched.end} onValueChange={(v) => setDay(prof.tempId, day, "end", v)}>
                                <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <span className="ml-auto text-xs text-muted-foreground">Cerrado</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addProfessional}
        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="w-4 h-4" />
        Agregar otro profesional
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
