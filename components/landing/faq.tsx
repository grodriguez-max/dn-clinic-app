"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    q: "¿Necesito saber de tecnología para usarlo?",
    a: "No. El wizard te guía paso a paso. Si sabés usar WhatsApp, podés usar nuestro sistema. La configuración inicial toma menos de 15 minutos.",
  },
  {
    q: "¿Cómo funciona la recepcionista virtual?",
    a: "Es un agente de IA que se conecta a tu WhatsApp. Responde automáticamente las preguntas de tus pacientes, confirma citas, reagenda cancelaciones, y te avisa cuando hay algo que necesita tu atención.",
  },
  {
    q: "¿Mis pacientes van a saber que hablan con una IA?",
    a: "La recepcionista virtual es muy natural y cálida. Muchos pacientes no notan la diferencia. Y si alguien necesita hablar con un humano, el sistema escala la conversación inmediatamente.",
  },
  {
    q: "¿Funciona con factura electrónica de Costa Rica?",
    a: "Sí. Generamos factura electrónica, tiquete electrónico y notas de crédito conforme a la normativa de Hacienda v4.3. Con integración a Alegra o en modo local.",
  },
  {
    q: "¿Puedo probarlo antes de pagar?",
    a: "Sí. Tenés 14 días gratis sin tarjeta de crédito. Incluye todas las funciones del plan Growth. Si no te convence, no pagás nada.",
  },
  {
    q: "¿Qué pasa si quiero cancelar?",
    a: "Cancelás cuando quieras. Sin contratos. Sin penalidades. Tus datos te los exportamos en Excel o CSV.",
  },
  {
    q: "¿Funciona en mi celular?",
    a: "Sí. El dashboard es 100% responsive. Podés ver tu agenda, métricas y mensajes del agente desde cualquier dispositivo.",
  },
  {
    q: "¿Qué pasa cuando termina el trial?",
    a: "Podés elegir un plan y continuar. Si no elegís, los agentes de IA se pausan pero tu dashboard y datos se mantienen disponibles en modo básico.",
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="py-16 sm:py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Preguntas frecuentes
          </h2>
          <p className="text-gray-500">Todo lo que necesitás saber antes de empezar.</p>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold text-gray-900 text-sm sm:text-base pr-4">{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open === i && (
                <div className="px-5 pb-4">
                  <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
