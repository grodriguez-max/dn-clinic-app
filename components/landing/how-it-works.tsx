import { Settings, Bot, BarChart3 } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: Settings,
    title: "Configurá tu clínica en 15 minutos",
    description:
      "Un wizard te guía paso a paso: servicios, equipo, horarios, WhatsApp. Sin necesidad de saber de tecnología.",
    detail: "Nombre, logo, servicios, precios, profesionales, horarios de atención. Todo en una sola pantalla.",
  },
  {
    number: "02",
    icon: Bot,
    title: "Tu recepcionista virtual empieza a trabajar",
    description:
      "Responde WhatsApp, confirma citas, reduce no-shows desde el día 1. El agente de marketing activa campañas automáticamente.",
    detail: "Los agentes aprenden el tono de tu clínica y trabajan de fondo, 24 horas al día.",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Mirá los resultados en tu dashboard",
    description:
      "Métricas en tiempo real, agenda organizada, pacientes felices. Sabés exactamente qué pasa en tu clínica sin estar presente.",
    detail: "Reportes exportables, historial de conversaciones del agente, facturas electrónicas.",
  },
]

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-16 sm:py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Cómo funciona
          </h2>
          <p className="text-gray-500">Tres pasos y tu clínica está trabajando sola.</p>
        </div>

        <div className="space-y-8">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-5 sm:gap-8">
              {/* Step number + line */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center shrink-0">
                  <step.icon className="w-5 h-5 text-white" />
                </div>
                {i < steps.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gray-200 mt-3" />
                )}
              </div>

              {/* Content */}
              <div className="pb-8">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
                    Paso {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 mb-2">{step.description}</p>
                <p className="text-sm text-gray-400">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
