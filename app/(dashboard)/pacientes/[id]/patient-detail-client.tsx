"use client"

import { useState } from "react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Phone, Mail, CalendarDays, User, AlertTriangle, FileText, MessageSquare, Receipt, Camera } from "lucide-react"
import { cn, formatDate, formatDateTime, formatCurrency } from "@/lib/utils"

const TAG_COLORS: Record<string, string> = {
  vip:       "bg-amber-100 text-amber-700",
  nuevo:     "bg-blue-100 text-blue-700",
  frecuente: "bg-emerald-100 text-emerald-700",
  inactivo:  "bg-gray-100 text-gray-500",
  referido:  "bg-purple-100 text-purple-700",
}

const STATUS_COLORS: Record<string, string> = {
  pending:     "bg-yellow-100 text-yellow-700",
  confirmed:   "bg-blue-100 text-blue-700",
  completed:   "bg-emerald-100 text-emerald-700",
  cancelled:   "bg-red-100 text-red-600",
  no_show:     "bg-gray-100 text-gray-500",
  rescheduled: "bg-purple-100 text-purple-700",
}

const STATUS_LABELS: Record<string, string> = {
  pending:     "Pendiente",
  confirmed:   "Confirmada",
  completed:   "Completada",
  cancelled:   "Cancelada",
  no_show:     "No asistió",
  rescheduled: "Reagendada",
}

interface Patient {
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
  contraindications?: string
  skin_type?: string
  medical_notes?: string
  created_at: string
}

interface Appointment {
  id: string
  start_time: string
  end_time: string
  status: string
  notes?: string
  professionals?: { name: string } | null
  services?: { name: string; price?: number } | null
}

interface ClinicalRecord {
  id: string
  record_date: string
  chief_complaint?: string
  diagnosis?: string
  treatment?: string
  recommendations?: string
  professionals?: { name: string } | null
}

interface Conversation {
  id: string
  channel: string
  status: string
  started_at: string
  resolved_at?: string
  summary?: string
}

interface Invoice {
  id: string
  invoice_number: string
  invoice_type: string
  total: number
  status: string
  payment_method?: string
  created_at: string
}

interface Props {
  patient: Patient
  appointments: Appointment[]
  records: ClinicalRecord[]
  conversations: Conversation[]
  invoices: Invoice[]
}

export function PatientDetailClient({ patient, appointments, records, conversations, invoices }: Props) {
  const age = patient.birth_date
    ? new Date().getFullYear() - new Date(patient.birth_date).getFullYear()
    : null

  const completedAppts = appointments.filter((a) => a.status === "completed").length
  const totalSpent = invoices
    .filter((i) => i.status !== "anulada")
    .reduce((sum, i) => sum + Number(i.total), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/pacientes">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
            <ArrowLeft className="w-4 h-4" />
            Pacientes
          </Button>
        </Link>
      </div>

      {/* Patient card */}
      <div className="card-premium p-6">
        <div className="flex items-start gap-4 flex-wrap">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-primary">
              {patient.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{patient.name}</h1>
              {(patient.tags ?? []).map((tag) => (
                <span key={tag} className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", TAG_COLORS[tag] ?? "bg-muted text-muted-foreground")}>
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              {patient.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />{patient.phone}
                </span>
              )}
              {patient.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />{patient.email}
                </span>
              )}
              {age && (
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />{age} años
                </span>
              )}
              {patient.gender && (
                <span className="capitalize">{patient.gender}</span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{completedAppts}</p>
              <p className="text-xs text-muted-foreground">Citas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalSpent)}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {(patient.allergies || patient.contraindications) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              {patient.allergies && <p><span className="font-medium text-red-700">Alergias:</span> {patient.allergies}</p>}
              {patient.contraindications && <p className="mt-0.5"><span className="font-medium text-red-700">Contraindicaciones:</span> {patient.contraindications}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="historial">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="historial" className="gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="ficha" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Ficha clínica
          </TabsTrigger>
          <TabsTrigger value="fotos" className="gap-1.5">
            <Camera className="w-3.5 h-3.5" />
            Fotos
          </TabsTrigger>
          <TabsTrigger value="comunicaciones" className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Mensajes
          </TabsTrigger>
          <TabsTrigger value="facturacion" className="gap-1.5">
            <Receipt className="w-3.5 h-3.5" />
            Facturación
          </TabsTrigger>
        </TabsList>

        {/* Tab: Historial */}
        <TabsContent value="historial" className="mt-4">
          <div className="card-premium overflow-hidden">
            {appointments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Sin citas registradas</div>
            ) : (
              <div className="divide-y divide-border">
                {appointments.map((appt) => (
                  <div key={appt.id} className="px-4 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{appt.services?.name ?? "Servicio"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(appt.start_time)}
                        {appt.professionals && ` · ${appt.professionals.name}`}
                      </p>
                      {appt.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{appt.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {appt.services?.price && (
                        <span className="text-sm font-medium text-muted-foreground">
                          {formatCurrency(appt.services.price)}
                        </span>
                      )}
                      <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", STATUS_COLORS[appt.status] ?? "bg-muted text-muted-foreground")}>
                        {STATUS_LABELS[appt.status] ?? appt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab: Ficha clínica */}
        <TabsContent value="ficha" className="mt-4 space-y-4">
          {/* General info */}
          <div className="card-premium p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Información médica</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {patient.skin_type && (
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de piel</p>
                  <p className="font-medium capitalize">{patient.skin_type}</p>
                </div>
              )}
              {patient.source && (
                <div>
                  <p className="text-xs text-muted-foreground">Fuente</p>
                  <p className="font-medium capitalize">{patient.source}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Paciente desde</p>
              <p className="font-medium">{formatDate(patient.created_at)}</p>
            </div>
            {patient.medical_notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notas médicas</p>
                <p className="text-sm">{patient.medical_notes}</p>
              </div>
            )}
            {patient.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Observaciones</p>
                <p className="text-sm">{patient.notes}</p>
              </div>
            )}
          </div>

          {/* Clinical records */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Registros clínicos</p>
            {records.length === 0 ? (
              <div className="card-premium text-center py-10 text-muted-foreground text-sm">
                Sin registros clínicos
              </div>
            ) : (
              records.map((rec) => (
                <div key={rec.id} className="card-premium p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{formatDate(rec.record_date)}</p>
                    {rec.professionals && (
                      <p className="text-xs text-muted-foreground">{rec.professionals.name}</p>
                    )}
                  </div>
                  {rec.chief_complaint && <p className="text-sm"><span className="text-xs text-muted-foreground">Motivo: </span>{rec.chief_complaint}</p>}
                  {rec.diagnosis && <p className="text-sm"><span className="text-xs text-muted-foreground">Diagnóstico: </span>{rec.diagnosis}</p>}
                  {rec.treatment && <p className="text-sm"><span className="text-xs text-muted-foreground">Tratamiento: </span>{rec.treatment}</p>}
                  {rec.recommendations && <p className="text-sm"><span className="text-xs text-muted-foreground">Recomendaciones: </span>{rec.recommendations}</p>}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab: Fotos */}
        <TabsContent value="fotos" className="mt-4">
          <div className="card-premium p-8 text-center text-muted-foreground">
            <Camera className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">Fotos antes/después</p>
            <p className="text-xs mt-1">Disponible en próxima versión</p>
          </div>
        </TabsContent>

        {/* Tab: Comunicaciones */}
        <TabsContent value="comunicaciones" className="mt-4">
          <div className="card-premium overflow-hidden">
            {conversations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Sin conversaciones</div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((conv) => (
                  <div key={conv.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="capitalize text-sm font-medium">{conv.channel}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[11px] font-medium",
                          conv.status === "active" ? "bg-blue-100 text-blue-700" :
                          conv.status === "resolved" ? "bg-emerald-100 text-emerald-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {conv.status === "active" ? "Activa" : conv.status === "resolved" ? "Resuelta" : "Escalada"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(conv.started_at)}</p>
                    </div>
                    {conv.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{conv.summary}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab: Facturación */}
        <TabsContent value="facturacion" className="mt-4">
          {invoices.length > 0 && (
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Total facturado: <span className="font-semibold text-foreground">{formatCurrency(totalSpent)}</span>
              </p>
            </div>
          )}
          <div className="card-premium overflow-hidden">
            {invoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Sin facturas</div>
            ) : (
              <div className="divide-y divide-border">
                {invoices.map((inv) => (
                  <div key={inv.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(inv.created_at)}
                        {inv.payment_method && ` · ${inv.payment_method}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatCurrency(inv.total)}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[11px] font-medium",
                        inv.status === "aceptada" ? "bg-emerald-100 text-emerald-700" :
                        inv.status === "emitida" ? "bg-blue-100 text-blue-700" :
                        inv.status === "anulada" ? "bg-red-100 text-red-600" :
                        "bg-gray-100 text-gray-500"
                      )}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
