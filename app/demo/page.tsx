import type { Metadata } from "next"
import { LandingNav } from "@/components/landing/nav"
import { LandingFooter } from "@/components/landing/footer"
import { Play, Calendar, MessageCircle, TrendingUp, Check } from "lucide-react"
import { DemoForm } from "./demo-form"

export const metadata: Metadata = {
  title: "Demo — DN Clínicas",
  description:
    "Mirá DN Clínicas en acción. Demo interactiva del sistema de gestión con IA para clínicas en Costa Rica.",
}

const demoFeatures = [
  "Recepcionista IA respondiendo WhatsApp en tiempo real",
  "Agenda con citas y confirmaciones automáticas",
  "Panel de métricas con no-shows y retención",
  "Agente de marketing lanzando campañas",
  "Generación de factura electrónica CR",
  "Reserva online desde el celular",
]

const steps = [
  { icon: Calendar, title: "Agendá una demo de 30 min", desc: "Un especialista te muestra el sistema con ejemplos de tu tipo de clínica." },
  { icon: MessageCircle, title: "Respondemos tus preguntas", desc: "Preguntas técnicas, de pricing, de implementación. Sin presión de venta." },
  { icon: TrendingUp, title: "Empezás tu trial gratis", desc: "14 días gratis con todas las funciones activas. Sin tarjeta." },
]

export default function DemoPage() {
  return (
    <div className="bg-white min-h-screen">
      <LandingNav />

      <main className="pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-14 items-start">
            {/* Left: Demo video placeholder + features */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Mirá DN Clínicas en acción
              </h1>
              <p className="text-gray-500 mb-8">
                Un recorrido de 5 minutos por las funciones principales. Desde la agenda hasta la
                recepcionista IA respondiendo WhatsApp.
              </p>

              {/* Video placeholder */}
              <div className="bg-gray-900 rounded-2xl aspect-video flex items-center justify-center mb-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-900/40 to-gray-900" />
                <div className="relative text-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-3">
                    <Play className="w-7 h-7 text-white ml-1" />
                  </div>
                  <p className="text-white font-semibold">Demo de 5 minutos</p>
                  <p className="text-white/60 text-sm">Pronto disponible</p>
                </div>
              </div>

              {/* Features list */}
              <div className="space-y-2">
                {demoFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-teal-500 shrink-0" />
                    <span className="text-gray-700">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Book demo form (client component) */}
            <DemoForm />
          </div>

          {/* How demo works */}
          <div className="mt-16 border-t border-gray-100 pt-14">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              ¿Qué pasa en la demo?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {steps.map((s, i) => (
                <div key={i} className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-3">
                    <s.icon className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="font-semibold text-gray-900 mb-1">{s.title}</div>
                  <p className="text-sm text-gray-500">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
