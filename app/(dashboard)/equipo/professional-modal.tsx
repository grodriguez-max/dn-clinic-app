"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createProfessional, updateProfessional, type ProfessionalInput } from "./actions"

export interface ProfessionalRow {
  id: string
  name: string
  specialty?: string
  bio?: string
  photo_url?: string
  is_active: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  clinicId: string
  professional?: ProfessionalRow | null
}

const empty: ProfessionalInput = { name: "", specialty: "", bio: "" }

export function ProfessionalModal({ open, onClose, onSaved, clinicId, professional }: Props) {
  const isEdit = !!professional?.id
  const [form, setForm] = useState<ProfessionalInput>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    if (isEdit && professional) {
      setForm({
        name: professional.name,
        specialty: professional.specialty ?? "",
        bio: professional.bio ?? "",
      })
    } else {
      setForm(empty)
    }
    setError("")
  }, [open])

  function set(field: keyof ProfessionalInput, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("El nombre es requerido"); return }
    setLoading(true)
    setError("")
    try {
      const payload = {
        name: form.name.trim(),
        specialty: form.specialty?.trim() || undefined,
        bio: form.bio?.trim() || undefined,
      }
      const res = isEdit
        ? await updateProfessional(professional!.id, payload)
        : await createProfessional(clinicId, payload)
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
          <DialogTitle>{isEdit ? "Editar profesional" : "Nuevo profesional"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Nombre completo *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Dra. Ana García"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Especialidad</Label>
            <Input
              value={form.specialty}
              onChange={(e) => set("specialty", e.target.value)}
              placeholder="Estética facial, Dermatología..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Biografía <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              rows={3}
              placeholder="Descripción breve del profesional..."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Guardando..." : isEdit ? "Guardar" : "Agregar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
