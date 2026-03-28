const stats = [
  { value: "85%", label: "menos no-shows", sublabel: "vs promedio de la industria" },
  { value: "10hrs", label: "ahorradas por semana", sublabel: "en tareas administrativas" },
  { value: "40%", label: "más pacientes recurrentes", sublabel: "gracias a reactivación automática" },
  { value: "24/7", label: "atención WhatsApp", sublabel: "sin contratar más personal" },
]

export function Stats() {
  return (
    <section className="py-16 sm:py-20 bg-teal-600">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Números que importan
          </h2>
          <p className="text-teal-100">Resultados reales de clínicas que ya usan el sistema</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div
              key={i}
              className="bg-white/10 backdrop-blur rounded-2xl p-5 text-center border border-white/20"
            >
              <div className="text-4xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-teal-100 font-semibold text-sm mb-0.5">{s.label}</div>
              <div className="text-teal-200/70 text-xs">{s.sublabel}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
