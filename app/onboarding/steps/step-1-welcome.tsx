import { Button } from "@/components/ui/button"
import { Calendar, Users, Bot, Bell } from "lucide-react"

interface Props {
  clinicName: string
  onNext: () => void
}

const features = [
  { icon: Calendar, text: "Tu agenda digital lista" },
  { icon: Users,    text: "Tu base de pacientes organizada" },
  { icon: Bot,      text: "Tu recepcionista virtual activa en WhatsApp" },
  { icon: Bell,     text: "Recordatorios automaticos de citas" },
]

export function Step1Welcome({ clinicName, onNext }: Props) {
  return (
    <div className="max-w-lg mx-auto text-center space-y-8">
      <div>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-foreground">
          Bienvenido a DN Clinicas
        </h2>
        <p className="text-muted-foreground mt-3 text-base">
          Vamos a configurar <span className="font-medium text-foreground">{clinicName}</span> en menos de 15 minutos.
          Al terminar, vas a tener:
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 text-left">
        {features.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium">{text}</span>
          </div>
        ))}
      </div>

      <Button size="lg" className="w-full text-base" onClick={onNext}>
        Empezar configuracion →
      </Button>
    </div>
  )
}
