import { Bot, TrendingUp, LayoutDashboard } from "lucide-react"

const solutions = [
  {
    icon: Bot,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    tag: "Agente 1",
    tagColor: "bg-green-50 text-green-700",
    title: "Recepcionista Virtual 24/7",
    description:
      "Responde WhatsApp a las 3am. Confirma citas. Reagenda cancelaciones. Responde preguntas frecuentes. Todo automático — vos solo ves los resultados.",
    features: ["Respuestas instantáneas 24/7", "Confirma y reagenda citas", "Reduce no-shows 85%", "Escala a humano cuando necesita"],
  },
  {
    icon: TrendingUp,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    tag: "Agente 2",
    tagColor: "bg-purple-50 text-purple-700",
    title: "Marketing que llena tu agenda",
    description:
      "Reactiva pacientes que no vuelven. Felicita cumpleaños con descuento. Pide reseñas en Google. Genera contenido para tus redes. Tu clínica siempre presente.",
    features: ["Campañas de reactivación", "Felicitaciones de cumpleaños", "Solicitud de reseñas Google", "Contenido para redes sociales"],
  },
  {
    icon: LayoutDashboard,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    tag: "Dashboard",
    tagColor: "bg-teal-50 text-teal-700",
    title: "Dashboard donde ves todo",
    description:
      "Agenda visual, base de pacientes, métricas de negocio, factura electrónica CR. Todo en un solo lugar, desde tu celular o computadora.",
    features: ["Agenda por profesional", "CRM de pacientes", "Métricas en tiempo real", "Factura electrónica CR"],
  },
]

export function Solution() {
  return (
    <section id="solucion" className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            La solución que tu clínica necesita
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Dos agentes de IA + un dashboard completo. Todo pensado para clínicas en Costa Rica.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {solutions.map((s, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center`}>
                  <s.icon className={`w-6 h-6 ${s.iconColor}`} />
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.tagColor}`}>
                  {s.tag}
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{s.description}</p>

              <ul className="space-y-1.5">
                {s.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
