"use client"

import { useState } from "react"
import { CreditCard, Zap, FileText, AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react"
import type { Subscription } from "@/lib/billing/subscription"
import type { PlanId } from "@/lib/billing/stripe"

const ACTION_LABELS: Record<string, string> = {
  appointment_created_by_agent: "Citas agendadas por IA",
  appointment_confirmed_by_agent: "Citas confirmadas por IA",
  patient_reactivated: "Pacientes reactivados",
  lead_captured: "Leads capturados",
  review_obtained: "Reseñas obtenidas",
  campaign_message_sent: "Mensajes de campaña",
}

interface PlatformInvoice {
  id: string
  invoice_number: string
  period_start: string
  period_end: string
  base_amount: number
  actions_amount: number
  total: number
  cap_applied: boolean
  status: string
  paid_at: string | null
  created_at: string
}

interface Props {
  subscription: Subscription | null
  planConfig: { name: string; basePrice: number; actionCap: number | null; totalCap: number | null; agents: number; maxPatients: number | null; maxProfessionals: number | null }
  usage: { total: number; byType: Record<string, { count: number; amount: number }> }
  baseAmount: number
  actionsAmount: number
  totalEstimate: number
  capApplied: boolean
  daysLeft: number | null
  invoices: PlatformInvoice[]
  isOwner: boolean
  allPlans: Record<string, unknown>
}

export function BillingClient({
  subscription,
  planConfig,
  usage,
  baseAmount,
  actionsAmount,
  totalEstimate,
  capApplied,
  daysLeft,
  invoices,
  isOwner,
}: Props) {
  const [tab, setTab] = useState<"overview" | "usage" | "invoices" | "plans">("overview")
  const [loading, setLoading] = useState(false)

  const status = subscription?.status ?? "trial"
  const plan = subscription?.plan ?? "trial"

  const statusConfig = {
    trial: { color: "bg-blue-100 text-blue-700", icon: Clock, label: "Trial activo" },
    active: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Activo" },
    past_due: { color: "bg-red-100 text-red-700", icon: AlertTriangle, label: "Pago pendiente" },
    cancelled: { color: "bg-gray-100 text-gray-600", icon: AlertTriangle, label: "Cancelado" },
    paused: { color: "bg-yellow-100 text-yellow-700", icon: Clock, label: "Pausado" },
  }[status] ?? { color: "bg-gray-100 text-gray-600", icon: Clock, label: status }

  async function handleUpgrade(newPlan: PlanId) {
    setLoading(true)
    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!confirm("¿Seguro que querés cancelar tu suscripción? Seguirás teniendo acceso hasta el final del período.")) return
    setLoading(true)
    try {
      await fetch("/api/billing/cancel", { method: "POST" })
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: "overview", label: "Resumen" },
    { id: "usage", label: "Uso del período" },
    { id: "invoices", label: "Facturas" },
    { id: "plans", label: "Planes" },
  ]

  return (
    <div className="space-y-6">
      {/* Trial banner */}
      {status === "trial" && daysLeft !== null && (
        <div className={`rounded-xl p-4 flex items-center justify-between gap-4 ${
          daysLeft <= 2 ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"
        }`}>
          <div className="flex items-center gap-3">
            <Clock className={`w-5 h-5 ${daysLeft <= 2 ? "text-red-500" : "text-blue-500"}`} />
            <div>
              <div className={`font-semibold text-sm ${daysLeft <= 2 ? "text-red-700" : "text-blue-700"}`}>
                {daysLeft === 0 ? "Tu trial vence hoy" : `Tu trial vence en ${daysLeft} días`}
              </div>
              <div className="text-xs text-gray-500">
                Elegí un plan para mantener los agentes de IA activos.
              </div>
            </div>
          </div>
          <button
            onClick={() => setTab("plans")}
            className="text-sm bg-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors shrink-0"
          >
            Ver planes
          </button>
        </div>
      )}

      {/* Past due banner */}
      {status === "past_due" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <div className="font-semibold text-sm text-red-700">Pago fallido</div>
            <div className="text-xs text-gray-500">
              Actualizá tu método de pago para mantener el servicio activo.
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de tu suscripción y uso de los agentes</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.color}`}>
          <statusConfig.icon className="w-3.5 h-3.5" />
          {statusConfig.label}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Plan actual</div>
          <div className="text-xl font-bold text-gray-900">{planConfig.name}</div>
          <div className="text-sm text-gray-500">${planConfig.basePrice}/mes base</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Estimado este mes</div>
          <div className="text-xl font-bold text-teal-600">${totalEstimate.toFixed(2)}</div>
          {capApplied && <div className="text-xs text-teal-600">Tope aplicado ✓</div>}
          {!capApplied && planConfig.totalCap && (
            <div className="text-xs text-gray-400">Tope: ${planConfig.totalCap}</div>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Acciones del agente</div>
          <div className="text-xl font-bold text-gray-900">{Object.values(usage.byType).reduce((s, v) => s + v.count, 0)}</div>
          <div className="text-sm text-gray-500">+${actionsAmount.toFixed(2)} este período</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Overview */}
      {tab === "overview" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-teal-600" />
              <h3 className="font-semibold text-gray-900">Tu suscripción</h3>
            </div>
            <div className="space-y-2.5 text-sm">
              <Row label="Plan" value={planConfig.name} />
              <Row label="Agentes IA" value={`${planConfig.agents} agente${planConfig.agents > 1 ? "s" : ""}`} />
              <Row label="Pacientes en CRM" value={planConfig.maxPatients ? `Hasta ${planConfig.maxPatients.toLocaleString()}` : "Ilimitados"} />
              <Row label="Profesionales" value={planConfig.maxProfessionals ? `Hasta ${planConfig.maxProfessionals}` : "Ilimitados"} />
              <Row label="Tope mensual" value={planConfig.totalCap ? `$${planConfig.totalCap}/mes` : "Sin tope"} />
              {subscription?.trial_ends_at && status === "trial" && (
                <Row label="Trial vence" value={new Date(subscription.trial_ends_at).toLocaleDateString("es-CR")} />
              )}
              {subscription?.current_period_end && status === "active" && (
                <Row label="Próximo cobro" value={new Date(subscription.current_period_end).toLocaleDateString("es-CR")} />
              )}
            </div>
            {isOwner && status === "active" && (
              <button
                onClick={handleCancel}
                disabled={loading}
                className="mt-4 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Cancelar suscripción
              </button>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              <h3 className="font-semibold text-gray-900">Desglose estimado del mes</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-600">Cargo base ({planConfig.name})</span>
                <span className="font-medium">${baseAmount.toFixed(2)}</span>
              </div>
              {Object.entries(usage.byType).map(([type, data]) => (
                <div key={type} className="flex justify-between text-sm py-1 border-t border-gray-50">
                  <span className="text-gray-500">{ACTION_LABELS[type] ?? type} ({data.count})</span>
                  <span className="font-medium">${data.amount.toFixed(2)}</span>
                </div>
              ))}
              {capApplied && (
                <div className="text-xs text-teal-600 bg-teal-50 px-3 py-2 rounded-lg mt-2">
                  Tope aplicado — no se cobra más de ${planConfig.totalCap}
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200 font-bold">
                <span>Total estimado</span>
                <span className="text-teal-600">${totalEstimate.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Usage */}
      {tab === "usage" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Acciones del período actual</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Cada acción que los agentes ejecutan exitosamente se registra aquí.
            </p>
          </div>
          {Object.keys(usage.byType).length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Los agentes aún no han ejecutado acciones facturables este período.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Acción</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-600">Cantidad</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(usage.byType).map(([type, data], i) => (
                  <tr key={type} className={i > 0 ? "border-t border-gray-100" : ""}>
                    <td className="px-5 py-3 text-sm text-gray-700">{ACTION_LABELS[type] ?? type}</td>
                    <td className="px-5 py-3 text-sm text-gray-700 text-right">{data.count}</td>
                    <td className="px-5 py-3 text-sm font-medium text-teal-600 text-right">${data.amount.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-5 py-3 text-sm font-bold text-gray-900">Total acciones</td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">
                    {Object.values(usage.byType).reduce((s, v) => s + v.count, 0)}
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-teal-600 text-right">${usage.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Invoices */}
      {tab === "invoices" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Historial de facturas</h3>
          </div>
          {invoices.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Aún no hay facturas generadas.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Factura</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Período</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-600">Total</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id} className={i > 0 ? "border-t border-gray-100" : ""}>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{inv.invoice_number}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {inv.period_start} — {inv.period_end}
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-teal-600 text-right">
                      ${Number(inv.total).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        inv.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : inv.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {inv.status === "paid" ? "Pagada" : inv.status === "pending" ? "Pendiente" : inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Plans */}
      {tab === "plans" && (
        <div className="grid md:grid-cols-3 gap-5">
          {(["starter", "growth", "premium"] as Exclude<PlanId, "trial">[]).map((p) => {
            const PLAN_DETAILS: Record<string, { name: string; price: number; cap: number | null; features: string[] }> = {
              starter: { name: "Starter", price: 99, cap: 199, features: ["1 agente (recepcionista)", "Hasta 500 pacientes", "Hasta 3 profesionales", "Métricas básicas", "Soporte email"] },
              growth: { name: "Growth", price: 199, cap: 499, features: ["2 agentes (recepcionista + marketing)", "Hasta 2,000 pacientes", "Hasta 8 profesionales", "Métricas + export Excel", "Soporte WhatsApp + email"] },
              premium: { name: "Premium", price: 299, cap: null, features: ["2 agentes + personalización", "Pacientes ilimitados", "Profesionales ilimitados", "Métricas + API", "Soporte prioritario"] },
            }
            const pc = PLAN_DETAILS[p]
            if (!pc) return null
            const isCurrentPlan = plan === p
            const isHighlight = p === "growth"

            return (
              <div
                key={p}
                className={`rounded-2xl border p-5 ${
                  isHighlight ? "border-teal-500 shadow-lg shadow-teal-100" : "border-gray-200"
                }`}
              >
                {isHighlight && (
                  <div className="text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full inline-block mb-3">
                    Más popular
                  </div>
                )}
                <div className="text-lg font-bold text-gray-900 mb-0.5">{pc.name}</div>
                <div className="text-3xl font-bold text-gray-900 mb-1">${pc.price}<span className="text-sm text-gray-400 font-normal">/mes</span></div>
                {pc.cap && <div className="text-xs text-teal-600 mb-3">Tope: ${pc.cap}/mes</div>}
                {!pc.cap && <div className="text-xs text-gray-400 mb-3">Sin tope de acciones</div>}

                <ul className="space-y-1.5 mb-4">
                  {pc.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <CheckCircle className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <div className="w-full text-center py-2 text-sm text-teal-600 font-semibold bg-teal-50 rounded-lg">
                    Plan actual ✓
                  </div>
                ) : isOwner ? (
                  <button
                    onClick={() => handleUpgrade(p)}
                    disabled={loading}
                    className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isHighlight
                        ? "bg-teal-600 text-white hover:bg-teal-700"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    {loading ? "Procesando..." : p === "premium" ? "Contactar" : "Cambiar a este plan"}
                  </button>
                ) : (
                  <div className="text-xs text-gray-400 text-center">Solo el dueño puede cambiar el plan</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}
