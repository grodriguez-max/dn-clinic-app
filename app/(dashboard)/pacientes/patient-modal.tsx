"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPatient, updatePatient, type PatientInput } from "./actions"
import { cn } from "@/lib/utils"

const TAGS = ["vip", "nuevo", "frecuente", "inactivo", "referido"]
const TAG_COLORS: Record<string, string> = {
  vip:       "bg-amber-100 text-amber-700 border-amber-300",
  nuevo:     "bg-blue-100 text-blue-700 border-blue-300",
  frecuente: "bg-emerald-100 text-emerald-700 border-emerald-300",
  inactivo:  "bg-gray-100 text-gray-500 border-gray-300",
  referido:  "bg-purple-100 text-purple-700 border-purple-300",
}

export interface PatientRow {
  id: string
  name: string
  phone?: string
  email?: string
  birth_date?: string
  gender?: string
  tags?: string[]
  source?: string
  notes?: string
  allergies?: string
  medical_notes?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  clinicId: string
  patient?: PatientRow | null
}

const empty: PatientInput = {
  name: "", phone: "", email: "", birth_date: "", gender: "",
  tags: [], source: "", notes: "", allergies: "", medical_notes: "",
}

export function PatientModal({ open, onClose, onSaved, clinicId, patient }: Props) {
  const isEdit = !!patient?.id
  const [form, setForm] = useState<PatientInput>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    if (isEdit && patient) {
      setForm({
        name: patient.name,
        phone: patient.phone ?? "",
        email: patient.email ?? "",
        birth_date: patient.birth_date ?? "",
        gender: patient.gender ?? "",
        tags: patient.tags ?? [],
        source: patient.source ?? "",
        notes: patient.notes ?? "",
        allergies: patient.allergies ?? "",
        medical_notes: patient.medical_notes ?? "",
      })
    } else {
      setForm(empty)
    }
    setError("")
  }, [open])

  function set(field: keyof PatientInput, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggleTag(tag: string) {
    setForm((f) => {
      const tags = f.tags ?? []
      return { ...f, tags: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag] }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("El nombre es requerido"); return }
    setLoading(true)
    setError("")
    try {
      const payload: PatientInput = {
        ...form,
        phone: form.phone || undefined,
        email: form.email || undefined,
        birth_date: form.birth_date || undefined,
        gender: form.gender || undefined,
        source: form.source || undefined,
        notes: form.notes || undefined,
        allergies: form.allergies || undefined,
        medical_notes: form.medical_notes || undefined,
      }
      const res = isEdit
        ? await updatePatient(patient!.id, payload)
        : await createPatient(clinicId, payload)
      if (res.error) { setError(res.error); return }
      onSaved()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar paciente" : "Nuevo paciente"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Nombre completo *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="María Rodríguez" />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+506 8888-0000" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="maria@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de nacimiento</Label>
              <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Género</Label>
              <Select value={form.gender ?? ""} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="femenino">Femenino</SelectItem>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fuente</Label>
              <Select value={form.source ?? ""} onValueChange={(v) => set("source", v)}>
                <SelectTrigger><SelectValue placeholder="¿Cómo nos encontró?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="referido">Referido</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="web">Sitio web</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Etiquetas</Label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag) => {
                const active = (form.tags ?? []).includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                      active ? TAG_COLORS[tag] : "bg-muted text-muted-foreground border-border hover:border-primary"
                    )}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Observaciones generales..." />
          </div>

          <div className="space-y-1.5">
            <Label>Alergias / contraindicaciones</Label>
            <Textarea value={form.allergies} onChange={(e) => set("allergies", e.target.value)} rows={2} placeholder="Penicilina, látex..." />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Guardando..." : isEdit ? "Guardar" : "Crear paciente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
