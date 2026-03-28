"use client"

import { useState } from "react"
import { Building2, DollarSign, Zap, TrendingUp, Activity, CheckCircle, Clock, AlertTriangle } from "lucide-react"

interface ClinicStat {
  id: string
  name: string
  slug: string
  plan: string
  status: string
  basePrice: number
  actionsRevenue: number
  totalRevenue: number
  actionCount: number
  created_at: string
}

interface ActionPricing {
  id: string
  action_type: string
  unit_price: number
  description: string
  is_active: boolean
}

interface Props {
  clinicStats: ClinicStat[]
  mrr: number
  totalActionsRevenue: number
  totalMonthRevenue: number
  aiTokensCost: number
  hostingCost: number
  totalCost: number
  margin: number
  actionPricing: ActionPricing[]
  totalClinics: number
  activeClinics: number
  trialClinics: number
}

const PLAN_BADGE: Record<string, string> = {
  trial: "bg-blue-100 text-blue-700",
  starter: "bg-gray-100 text-gray-700",
  growth: "bg-teal-100 text-teal-700",
  premium: "bg-purple-100 text-purple-700",
}

const STATUS_BADGE: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Activa" },
  trial: { color: "bg-blue-100 text-blue-700", icon: Clock, label: "Trial" },
  past_due: { color: "bg-red-100 text-red-700", icon: AlertTriangle, label: "Pago pendiente" },
  cancelled: { color: "bg-gray-100 text-gray-600", icon: AlertTriangle, label: "Cancelada" },
  none: { color: "bg-gray-100 text-gray-500", icon: Clock, label: "Sin sub" },
}

const ACTION_LABELS: Record<string, string> = {
  appointment_created_by_agent: "Cita agendada IA",
  appointment_confirmed_by_agent: "Cita confirmada IA",
  patient_reactivated: "Paciente reactivado",
  lead_captured: "Lead capturado",
  review_obtained: "Reseña obtenida",
  campaign_message_sent: "Mensaje campaña",
}

export function AdminClient({
  clinicStats, mrr, totalActionsRevenue, totalMonthRevenue,
  aiTokensCost, hostingCost, totalCost, margin,
  actionPricing, totalClinics, activeClinics, trialClinics,
}: Props) {
  const [tab, setTab] = useState<"clinics" | "revenue" | "pricing">("clinics")
  const [selectedClinic, setSelectedClinic] = useState<ClinicStat | null>(null)

  const fmt = (n: number) => `$${n.toFixed(0)}`
  const marginPct = totalMonthRevenue > 0 ? Math.round((margin / totalMonthRevenue) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <span className="text-xs font-bold">DN</span>
            </div>
            <div>
              <h1 className="font-bold text-white">Admin — Digital Nomads para Clínicas</h1>
              <p className="text-xs text-gray-500">Panel de administración</p>
            </div>
          </div>
          <a href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
            Ir al dashboard →
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Clínicas activas", value: `${activeClinics}/${totalClinics}`, sub: `${trialClinics} en trial`, icon: Building2, color: "text-teal-400" },
            { label: "MRR (base)", value: fmt(mrr), sub: "Cobros base confirmados", icon: DollarSign, color: "text-green-400" },
            { label: "Acciones este mes", value: `+${fmt(totalActionsRevenue)}`, sub: `${clinicStats.reduce((s, c) => s + c.actionCount, 0)} acciones totales`, icon: Zap, color: "text-yellow-400" },
            { label: "Margen estimado", value: `${marginPct}%`, sub: `${fmt(margin)} / ${fmt(totalMonthRevenue)} revenue`, icon: TrendingUp, color: "text-purple-400" },
          ].map((kpi, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{kpi.label}</p>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-xs text-gray-600 mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Infrastructure costs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-300">Costos de infraestructura</span>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <div><span className="text-gray-500">Tokens IA:</span> <span className="font-medium text-white">{fmt(aiTokensCost)}/mes</span></div>
            <div><span className="text-gray-500">Hosting:</span> <span className="font-medium text-white">{fmt(hostingCost)}/mes</span></div>
            <div><span className="text-gray-500">Total costo:</span> <span className="font-medium text-red-400">{fmt(totalCost)}/mes</span></div>
            <div><span className="text-gray-500">Revenue total:</span> <span className="font-medium text-green-400">{fmt(totalMonthRevenue)}/mes</span></div>
            <div><span className="text-gray-500">Margen neto:</span> <span className="font-bold text-teal-400">{fmt(margin)}/mes ({marginPct}%)</span></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-800 mb-6">
          <div className="flex gap-6">
            {[{ id: "clinics", label: "Clínicas" }, { id: "revenue", label: "Revenue" }, { id: "pricing", label: "Precios" }].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as typeof tab)}
                className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? "border-teal-500 text-teal-400"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab: Clinics */}
        {tab === "clinics" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Clínica</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Plan</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Estado</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Base</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Acciones</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Total mes</th>
                </tr>
              </thead>
              <tbody>
                {clinicStats.map((clinic, i) => {
                  const st = STATUS_BADGE[clinic.status] ?? STATUS_BADGE.none
                  return (
                    <tr
                      key={clinic.id}
                      onClick={() => setSelectedClinic(selectedClinic?.id === clinic.id ? null : clinic)}
                      className={`cursor-pointer transition-colors ${
                        i > 0 ? "border-t border-gray-800" : ""
                      } hover:bg-gray-800/50`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-sm text-white">{clinic.name}</div>
                        <div className="text-xs text-gray-500">{clinic.slug}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_BADGE[clinic.plan] ?? "bg-gray-800 text-gray-400"}`}>
                          {clinic.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium w-fit ${st.color}`}>
                          <st.icon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-300 text-right">{fmt(clinic.basePrice)}</td>
                      <td className="px-5 py-3.5 text-sm text-yellow-400 text-right">+{fmt(clinic.actionsRevenue)}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-teal-400 text-right">{fmt(clinic.totalRevenue)}</td>
                    </tr>
                  )
                })}
                <tr className="border-t-2 border-gray-700 bg-gray-800/50">
                  <td className="px-5 py-3 text-sm font-bold text-white" colSpan={3}>Total</td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-300 text-right">{fmt(mrr)}</td>
                  <td className="px-5 py-3 text-sm font-bold text-yellow-400 text-right">+{fmt(totalActionsRevenue)}</td>
                  <td className="px-5 py-3 text-sm font-bold text-teal-400 text-right">{fmt(totalMonthRevenue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Revenue */}
        {tab === "revenue" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-semibold text-gray-200 mb-4">Desglose de revenue</h3>
              <div className="space-y-3">
                <RevenueRow label="MRR (suscripciones base)" value={mrr} color="text-green-400" />
                <RevenueRow label="Acciones de agentes" value={totalActionsRevenue} color="text-yellow-400" />
                <div className="border-t border-gray-700 pt-3">
                  <RevenueRow label="Total revenue estimado" value={totalMonthRevenue} color="text-teal-400" bold />
                </div>
                <div className="border-t border-gray-700 pt-3">
                  <RevenueRow label="Costos de infra" value={-totalCost} color="text-red-400" />
                  <RevenueRow label="Margen neto" value={margin} color="text-purple-400" bold />
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-semibold text-gray-200 mb-4">Por plan</h3>
              <div className="space-y-3">
                {["starter", "growth", "premium"].map((p) => {
                  const count = clinicStats.filter((c) => c.plan === p && c.status === "active").length
                  const prices = { starter: 99, growth: 199, premium: 299 }
                  const rev = count * (prices[p as keyof typeof prices] ?? 0)
                  return (
                    <div key={p} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_BADGE[p]}`}>{p}</span>
                        <span className="text-sm text-gray-400">{count} clínica{count !== 1 ? "s" : ""}</span>
                      </div>
                      <span className="font-medium text-white">{fmt(rev)}/mes</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Pricing */}
        {tab === "pricing" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h3 className="font-semibold text-gray-200">Precios por acción</h3>
              <p className="text-xs text-gray-500 mt-0.5">Configurar directamente en la tabla action_pricing de Supabase.</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Tipo de acción</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Descripción</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Precio</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Activo</th>
                </tr>
              </thead>
              <tbody>
                {actionPricing.map((ap, i) => (
                  <tr key={ap.id} className={i > 0 ? "border-t border-gray-800" : ""}>
                    <td className="px-5 py-3 text-sm font-medium text-white">
                      {ACTION_LABELS[ap.action_type] ?? ap.action_type}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">{ap.description}</td>
                    <td className="px-5 py-3 text-sm font-bold text-teal-400 text-right">
                      ${Number(ap.unit_price).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ap.is_active ? "bg-green-900 text-green-400" : "bg-red-900 text-red-400"}`}>
                        {ap.is_active ? "Sí" : "No"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function RevenueRow({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
  const fmt = (n: number) => `$${Math.abs(n).toFixed(0)}`
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? "font-bold text-gray-200" : "text-gray-400"}`}>{label}</span>
      <span className={`text-sm font-${bold ? "bold" : "medium"} ${color}`}>
        {value < 0 ? "-" : "+"}{fmt(value)}
      </span>
    </div>
  )
}
