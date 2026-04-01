"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createProfessional, updateProfessional, uploadProfessionalDocument, type ProfessionalInput } from "./actions"
import { saveCommissionRules, getCommissionRules } from "./commission-actions"
import { Upload, X, FileText, Camera } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ProfessionalRow {
  id: string
  name: string
  specialty?: string
  bio?: string
  photo_url?: string
  is_active: boolean
}

interface Service { id: string; name: string; price: number }

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  clinicId: string
  professional?: ProfessionalRow | null
  isOwner?: boolean
  services?: Service[]
}

const empty: ProfessionalInput = { name: "", specialty: "", bio: "" }

export function ProfessionalModal({ open, onClose, onSaved, clinicId, professional, isOwner = false, services = [] }: Props) {
  const isEdit = !!professional?.id
  const [form, setForm] = useState<ProfessionalInput>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // File upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [certFiles, setCertFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  // Commission state
  const [defaultCommissionPct, setDefaultCommissionPct] = useState("0")
  const [serviceRules, setServiceRules] = useState<Array<{ service_id: string; commission_type: "percentage" | "fixed"; commission_value: string }>>([])

  const photoInputRef = useRef<HTMLInputElement>(null)
  const cvInputRef = useRef<HTMLInputElement>(null)
  const certInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (isEdit && professional) {
      setForm({
        name: professional.name,
        specialty: professional.specialty ?? "",
        bio: professional.bio ?? "",
      })
      setPhotoPreview(professional.photo_url ?? null)
      setDefaultCommissionPct(String((professional as any).default_commission_percentage ?? 0))
      // Load service-specific commission rules
      getCommissionRules(professional.id).then((rules) => {
        setServiceRules(rules.map((r) => ({
          service_id: r.service_id ?? "",
          commission_type: (r.commission_type as "percentage" | "fixed") ?? "percentage",
          commission_value: String(r.commission_value),
        })))
      })
    } else {
      setForm(empty)
      setPhotoPreview(null)
      setDefaultCommissionPct("0")
      setServiceRules([])
    }
    setPhotoFile(null)
    setCvFile(null)
    setCertFiles([])
    setError("")
  }, [open])

  function set(field: keyof ProfessionalInput, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("El nombre es requerido"); return }
    setLoading(true)
    setError("")
    try {
      const payload: ProfessionalInput = {
        name: form.name.trim(),
        specialty: form.specialty?.trim() || undefined,
        bio: form.bio?.trim() || undefined,
      }

      // Create/update professional first to get the ID
      const res = isEdit
        ? await updateProfessional(professional!.id, payload)
        : await createProfessional(clinicId, payload)

      if (res.error) { setError(res.error); return }

      const profId = isEdit ? professional!.id : (res as { ok: boolean; id?: string }).id

      if (profId && isOwner) {
        // Save commissions
        await saveCommissionRules(clinicId, profId, Number(defaultCommissionPct), serviceRules.map((r) => ({
          service_id: r.service_id || null,
          commission_type: r.commission_type,
          commission_value: Number(r.commission_value),
        })))

        setUploading(true)
        // Upload photo
        if (photoFile) {
          const fd = new FormData()
          fd.append("file", photoFile)
          const r = await uploadProfessionalDocument(profId, "photo", fd)
          if (r.publicUrl) {
            await updateProfessional(profId, { photo_url: r.publicUrl })
          }
        }
        // Upload CV
        if (cvFile) {
          const fd = new FormData()
          fd.append("file", cvFile)
          await uploadProfessionalDocument(profId, "curriculum", fd)
        }
        // Upload certifications
        for (const certFile of certFiles) {
          const fd = new FormData()
          fd.append("file", certFile)
          await uploadProfessionalDocument(profId, "certification", fd)
        }
        setUploading(false)
      }

      onSaved()
      onClose()
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  const isBusy = loading || uploading

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar profesional" : "Nuevo profesional"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Photo upload */}
          <div className="space-y-1.5">
            <Label>Foto de perfil</Label>
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors shrink-0",
                )}
                onClick={() => photoInputRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {photoPreview ? "Cambiar foto" : "Subir foto"}
                </Button>
                {photoFile && (
                  <p className="text-xs text-muted-foreground mt-1 truncate max-w-40">{photoFile.name}</p>
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
          </div>

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

          {/* Comisiones — owner only */}
          {isOwner && (
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comisiones</p>
              <div className="space-y-1.5">
                <Label>Comisión base (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={defaultCommissionPct}
                  onChange={(e) => setDefaultCommissionPct(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">Se aplica cuando no hay una regla específica por servicio</p>
              </div>

              {services.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Reglas por servicio</Label>
                    <button
                      type="button"
                      onClick={() => setServiceRules((r) => [...r, { service_id: "", commission_type: "percentage", commission_value: "" }])}
                      className="text-xs text-primary hover:underline"
                    >
                      + Agregar regla
                    </button>
                  </div>
                  {serviceRules.map((rule, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_70px_20px] gap-1.5 items-center">
                      <select
                        className="h-8 text-xs border border-border rounded-md px-2 bg-background"
                        value={rule.service_id}
                        onChange={(e) => setServiceRules((rs) => rs.map((r, j) => j === i ? { ...r, service_id: e.target.value } : r))}
                      >
                        <option value="">— Servicio —</option>
                        {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <select
                        className="h-8 text-xs border border-border rounded-md px-2 bg-background"
                        value={rule.commission_type}
                        onChange={(e) => setServiceRules((rs) => rs.map((r, j) => j === i ? { ...r, commission_type: e.target.value as "percentage" | "fixed" } : r))}
                      >
                        <option value="percentage">%</option>
                        <option value="fixed">₡ fijo</option>
                      </select>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 text-xs"
                        value={rule.commission_value}
                        onChange={(e) => setServiceRules((rs) => rs.map((r, j) => j === i ? { ...r, commission_value: e.target.value } : r))}
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={() => setServiceRules((rs) => rs.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Private documents — owner only */}
          {isOwner && (
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documentos privados (solo visible para Master)</p>

              {/* CV */}
              <div className="space-y-1.5">
                <Label>Currículum (PDF)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => cvInputRef.current?.click()}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    {cvFile ? "Cambiar CV" : "Subir CV"}
                  </Button>
                  {cvFile && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="truncate max-w-32">{cvFile.name}</span>
                      <button type="button" onClick={() => setCvFile(null)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <input
                  ref={cvInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {/* Certifications */}
              <div className="space-y-1.5">
                <Label>Títulos y certificaciones (PDF / imagen)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => certInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Agregar archivo
                </Button>
                {certFiles.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {certFiles.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="w-3 h-3" />
                        <span className="truncate max-w-48">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setCertFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <input
                  ref={certInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? [])
                    setCertFiles((prev) => [...prev, ...files])
                  }}
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {uploading && <p className="text-sm text-muted-foreground animate-pulse">Subiendo archivos...</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isBusy} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isBusy} className="flex-1">
              {isBusy ? (uploading ? "Subiendo..." : "Guardando...") : isEdit ? "Guardar" : "Agregar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
