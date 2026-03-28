"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { WizardData, BusinessHours } from "../types"
import { DAY_LABELS } from "../types"

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`)
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const

interface Props {
  data: Pick<WizardData, "clinicName" | "address" | "phone" | "email" | "timezone" | "businessHours">
  onNext: (data: Props["data"]) => void
  onBack: () => void
  loading: boolean
}

export function Step2Clinic({ data, onNext, onBack, loading }: Props) {
  const [form, setForm] = useState(data)

  function setField<K extends keyof Props["data"]>(key: K, value: Props["data"][K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setDay(day: keyof BusinessHours, field: "start" | "end" | "active", value: string | boolean) {
    setForm((f) => ({
      ...f,
      businessHours: {
        ...f.businessHours,
        [day]: { ...f.businessHours[day], [field]: value },
      },
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clinicName.trim()) return
    onNext(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-2">
          <Label>Nombre de la clinica *</Label>
          <Input
            value={form.clinicName}
            onChange={(e) => setField("clinicName", e.target.value)}
            placeholder="Estetica Bella Vista"
            required
          />
        </div>

        <div className="sm:col-span-2 space-y-2">
          <Label>Direccion</Label>
          <Input
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
            placeholder="Barrio Escalante, San Jose"
          />
        </div>

        <div className="space-y-2">
          <Label>Telefono</Label>
          <Input
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
            placeholder="+506 8888-0000"
            type="tel"
          />
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="info@clinica.com"
            type="email"
          />
        </div>

        <div className="space-y-2">
          <Label>Zona horaria</Label>
          <Select value={form.timezone} onValueChange={(v) => setField("timezone", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/Costa_Rica">Costa Rica (UTC-6)</SelectItem>
              <SelectItem value="America/Panama">Panama (UTC-5)</SelectItem>
              <SelectItem value="America/Guatemala">Guatemala (UTC-6)</SelectItem>
              <SelectItem value="America/Bogota">Colombia (UTC-5)</SelectItem>
              <SelectItem value="America/Mexico_City">Mexico (UTC-6)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Horario de atencion */}
      <div className="space-y-3">
        <Label>Horario de atencion</Label>
        <div className="bg-white rounded-xl border border-border divide-y divide-border">
          {DAYS.map((day) => {
            const sched = form.businessHours[day]
            return (
              <div key={day} className="flex items-center gap-3 px-4 py-3">
                <Switch
                  checked={sched.active}
                  onCheckedChange={(v) => setDay(day, "active", v)}
                />
                <span className="w-20 text-sm font-medium">{DAY_LABELS[day]}</span>
                {sched.active ? (
                  <div className="flex items-center gap-2 ml-auto">
                    <Select value={sched.start} onValueChange={(v) => setDay(day, "start", v)}>
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">a</span>
                    <Select value={sched.end} onValueChange={(v) => setDay(day, "end", v)}>
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <span className="ml-auto text-xs text-muted-foreground">Cerrado</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">Anterior</Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? "Guardando..." : "Siguiente →"}
        </Button>
      </div>
    </form>
  )
}
