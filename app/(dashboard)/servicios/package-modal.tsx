"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPackage, updatePackage, type PackageInput } from "./package-actions"

export interface PackageRow {
  id: string
  name: string
  description?: string
  service_id: string
  total_sessions: number
  price: number
  discount_percentage: number
  validity_days: number
  is_active: boolean
}

interface Service { id: string; name: string; price: number }

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  clinicId: string
  pkg?: PackageRow | null
  services: Service[]
}

const empty: PackageInput = {
  name: "",
  description: "",
  service_id: "",
  total_sessions: 10,
  price: 0,
  discount_percentage: 0,
  validity_days: 365,
}

export function PackageModal({ open, onClose, onSaved, clinicId, pkg, services }: Props) {
  const isEdit = !!pkg?.id
  const [form, setForm] = useState<PackageInput>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    if (isEdit && pkg) {
      setForm({
        name: pkg.name,
        description: pkg.description ?? "",
        service_id: pkg.service_id,
        total_sessions: pkg.total_sessions,
        price: pkg.price,
        discount_percentage: pkg.discount_percentage,
        validity_days: pkg.validity_days,
      })
    } else {
      setForm(empty)
    }
    setError("")
  }, [open])

  function set<K extends keyof PackageInput>(field: K, value: PackageInput[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  // Auto-calculate suggested price based on service price
  const selectedService = services.find((s) => s.id === form.service_id)
  const fullPrice = selectedService ? selectedService.price * form.total_sessions : 0
  const discountedPrice = fullPrice > 0 ? fullPrice * (1 - (form.discount_percentage ?? 0) / 100) : 0
  const pricePerSession = form.total_sessions > 0 ? form.price / form.total_sessions : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("El nombre es requerido"); return }
    if (!form.service_id) { setError("Seleccioná un servicio"); return }
    if (form.total_sessions < 1) { setError("Las sesiones deben ser al menos 1"); return }
    if (form.price <= 0) { setError("El precio debe ser mayor a 0"); return }
    setLoading(true)
    setError("")
    try {
      const payload: PackageInput = {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        service_id: form.service_id,
        total_sessions: Number(form.total_sessions),
        price: Number(form.price),
        discount_percentage: Number(form.discount_percentage ?? 0),
        validity_days: Number(form.validity_days ?? 365),
      }
      const res = isEdit
        ? await updatePackage(pkg!.id, payload)
        : await createPackage(clinicId, payload)
      if (res.error) { setError(res.error); return }
      onSaved()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar paquete" : "Nuevo paquete"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Nombre del paquete *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Pack 10 Sesiones Depilación Láser"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Servicio asociado *</Label>
            <Select value={form.service_id} onValueChange={(v) => set("service_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná un servicio" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sesiones totales *</Label>
              <Input
                type="number"
                min={1}
                value={form.total_sessions}
                onChange={(e) => set("total_sessions", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descuento (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.discount_percentage ?? 0}
                onChange={(e) => set("discount_percentage", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Precio del paquete (₡) *</Label>
            <Input
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => set("price", Number(e.target.value))}
              placeholder="0"
            />
            {fullPrice > 0 && (
              <p className="text-xs text-muted-foreground">
                Precio normal: ₡{fullPrice.toLocaleString("es-CR")}
                {(form.discount_percentage ?? 0) > 0 && ` → sugerido con descuento: ₡${Math.round(discountedPrice).toLocaleString("es-CR")}`}
                {` · ₡${Math.round(pricePerSession).toLocaleString("es-CR")} / sesión`}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Vigencia (días)</Label>
            <Input
              type="number"
              min={1}
              value={form.validity_days ?? 365}
              onChange={(e) => set("validity_days", Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descripción <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Descripción del paquete para mostrar al paciente..."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Guardando..." : isEdit ? "Guardar" : "Crear paquete"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
