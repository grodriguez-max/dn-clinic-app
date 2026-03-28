"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import type { WizardData, WizardFAQ } from "../types"

interface Props {
  data: Pick<WizardData, "agentName" | "agentTone" | "welcomeMessage" | "faqs" | "agentCanBook" | "autoReminders">
  clinicName: string
  onNext: (data: Props["data"]) => void
  onBack: () => void
  loading: boolean
}

export function Step7Agent({ data, clinicName, onNext, onBack, loading }: Props) {
  const [form, setForm] = useState({
    ...data,
    agentName: data.agentName || `Asistente de ${clinicName}`,
    welcomeMessage: data.welcomeMessage || `Hola! Soy la asistente virtual de ${clinicName}. Como puedo ayudarte hoy?`,
    faqs: data.faqs.length > 0 ? data.faqs : [
      { question: "Cual es la direccion?", answer: "Te indico la direccion de nuestra clinica." },
      { question: "Cuales son los horarios?", answer: "Estamos disponibles de lunes a viernes." },
      { question: "Aceptan tarjeta?", answer: "Si, aceptamos tarjeta, SINPE Movil y efectivo." },
    ],
  })

  function addFaq() {
    setForm((f) => ({ ...f, faqs: [...f.faqs, { question: "", answer: "" }] }))
  }

  function updateFaq(idx: number, field: keyof WizardFAQ, value: string) {
    setForm((f) => ({
      ...f,
      faqs: f.faqs.map((faq, i) => (i === idx ? { ...faq, [field]: value } : faq)),
    }))
  }

  function removeFaq(idx: number) {
    setForm((f) => ({ ...f, faqs: f.faqs.filter((_, i) => i !== idx) }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Personalizá como se va a llamar tu recepcionista y como va a comunicarse con los pacientes.
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nombre de la recepcionista</Label>
            <Input
              value={form.agentName}
              onChange={(e) => setForm((f) => ({ ...f, agentName: e.target.value }))}
              placeholder={`Asistente de ${clinicName}`}
            />
          </div>
          <div className="space-y-2">
            <Label>Tono de comunicacion</Label>
            <Select
              value={form.agentTone}
              onValueChange={(v) => setForm((f) => ({ ...f, agentTone: v as WizardData["agentTone"] }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">Formal (usted)</SelectItem>
                <SelectItem value="semi_formal">Semi-formal</SelectItem>
                <SelectItem value="informal">Informal (vos)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Mensaje de bienvenida</Label>
          <Textarea
            value={form.welcomeMessage}
            onChange={(e) => setForm((f) => ({ ...f, welcomeMessage: e.target.value }))}
            rows={2}
            placeholder="Hola! En que puedo ayudarte?"
          />
        </div>

        {/* Toggles */}
        <div className="bg-white border border-border rounded-xl divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Agendar citas automaticamente</p>
              <p className="text-xs text-muted-foreground">La recepcionista puede crear citas sin confirmacion humana</p>
            </div>
            <Switch
              checked={form.agentCanBook}
              onCheckedChange={(v) => setForm((f) => ({ ...f, agentCanBook: v }))}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Recordatorios automaticos</p>
              <p className="text-xs text-muted-foreground">24h y 2h antes de cada cita</p>
            </div>
            <Switch
              checked={form.autoReminders}
              onCheckedChange={(v) => setForm((f) => ({ ...f, autoReminders: v }))}
            />
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-3">
          <Label>Preguntas frecuentes</Label>
          <div className="space-y-2">
            {form.faqs.map((faq, idx) => (
              <div key={idx} className="bg-white border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={faq.question}
                    onChange={(e) => updateFaq(idx, "question", e.target.value)}
                    placeholder="Pregunta"
                    className="h-8 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeFaq(idx)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <Textarea
                  value={faq.answer}
                  onChange={(e) => updateFaq(idx, "answer", e.target.value)}
                  placeholder="Respuesta"
                  rows={1}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addFaq}
            className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar pregunta frecuente
          </button>
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
