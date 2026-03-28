import Link from "next/link"

export function LandingFooter() {
  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">DN</span>
              </div>
              <span className="font-semibold text-white">DN Clínicas</span>
            </div>
            <p className="text-sm leading-relaxed">
              Sistema de gestión inteligente para clínicas estéticas, dentales y de belleza en Costa Rica.
            </p>
          </div>

          {/* Producto */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Producto</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#solucion" className="hover:text-white transition-colors">Recepcionista IA</Link></li>
              <li><Link href="/#solucion" className="hover:text-white transition-colors">Agente Marketing</Link></li>
              <li><Link href="/#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</Link></li>
              <li><Link href="/#como-funciona" className="hover:text-white transition-colors">Cómo funciona</Link></li>
            </ul>
          </div>

          {/* Compañía */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Compañía</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/precios" className="hover:text-white transition-colors">Precios</Link></li>
              <li><Link href="/demo" className="hover:text-white transition-colors">Demo</Link></li>
              <li><Link href="/registro" className="hover:text-white transition-colors">Crear cuenta</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Iniciar sesión</Link></li>
            </ul>
          </div>

          {/* Soporte */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Soporte</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#faq" className="hover:text-white transition-colors">Preguntas frecuentes</Link></li>
              <li>
                <a
                  href="https://wa.me/50612345678"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm">© 2026 Digital Nomads — digital-nomads.co</p>
          <p className="text-sm">Hecho en Costa Rica 🇨🇷</p>
        </div>
      </div>
    </footer>
  )
}
