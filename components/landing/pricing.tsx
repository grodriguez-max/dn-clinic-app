import Link from "next/link"
import { Check } from "lucide-react"

const plans = [
  {
    name: "Starter",
    price: "$99",
    period: "/mes",
    description: "Para clínicas que están empezando con IA",
    cta: "Empezar gratis",
    href: "/registro",
    highlight: false,
    features: [
      "Recepcionista IA (1 agente)",
      "Agenda y CRM completo",
      "Reserva online pública",
      "Factura electrónica CR",
      "Hasta 500 pacientes",
      "Hasta 3 profesionales",
      "Métricas básicas",
      "Soporte por email",
    ],
    missing: ["Agente de marketing", "Métricas con export", "Soporte WhatsApp"],
  },
  {
    name: "Growth",
    price: "$199",
    period: "/mes",
    description: "La opción más popular para clínicas en crecimiento",
    cta: "Empezar gratis",
    href: "/registro",
    highlight: true,
    badge: "Más popular",
    features: [
      "Recepcionista IA + Agente Marketing",
      "Agenda y CRM completo",
      "Reserva online pública",
      "Factura electrónica CR",
      "Hasta 2,000 pacientes",
      "Hasta 8 profesionales",
      "Métricas completas + export Excel",
      "Soporte WhatsApp + Email",
    ],
    missing: [],
  },
  {
    name: "Premium",
    price: "$299",
    period: "/mes",
    description: "Para clínicas que quieren personalización total",
    cta: "Contactar",
    href: "/demo",
    highlight: false,
    features: [
      "Todo de Growth, más:",
      "Pacientes ilimitados",
      "Profesionales ilimitados",
      "Personalización de agentes",
      "API access",
      "Dominio custom para reservas",
      "Integración contable",
      "Soporte prioritario",
      "Setup asistido incluido",
    ],
    missing: [],
  },
]

export function Pricing() {
  return (
    <section id="precios" className="py-16 sm:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Precios simples y transparentes
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            14 días gratis en cualquier plan. Sin tarjeta. Sin contratos. Cancelás cuando quieras.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-6 relative ${
                plan.highlight
                  ? "border-teal-500 shadow-xl shadow-teal-100 scale-[1.02]"
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
                <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-gray-500">{plan.description}</p>
              </div>

              <Link
                href={plan.href}
                className={`block text-center py-2.5 rounded-xl font-semibold text-sm mb-5 transition-all ${
                  plan.highlight
                    ? "bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-200"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                {plan.cta} →
              </Link>

              <ul className="space-y-2">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    <span className="text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          Precios en USD. También aplica cobro por resultado del agente.{" "}
          <Link href="/precios" className="text-teal-600 hover:underline">
            Ver detalle completo →
          </Link>
        </p>
      </div>
    </section>
  )
}
