"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Trash2 } from "lucide-react"
import { createTimeBlock, deleteTimeBlock } from "./block-actions"
import { format } from "date-fns"

interface Professional { id: string; name: string }

interface TimeBlock {
  id: string
  professional_id: string
  date: string
  start_time: string
  end_time: string
  reason: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  clinicId: string
  professionals: Professional[]
  prefillDate?: string
  prefillProfId?: string
  existingBlocks?: TimeBlock[]
}

export function TimeBlockModal({
  open, onClose, onSaved,
  clinicId, professionals,
  prefillDate, prefillProfId,
  existingBlocks = [],
}: Props) {
  const [profId, setProfId]   = useState("")
  const [date, setDate]       = useState("")
  const [startTime, setStart] = useState("09:00")
  const [endTime, setEnd]     = useState("10:00")
  const [reason, setReason]   = useState("Bloqueado")
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  useEffect(() => {
    if (!open) return
    setProfId(prefillProfId ?? professionals[0]?.id ?? "")
    setDate(prefillDate ?? format(new Date(), "yyyy-MM-dd"))
    setStart("09:00")
    setEnd("10:00")
    setReason("Bloqueado")
    setError("")
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profId || !date || !startTime || !endTime) {
      setError("Completá todos los campos"); return
    }
    if (startTime >= endTime) {
      setError("La hora de fin debe ser mayor a la de inicio"); return
    }
    setLoading(true)
    setError("")
    const res = await createTimeBlock(clinicId, {
      professional_id: profId,
      date,
      start_time: startTime,
      end_time: endTime,
      reason: reason || "Bloqueado",
    })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onSaved()
    onClose()
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este bloqueo?")) return
    await deleteTimeBlock(id)
    onSaved()
  }

  const blocksForProf = existingBlocks.filter(b => b.professional_id === profId && b.date === date)

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bloquear horario</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Profesional</Label>
            <Select value={profId} onValueChange={setProfId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {professionals.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Fecha</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Desde</Label>
              <Input type="time" value={startTime} step="900" onChange={e => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hasta</Label>
              <Input type="time" value={endTime} step="900" onChange={e => setEnd(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Motivo <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Bloqueado, Almuerzo, Reunión..."
            />
          </div>

          {/* Existing blocks for selected date/prof */}
          {blocksForProf.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bloqueos en este día</p>
              {blocksForProf.map(b => (
                <div key={b.id} className="flex items-center justify-between px-2 py-1.5 bg-muted/40 rounded-lg text-sm">
                  <span className="text-muted-foreground tabular-nums">
                    {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}
                  </span>
                  <span className="flex-1 text-center text-xs">{b.reason}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(b.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Cerrar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Guardando..." : "Bloquear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
