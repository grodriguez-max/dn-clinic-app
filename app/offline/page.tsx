"use client"

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-8">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Sin conexión</h1>
        <p className="text-slate-400 text-sm mb-6">No hay conexión a internet. Algunas funciones pueden no estar disponibles.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-teal-500 text-white text-sm font-medium hover:bg-teal-400 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
