"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function DemoForm() {
  function handleSubmit() {
    window.open(
      "https://wa.me/50612345678?text=Hola,%20quiero%20agendar%20una%20demo%20de%20DN%20Cl%C3%ADnicas",
      "_blank"
    )
  }

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Agendá una demo personalizada</h2>
        <p className="text-sm text-gray-500 mb-5">30 minutos con un especialista. Sin compromiso.</p>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                placeholder="Dra. Ana Mora"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Clínica</label>
              <input
                type="text"
                placeholder="Bella Vista"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="ana@bellavista.cr"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp</label>
            <input
              type="tel"
              placeholder="+506 8888-9999"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de clínica</label>
            <select className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-600">
              <option value="">Seleccioná...</option>
              <option value="estetica">Clínica estética / spa</option>
              <option value="dental">Clínica dental</option>
              <option value="medica">Clínica médica / wellness</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition-colors"
          >
            Agendar demo gratuita <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-3">
          También podés escribirnos directamente por WhatsApp
        </p>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-500 mb-3">O empezá el trial directo, sin demo</p>
        <Link
          href="/registro"
          className="inline-flex items-center gap-2 text-sm text-teal-600 font-semibold hover:text-teal-700"
        >
          Crear cuenta gratis — 14 días <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
