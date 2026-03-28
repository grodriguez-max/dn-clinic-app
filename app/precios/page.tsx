import type { Metadata } from "next"
import Link from "next/link"
import { LandingNav } from "@/components/landing/nav"
import { LandingFooter } from "@/components/landing/footer"
import { Check, X, ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Precios — DN Clínicas",
  description:
    "Planes desde $99/mes. 14 días gratis sin tarjeta. Starter, Growth y Premium para clínicas estéticas y dentales en Costa Rica.",
}

const plans = [
  {
    name: "Starter",
    price: 99,
    description: "Para clínicas que están empezando con IA",
    cta: "Empezar gratis",
    href: "/registro",
    highlight: false,
    cap: 199,
    actionCap: 100,
    features: [
      { text: "Recepcionista IA (1 agente)", included: true },
      { text: "Agenda visual y CRM completo", included: true },
      { text: "Reserva online pública", included: true },
      { text: "Factura electrónica CR", included: true },
      { text: "Hasta 500 pacientes en CRM", included: true },
      { text: "Hasta 3 profesionales", included: true },
      { text: "Métricas básicas", included: true },
      { text: "Soporte por email", included: true },
      { text: "Agente de marketing", included: false },
      { text: "Métricas con export Excel", included: false },
      { text: "Soporte WhatsApp", included: false },
      { text: "Dominio custom para reservas", included: false },
    ],
  },
  {
    name: "Growth",
    price: 199,
    description: "La opción más popular para clínicas en crecimiento",
    cta: "Empezar gratis",
    href: "/registro",
    highlight: true,
    badge: "Más popular",
    cap: 499,
    actionCap: 300,
    features: [
      { text: "Recepcionista IA + Agente Marketing", included: true },
      { text: "Agenda visual y CRM completo", included: true },
      { text: "Reserva online pública", included: true },
      { text: "Factura electrónica CR", included: true },
      { text: "Hasta 2,000 pacientes en CRM", included: true },
      { text: "Hasta 8 profesionales", included: true },
      { text: "Métricas completas + export Excel", included: true },
      { text: "Soporte WhatsApp + Email", included: true },
      { text: "Dominio custom para reservas", included: false },
      { text: "API access", included: false },
      { text: "Personalización de agentes", included: false },
      { text: "Integración contable", included: false },
    ],
  },
  {
    name: "Premium",
    price: 299,
    description: "Para clínicas que quieren personalización total",
    cta: "Contactar ventas",
    href: "/demo",
    highlight: false,
    cap: null,
    actionCap: null,
    features: [
      { text: "Todo de Growth, más:", included: true },
      { text: "Pacientes y profesionales ilimitados", included: true },
      { text: "Personalización completa de agentes", included: true },
      { text: "API access", included: true },
      { text: "Dominio custom para reservas", included: true },
      { text: "Integración contable", included: true },
      { text: "Soporte prioritario", included: true },
      { text: "Setup asistido (valor $1,500)", included: true },
      { text: "Sin tope de acciones", included: true },
    ],
  },
]

const actions = [
  { name: "Cita agendada por el agente", price: "$1.50", desc: "Cada cita creada por la recepcionista IA (no por humano)" },
  { name: "Cita confirmada por el agente", price: "$0.50", desc: "Cada confirmación exitosa de cita existente" },
  { name: "Paciente reactivado", price: "$2.00", desc: "Paciente inactivo 60+ días que agenda por campaña" },
  { name: "Lead capturado", price: "$1.00", desc: "Nuevo paciente via WhatsApp o reserva online" },
  { name: "Reseña obtenida", price: "$1.50", desc: "Paciente que deja reseña en Google" },
  { name: "Mensaje de campaña", price: "$0.10", desc: "Cada mensaje de campaña de marketing enviado" },
]

export default function PreciosPage() {
  return (
    <div className="bg-white min-h-screen">
      <LandingNav />

      <main className="pt-24 pb-20">
        {/* Header */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center mb-14">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Precios simples y transparentes
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-3">
            14 días gratis en cualquier plan. Sin tarjeta. Sin contratos. Cancelás cuando quieras.
          </p>
        </div>

        {/* Plans */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-20">
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-6 relative ${
                  plan.highlight
                    ? "border-teal-500 shadow-xl shadow-teal-100"
                    : "border-gray-200"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h2>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-500 text-sm">/mes base</span>
                  </div>
                  {plan.cap ? (
                    <p className="text-xs text-teal-600 font-medium mb-2">
                      Tope máximo: ${plan.cap}/mes (base + acciones)
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mb-2">Sin tope de acciones</p>
                  )}
                  <p className="text-sm text-gray-500">{plan.description}</p>
                </div>

                <Link
                  href={plan.href}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm mb-5 transition-all ${
                    plan.highlight
                      ? "bg-teal-600 text-white hover:bg-teal-700"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {plan.cta} <ArrowRight className="w-4 h-4" />
                </Link>

                <ul className="space-y-2">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      {f.included ? (
                        <Check className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                      )}
                      <span className={f.included ? "text-gray-700" : "text-gray-400"}>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* AaaS pricing */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Cobro por resultado del agente
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Además del plan base, se cobra por cada acción que el agente ejecuta exitosamente.
              Si el agente no genera resultados, no te cobramos más.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-5 py-3 text-sm font-semibold text-gray-700">Acción del agente</th>
                  <th className="text-right px-5 py-3 text-sm font-semibold text-gray-700">Costo</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a, i) => (
                  <tr key={i} className={i < actions.length - 1 ? "border-b border-gray-200" : ""}>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-sm text-gray-900">{a.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{a.desc}</div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-bold text-teal-600 text-sm">{a.price}</span>
                      <span className="text-xs text-gray-400"> /acción</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Example */}
          <div className="mt-6 bg-teal-50 border border-teal-200 rounded-2xl p-5">
            <h3 className="font-bold text-teal-900 mb-3">Ejemplo real — Clínica Growth ($199/mes base)</h3>
            <div className="space-y-1.5 text-sm mb-4">
              {[
                { item: "Base Plan Growth", amount: "$199.00" },
                { item: "60 citas agendadas por IA × $1.50", amount: "$90.00" },
                { item: "120 citas confirmadas × $0.50", amount: "$60.00" },
                { item: "8 pacientes reactivados × $2.00", amount: "$16.00" },
                { item: "15 leads capturados × $1.00", amount: "$15.00" },
                { item: "3 reseñas obtenidas × $1.50", amount: "$4.50" },
                { item: "200 mensajes de campaña × $0.10", amount: "$20.00" },
              ].map((row, i) => (
                <div key={i} className="flex justify-between text-teal-800">
                  <span>{row.item}</span>
                  <span className="font-medium">{row.amount}</span>
                </div>
              ))}
              <div className="border-t border-teal-300 pt-2 flex justify-between font-bold text-teal-900">
                <span>Total del mes</span>
                <span>$404.50</span>
              </div>
            </div>
            <p className="text-xs text-teal-700">
              Tope Growth: $499/mes. La clínica está feliz porque cada cita vale ₡25,000–₡150,000 ($45–$270).
            </p>
          </div>
        </div>

        {/* FAQ strip */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-gray-500 mb-4">
            ¿Tenés más preguntas sobre los precios?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/#faq"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-teal-300 transition-colors"
            >
              Ver preguntas frecuentes
            </Link>
            <Link
              href="/registro"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors"
            >
              Empezar gratis — 14 días <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
