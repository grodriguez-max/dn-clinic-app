"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Trash2, UserPlus, Clock } from "lucide-react"
import { addToWaitlist, removeFromWaitlist, getWaitlist } from "./waitlist-actions"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Professional { id: string; name: string }
interface Service      { id: string; name: string }
interface Patient      { id: string; name: string; phone?: string }

interface WaitlistEntry {
  id: string
  status: string
  preferred_date: string | null
  preferred_time: string
  notes: string | null
  created_at: string
  patients: { name: string; phone: string } | null
  professionals: { name: string } | null
  services: { name: string } | null
}

interface Props {
  open: boolean
  onClose: () => void
  clinicId: string
  professionals: Professional[]
  services: Service[]
  patients: Patient[]
}

const TIME_LABELS: Record<string, string> = {
  morning: "Mañana",
  afternoon: "Tarde",
  any: "Cualquier hora",
}

export function WaitlistPanel({
  open, onClose, clinicId, professionals, services, patients,
}: Props) {
  const [entries, setEntries]     = useState<WaitlistEntry[]>([])
  const [loading, setLoading]     = useState(false)
  const [showForm, setShowForm]   = useState(false)

  // Form state
  const [patSearch, setPatSearch] = useState("")
  const [patientId, setPatientId] = useState("")
  const [profId, setProfId]       = useState("")
  const [serviceId, setServiceId] = useState("")
  const [prefDate, setPrefDate]   = useState("")
  const [prefTime, setPrefTime]   = useState<"morning" | "afternoon" | "any">("any")
  const [notes, setNotes]         = useState("")
  const [error, setError]         = useState("")

  const filteredPatients = patSearch.length >= 2
    ? patients.filter(p => p.name.toLowerCase().includes(patSearch.toLowerCase()) || (p.phone ?? "").includes(patSearch)).slice(0, 6)
    : []

  useEffect(() => {
    if (open) loadEntries()
  }, [open])

  async function loadEntries() {
    setLoading(true)
    const data = await getWaitlist(clinicId)
    setEntries(data)
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!patientId) { setError("Seleccioná un paciente"); return }
    setLoading(true)
    setError("")
    const res = await addToWaitlist(clinicId, {
      patient_id: patientId,
      professional_id: profId || undefined,
      service_id: serviceId || undefined,
      preferred_date: prefDate || undefined,
      preferred_time: prefTime,
      notes: notes || undefined,
    })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    setShowForm(false)
    setPatientId(""); setPatSearch(""); setProfId(""); setServiceId("")
    setPrefDate(""); setNotes(""); setError("")
    loadEntries()
  }

  async function handleRemove(id: string) {
    await removeFromWaitlist(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Lista de espera
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Add button */}
          {!showForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              className="w-full"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Agregar a lista de espera
            </Button>
          )}

          {/* Add form */}
          {showForm && (
            <form onSubmit={handleAdd} className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nuevo en lista</p>

              {/* Patient search */}
              <div className="space-y-1">
                <Label className="text-xs">Paciente</Label>
                {patientId ? (
                  <div className="flex items-center gap-2 p-2 border rounded-lg bg-white text-sm">
                    <span className="flex-1">{patients.find(p => p.id === patientId)?.name ?? patSearch}</span>
                    <button type="button" onClick={() => { setPatientId(""); setPatSearch("") }} className="text-xs text-muted-foreground hover:text-destructive">Cambiar</button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input value={patSearch} onChange={e => { setPatSearch(e.target.value); setPatientId("") }} placeholder="Buscar paciente..." className="h-8 text-sm" autoComplete="off" />
                    {filteredPatients.length > 0 && !patientId && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg">
                        {filteredPatients.map(p => (
                          <button key={p.id} type="button" onClick={() => { setPatientId(p.id); setPatSearch(p.name) }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted">
                            {p.name}{p.phone && <span className="text-muted-foreground ml-2 text-xs">{p.phone}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Profesional</Label>
                  <Select value={profId} onValueChange={setProfId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Cualquiera" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Cualquiera</SelectItem>
                      {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Servicio</Label>
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Cualquiera" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Cualquiera</SelectItem>
                      {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Fecha preferida</Label>
                  <Input type="date" value={prefDate} onChange={e => setPrefDate(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Horario preferido</Label>
                  <Select value={prefTime} onValueChange={v => setPrefTime(v as typeof prefTime)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Cualquier hora</SelectItem>
                      <SelectItem value="morning">Mañana</SelectItem>
                      <SelectItem value="afternoon">Tarde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas..." className="h-8 text-sm" />

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)} className="flex-1 h-8 text-xs">Cancelar</Button>
                <Button type="submit" size="sm" disabled={loading} className="flex-1 h-8 text-xs">Agregar</Button>
              </div>
            </form>
          )}

          {/* List */}
          {loading && !entries.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
          ) : entries.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No hay pacientes en lista de espera</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {entries.map((e, i) => (
                <div key={e.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-border bg-white">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700 shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.patients?.name ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {e.services?.name && `${e.services.name} · `}
                      {e.professionals?.name && `${e.professionals.name} · `}
                      {e.preferred_date
                        ? format(new Date(e.preferred_date + "T12:00:00"), "d MMM", { locale: es })
                        : "Cualquier día"
                      } · {TIME_LABELS[e.preferred_time]}
                    </p>
                    {e.notes && <p className="text-[10px] text-muted-foreground/70 truncate">{e.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleRemove(e.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" onClick={onClose} className="w-full">Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
