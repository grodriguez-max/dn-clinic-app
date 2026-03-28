import {
  Calendar,
  Users,
  FileImage,
  Globe,
  Receipt,
  Bell,
  Bot,
  TrendingUp,
  Share2,
  BarChart3,
  UserCheck,
  Clock,
} from "lucide-react"

const features = [
  { icon: Calendar, title: "Agenda visual por profesional", desc: "Drag & drop, colores por servicio, vista día/semana" },
  { icon: Users, title: "CRM de pacientes completo", desc: "Historial clínico, notas, tratamientos, fotos" },
  { icon: FileImage, title: "Ficha clínica con fotos", desc: "Antes/después, consentimientos, evolución" },
  { icon: Globe, title: "Reserva online pública", desc: "Link para bio de Instagram, WhatsApp, o sitio web" },
  { icon: Receipt, title: "Factura electrónica CR", desc: "Conforme a Hacienda: FE, TE, notas de crédito" },
  { icon: Bell, title: "Recordatorios automáticos", desc: "Confirmaciones y recordatorios por WhatsApp" },
  { icon: Bot, title: "Recepcionista IA 24/7", desc: "Responde, confirma, reagenda. Sin intervención humana" },
  { icon: TrendingUp, title: "Marketing automatizado", desc: "Reactivación, cumpleaños, reseñas en Google" },
  { icon: Share2, title: "Contenido para redes", desc: "Generación de posts con IA para Instagram y Facebook" },
  { icon: BarChart3, title: "Métricas y reportes", desc: "Exportables a Excel. Ingreso, ocupación, retención" },
  { icon: UserCheck, title: "Multi-profesional", desc: "Horarios individuales por profesional y servicio" },
  { icon: Clock, title: "Duración personalizable", desc: "Por profesional, servicio, o tipo de procedimiento" },
]

export function Features() {
  return (
    <section id="funcionalidades" className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Todo lo que necesita tu clínica
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            No es solo una agenda. Es un sistema completo de gestión con IA incluida.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 border border-gray-200 flex gap-3 hover:border-teal-200 hover:shadow-sm transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center shrink-0 mt-0.5">
                <f.icon className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-900 mb-0.5">{f.title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
