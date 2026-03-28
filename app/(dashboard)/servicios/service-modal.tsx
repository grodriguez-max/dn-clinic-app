"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createService, updateService, type ServiceInput } from "./actions"

const CATEGORIES = [
  { value: "facial",    label: "Facial" },
  { value: "inyectables", label: "Inyectables" },
  { value: "laser",     label: "Láser" },
  { value: "corporal",  label: "Corporal" },
  { value: "capilar",   label: "Capilar" },
  { value: "dental",    label: "Dental" },
  { value: "consulta",  label: "Consulta" },
  { value: "otro",      label: "Otro" },
]

export interface ServiceRow {
  id: string
  name: string
  category?: string
  duration_minutes: number
  price: number
  description?: string
  is_active: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  clinicId: string
  service?: ServiceRow | null
}

const empty: ServiceInput = { name: "", category: "otro", duration_minutes: 60, price: 0, description: "" }

export function ServiceModal({ open, onClose, onSaved, clinicId, service }: Props) {
  const isEdit = !!service?.id
  const [form, setForm] = useState<ServiceInput>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    if (isEdit && service) {
      setForm({
        name: service.name,
        category: service.category ?? "otro",
        duration_minutes: service.duration_minutes,
        price: service.price,
        description: service.description ?? "",
      })
    } else {
      setForm(empty)
    }
    setError("")
  }, [open])

  function set(field: keyof ServiceInput, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("El nombre es requerido"); return }
    if (form.duration_minutes < 5) { setError("Duración mínima 5 minutos"); return }
    setLoading(true)
    setError("")
    try {
      const res = isEdit
        ? await updateService(service!.id, form)
        : await createService(clinicId, form)
      if (res.error) { setError(res.error); return }
      onSaved()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Limpieza facial profunda" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={form.category ?? "otro"} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Duración (min)</Label>
              <Input
                type="number"
                min={5}
                step={5}
                value={form.duration_minutes}
                onChange={(e) => set("duration_minutes", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Precio (₡)</Label>
            <Input
              type="number"
              min={0}
              step={500}
              value={form.price}
              onChange={(e) => set("price", Number(e.target.value))}
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descripción <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Descripción del servicio..."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Guardando..." : isEdit ? "Guardar" : "Crear servicio"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
