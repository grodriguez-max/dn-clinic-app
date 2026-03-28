"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle2, ArrowLeft } from "lucide-react"
import type { WizardData } from "../types"

interface Props {
  data: WizardData
  onActivate: () => void
  onBack: () => void
  loading: boolean
}

export function Step8Summary({ data, onActivate, onBack, loading }: Props) {
  const selectedServices = data.services.filter((s) => s.selected)

  const items = [
    { label: "Clinica",       value: data.clinicName },
    { label: "Profesionales", value: `${data.professionals.length} configurados` },
    { label: "Servicios",     value: `${selectedServices.length} activos` },
    { label: "WhatsApp",      value: "Pendiente de conexion" },
    { label: "Recepcionista", value: `${data.agentName} (${data.agentTone === "formal" ? "formal" : data.agentTone === "semi_formal" ? "semi-formal" : "informal"})` },
    { label: "Recordatorios", value: data.autoReminders ? "Activados (24h + 2h)" : "Desactivados" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg">Todo listo</p>
          <p className="text-sm text-muted-foreground">Revisa el resumen y activa tu clinica</p>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl divide-y divide-border">
        {items.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium text-right max-w-[60%] truncate">{value}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Button
          className="w-full"
          size="lg"
          onClick={onActivate}
          disabled={loading}
        >
          {loading ? "Activando..." : "Activar mi clinica ✓"}
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={onBack}
          disabled={loading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Revisar configuracion
        </Button>
      </div>
    </div>
  )
}
