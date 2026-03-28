import Link from "next/link"
import { ArrowRight, MessageCircle } from "lucide-react"

export function CTAFinal() {
  return (
    <section className="py-16 sm:py-20 bg-gradient-to-br from-teal-600 to-teal-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white rounded-full translate-y-1/2" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
          Tu clínica merece funcionar sola.
        </h2>
        <p className="text-teal-100 text-lg mb-3">
          Empezá hoy. 14 días gratis. Sin tarjeta.
        </p>
        <p className="text-teal-200/80 text-sm mb-8">
          Configuración en 15 minutos. Resultados desde el día 1.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link
            href="/registro"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-teal-700 font-bold text-base hover:bg-teal-50 transition-all shadow-xl"
          >
            Crear mi cuenta gratis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 text-teal-100/80 text-sm">
          <MessageCircle className="w-4 h-4" />
          <span>
            ¿Tenés dudas?{" "}
            <a
              href="https://wa.me/50612345678"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              Escribinos por WhatsApp
            </a>
          </span>
        </div>
      </div>
    </section>
  )
}
