import Link from "next/link"
import { ArrowRight, MessageCircle, Calendar, TrendingUp, Star } from "lucide-react"

export function Hero() {
  return (
    <section className="pt-28 pb-16 sm:pt-32 sm:pb-20 bg-gradient-to-b from-teal-50/60 to-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div>
            {/* Social proof badge */}
            <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-full px-4 py-1.5 text-sm text-teal-700 font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              +500 citas gestionadas por IA este mes
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-5xl font-bold text-gray-900 leading-tight mb-5">
              Tu clínica funcionando sola{" "}
              <span className="text-teal-600">mientras vos atendés pacientes.</span>
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              Una recepcionista virtual que responde WhatsApp 24/7, confirma citas, reduce no-shows un{" "}
              <strong className="text-gray-900">85%</strong>, y un asistente de marketing que llena tu agenda
              automáticamente.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:border-teal-300 hover:text-teal-700 transition-all"
              >
                Ver demo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/registro"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20"
              >
                Empezar gratis — 14 días
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <p className="text-sm text-gray-500">Sin tarjeta de crédito. Sin contratos. Cancelás cuando quieras.</p>
          </div>

          {/* Right: Dashboard mockup */}
          <div className="relative lg:pl-6">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

function DashboardMockup() {
  return (
    <div className="relative">
      {/* Main dashboard window */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <div className="flex-1 mx-3 h-5 bg-gray-200 rounded text-xs flex items-center justify-center text-gray-500">
            app.tuclinica.com/dashboard
          </div>
        </div>

        {/* Dashboard content */}
        <div className="flex h-52">
          {/* Sidebar */}
          <div className="w-14 bg-gray-900 flex flex-col items-center py-3 gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">DN</span>
            </div>
            {[Calendar, MessageCircle, TrendingUp, Star].map((Icon, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  i === 0 ? "bg-teal-600" : "hover:bg-gray-700"
                }`}
              >
                <Icon className={`w-4 h-4 ${i === 0 ? "text-white" : "text-gray-500"}`} />
              </div>
            ))}
          </div>

          {/* Main area */}
          <div className="flex-1 p-3 bg-gray-50">
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: "Citas hoy", value: "12", color: "text-teal-600" },
                { label: "No-shows", value: "1", color: "text-orange-500" },
                { label: "Nuevos", value: "4", color: "text-blue-600" },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-lg p-2 border border-gray-100">
                  <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Appointment list */}
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              {[
                { name: "María González", service: "Facial", time: "10:00", status: "confirmada" },
                { name: "Carlos Jiménez", service: "Blanqueamiento", time: "11:30", status: "pendiente" },
                { name: "Ana Vargas", service: "Limpieza", time: "13:00", status: "confirmada" },
              ].map((apt, i) => (
                <div key={i} className={`flex items-center gap-2 px-2 py-1.5 ${i < 2 ? "border-b border-gray-50" : ""}`}>
                  <div className="w-1 h-6 rounded-full bg-teal-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-medium text-gray-800 truncate">{apt.name}</div>
                    <div className="text-[9px] text-gray-400">{apt.service} · {apt.time}</div>
                  </div>
                  <div className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    apt.status === "confirmada"
                      ? "bg-teal-50 text-teal-600"
                      : "bg-yellow-50 text-yellow-600"
                  }`}>
                    {apt.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp card */}
      <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-52">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
            <MessageCircle className="w-3.5 h-3.5 text-green-600" />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-gray-800">Recepcionista IA</div>
            <div className="text-[9px] text-gray-400">Ahora mismo</div>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-2 text-[10px] text-gray-700 leading-relaxed">
          "¡Hola! Tu cita del martes a las 10am está confirmada. ¿Necesitás cambiar algo?"
        </div>
        <div className="text-[9px] text-teal-600 font-medium mt-1.5">✓ Enviado a 8 pacientes</div>
      </div>

      {/* Floating stats card */}
      <div className="absolute -top-3 -right-3 bg-white rounded-xl shadow-xl border border-gray-200 p-3">
        <div className="text-[10px] text-gray-500 mb-1">No-shows este mes</div>
        <div className="flex items-end gap-1">
          <div className="text-xl font-bold text-teal-600">85%</div>
          <div className="text-[10px] text-gray-500 mb-0.5">↓ menos</div>
        </div>
      </div>
    </div>
  )
}
