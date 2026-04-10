import { getAppointmentByToken } from "./confirm-actions"
import { ConfirmClient } from "./confirm-client"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CheckCircle2, XCircle, Calendar, Clock, User, Stethoscope } from "lucide-react"

interface Props { params: { token: string } }

function toCR(iso: string) {
  return new Date(new Date(iso).getTime() - 6 * 60 * 60 * 1000)
}

export default async function ConfirmPage({ params }: Props) {
  const appt = await getAppointmentByToken(params.token)

  if (!appt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-8 max-w-sm w-full text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-gray-900">Cita no encontrada</h1>
          <p className="text-sm text-muted-foreground mt-1">
            El enlace puede haber expirado o ser inválido.
          </p>
        </div>
      </div>
    )
  }

  if (appt.status === "cancelled") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-8 max-w-sm w-full text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-gray-900">Cita cancelada</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Esta cita ya fue cancelada. Escribinos si querés reagendar.
          </p>
        </div>
      </div>
    )
  }

  const startCR = toCR(appt.start_time)
  const dateStr = format(startCR, "EEEE d 'de' MMMM, yyyy", { locale: es })
  const timeStr = format(startCR, "HH:mm")
  const clinic  = appt.clinics as unknown as { name: string; phone: string } | null
  const patient = appt.patients as unknown as { name: string } | null
  const prof    = appt.professionals as unknown as { name: string } | null
  const svc     = appt.services as unknown as { name: string } | null

  const alreadyConfirmed = !!appt.confirmation_confirmed_at

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 max-w-sm w-full">
        {/* Clinic name */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 text-center">
          {clinic?.name ?? "Clínica"}
        </p>

        <h1 className="text-xl font-bold text-gray-900 text-center mb-6">
          {alreadyConfirmed ? "¡Cita confirmada!" : "Confirmar cita"}
        </h1>

        {alreadyConfirmed && (
          <div className="flex items-center gap-2 justify-center mb-4 text-emerald-600 bg-emerald-50 rounded-xl px-4 py-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">Ya confirmaste esta cita</span>
          </div>
        )}

        {/* Appointment details */}
        <div className="space-y-3 bg-muted/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium">{patient?.name ?? "—"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Stethoscope className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>{svc?.name ?? "—"} · {prof?.name ?? "—"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="capitalize">{dateStr}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>{timeStr} hrs</span>
          </div>
        </div>

        {/* Interactive buttons */}
        <ConfirmClient
          token={params.token}
          alreadyConfirmed={alreadyConfirmed}
          clinicPhone={clinic?.phone}
        />
      </div>
    </div>
  )
}
