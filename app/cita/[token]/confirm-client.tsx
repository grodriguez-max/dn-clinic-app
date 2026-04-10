"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle } from "lucide-react"
import { confirmAppointmentByToken } from "./confirm-actions"

interface Props {
  token: string
  alreadyConfirmed: boolean
  clinicPhone?: string
}

export function ConfirmClient({ token, alreadyConfirmed, clinicPhone }: Props) {
  const [state, setState] = useState<"idle" | "confirming" | "done" | "error">(
    alreadyConfirmed ? "done" : "idle"
  )
  const [msg, setMsg] = useState("")

  async function handleConfirm() {
    setState("confirming")
    const res = await confirmAppointmentByToken(token)
    if (res.error) {
      setMsg(res.error)
      setState("error")
    } else {
      setState("done")
    }
  }

  if (state === "done") {
    return (
      <div className="text-center space-y-3">
        <div className="flex items-center gap-2 justify-center text-emerald-600 bg-emerald-50 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">¡Gracias! Tu asistencia está confirmada.</span>
        </div>
        {clinicPhone && (
          <p className="text-xs text-muted-foreground">
            Si necesitás cancelar o cambiar, escribinos al{" "}
            <a
              href={`https://wa.me/${clinicPhone.replace(/\D/g, "")}`}
              className="text-primary underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          </p>
        )}
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="text-center space-y-3">
        <div className="flex items-center gap-2 justify-center text-red-600 bg-red-50 rounded-xl px-4 py-3">
          <XCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm">{msg}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        onClick={handleConfirm}
        disabled={state === "confirming"}
      >
        <CheckCircle2 className="w-4 h-4 mr-2" />
        {state === "confirming" ? "Confirmando..." : "Sí, confirmo mi asistencia"}
      </Button>

      {clinicPhone && (
        <a
          href={`https://wa.me/${clinicPhone.replace(/\D/g, "")}?text=Hola, quiero cancelar o reagendar mi cita.`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" className="w-full">
            <XCircle className="w-4 h-4 mr-2" />
            Necesito cancelar o cambiar
          </Button>
        </a>
      )}
    </div>
  )
}
