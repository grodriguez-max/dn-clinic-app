export function Problem() {
  const items = [
    "Respondés WhatsApp hasta las 11pm y los mensajes siguen llegando",
    "Perdés 5-10 citas por semana porque los pacientes se olvidan",
    "Tu agenda es un cuaderno con tachaduras y doble reservaciones",
    "No sabés cuánto facturaste este mes sin revisar 3 cuadernos",
    "Pacientes que se hicieron un tratamiento y nunca más volvieron",
    "Tu recepcionista se enferma y nadie entiende la agenda",
  ]

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          ¿Te suena familiar?
        </h2>
        <p className="text-gray-500 mb-10">
          La realidad de manejar una clínica sin las herramientas correctas.
        </p>

        <div className="space-y-3 text-left mb-10">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3"
            >
              <div className="w-5 h-5 rounded border-2 border-red-300 mt-0.5 shrink-0" />
              <p className="text-gray-700 text-sm sm:text-base">{item}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 text-white rounded-2xl px-6 py-5">
          <p className="text-lg font-semibold">
            Si marcaste 3 o más, tu clínica está{" "}
            <span className="text-red-400">perdiendo dinero cada día.</span>
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Cada cita perdida son ₡25,000–₡150,000 que se van a la competencia.
          </p>
        </div>
      </div>
    </section>
  )
}
