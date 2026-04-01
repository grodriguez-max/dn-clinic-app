"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Pencil, Trash2, Phone, Mail, ExternalLink, TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { PatientModal, type PatientRow } from "./patient-modal"
import { deletePatient } from "./actions"

const TAG_COLORS: Record<string, string> = {
  vip:       "bg-amber-100 text-amber-700",
  nuevo:     "bg-blue-100 text-blue-700",
  frecuente: "bg-emerald-100 text-emerald-700",
  inactivo:  "bg-gray-100 text-gray-500",
  referido:  "bg-purple-100 text-purple-700",
}

const ALL_TAGS = ["vip", "nuevo", "frecuente", "inactivo", "referido"]

interface Props {
  clinicId: string
  initialPatients: PatientRow[]
}

export function PatientsClient({ clinicId, initialPatients }: Props) {
  const [patients, setPatients] = useState(initialPatients)
  const [search, setSearch] = useState("")
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [modal, setModal] = useState<{ open: boolean; patient: PatientRow | null }>({ open: false, patient: null })
  const [, startTransition] = useTransition()

  const filtered = patients.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone ?? "").includes(search) ||
      (p.email ?? "").toLowerCase().includes(search.toLowerCase())
    const matchTag = !tagFilter || (p.tags ?? []).includes(tagFilter)
    return matchSearch && matchTag
  })

  function openNew() { setModal({ open: true, patient: null }) }
  function openEdit(p: PatientRow) { setModal({ open: true, patient: p }) }

  function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return
    startTransition(async () => {
      await deletePatient(id)
      setPatients((ps) => ps.filter((p) => p.id !== id))
    })
  }

  // After save, reload from server via router.refresh wouldn't refresh state
  // Instead we update optimistically: re-fetch is handled by revalidatePath but
  // for instant UI we remove/update in-state. A full refresh will pick up changes.
  function handleSaved() {
    // Reload the page to get fresh server data
    window.location.reload()
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono o email..."
            className="pl-9"
          />
        </div>
        <Button onClick={openNew} size="sm" className="h-9">
          <Plus className="w-4 h-4 mr-1.5" />
          Nuevo paciente
        </Button>
      </div>

      {/* Tag filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTagFilter(null)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium border transition-all",
            !tagFilter ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary"
          )}
        >
          Todos ({patients.length})
        </button>
        {ALL_TAGS.map((tag) => {
          const count = patients.filter((p) => (p.tags ?? []).includes(tag)).length
          if (count === 0) return null
          return (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                tagFilter === tag ? TAG_COLORS[tag] + " border-current" : "bg-muted text-muted-foreground border-border hover:border-primary"
              )}
            >
              {tag} ({count})
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paciente</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Contacto</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Etiquetas</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">LTV</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    {search || tagFilter ? "Sin resultados para esta búsqueda" : "No hay pacientes registrados"}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      {p.birth_date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date().getFullYear() - new Date(p.birth_date).getFullYear()} años
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="space-y-0.5">
                        {p.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />{p.phone}
                          </p>
                        )}
                        {p.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate max-w-[180px]">
                            <Mail className="w-3 h-3 shrink-0" />{p.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(p.tags ?? []).map((tag) => (
                          <span
                            key={tag}
                            className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", TAG_COLORS[tag] ?? "bg-muted text-muted-foreground")}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <TrendingUp className="w-3 h-3" />
                          {formatCurrency((p as unknown as { total_spent?: number }).total_spent ?? 0)}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {(p as unknown as { total_visits?: number }).total_visits ?? 0} visitas
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link href={`/pacientes/${p.id}`}>
                          <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
            {filtered.length} de {patients.length} pacientes
          </div>
        )}
      </div>

      <PatientModal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSaved={handleSaved}
        clinicId={clinicId}
        patient={modal.patient}
      />
    </div>
  )
}
