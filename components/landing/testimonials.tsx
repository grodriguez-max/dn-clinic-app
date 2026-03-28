import { Star } from "lucide-react"

const testimonials = [
  {
    name: "Dra. Ana Mora",
    clinic: "Estética Bella Vista, San José",
    avatar: "AM",
    quote:
      "Antes perdía 8 citas por semana. Ahora el agente confirma todo y mi tasa de no-shows bajó de 25% a 3%. La clínica prácticamente se maneja sola.",
    metric: "−22% no-shows",
  },
  {
    name: "Lic. Carlos Solano",
    clinic: "Dental Plus, Heredia",
    avatar: "CS",
    quote:
      "Mis pacientes me preguntan si contraté a una nueva recepcionista. La IA responde tan natural que nadie nota la diferencia. Y yo duermo tranquilo.",
    metric: "+40% recurrencia",
  },
  {
    name: "Dra. Sofía Ramírez",
    clinic: "Centro Estético CR, Liberia",
    avatar: "SR",
    quote:
      "El agente de marketing reactivó 23 pacientes en el primer mes. Eso son ₡3 millones de revenue que hubiera perdido sin esta herramienta.",
    metric: "₡3M recuperados",
  },
]

export function Testimonials() {
  return (
    <section className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Lo que dicen nuestras clínicas
          </h2>
          <p className="text-gray-500">Resultados reales de quienes ya confían en nosotros.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <p className="text-gray-700 text-sm leading-relaxed mb-5 italic">"{t.quote}"</p>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-teal-700">{t.avatar}</span>
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.clinic}</div>
                </div>
                <div className="ml-auto">
                  <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
                    {t.metric}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
