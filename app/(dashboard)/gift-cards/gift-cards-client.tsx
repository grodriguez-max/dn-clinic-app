"use client"

import { useState, useTransition } from "react"
import { Gift, Plus, CheckCircle, XCircle, Clock, Search, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn, formatCurrency } from "@/lib/utils"
import { createGiftCard, redeemGiftCard } from "@/app/(dashboard)/configuracion/gift-card-actions"

interface GiftCard {
  id: string
  code: string
  amount: number
  balance: number
  status: "active" | "redeemed" | "expired"
  expires_at: string
  created_at: string
  purchased_by?: string | null
}

interface Patient {
  id: string
  name: string
}

interface Props {
  clinicId: string
  initialCards: GiftCard[]
  patients: Patient[]
}

const PRESET_AMOUNTS = [5000, 10000, 20000, 50000, 100000]

export function GiftCardsClient({ clinicId, initialCards, patients }: Props) {
  const [cards, setCards] = useState<GiftCard[]>(initialCards)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Create form
  const [amount, setAmount] = useState("")
  const [purchasedBy, setPurchasedBy] = useState("")
  const [validityDays, setValidityDays] = useState("365")

  // Redeem form
  const [redeemCode, setRedeemCode] = useState("")
  const [redeemAmount, setRedeemAmount] = useState("")
  const [redeemPatient, setRedeemPatient] = useState("")
  const [redeemResult, setRedeemResult] = useState<{ ok?: boolean; error?: string; remainingBalance?: number } | null>(null)

  const filtered = cards.filter((c) => {
    const matchSearch = !search || c.code.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || c.status === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    active: cards.filter((c) => c.status === "active").length,
    totalValue: cards.filter((c) => c.status === "active").reduce((s, c) => s + Number(c.balance), 0),
    redeemed: cards.filter((c) => c.status === "redeemed").length,
  }

  async function handleCreate() {
    if (!amount) return
    startTransition(async () => {
      const res = await createGiftCard(clinicId, {
        amount: Number(amount),
        purchased_by: purchasedBy || undefined,
        validity_days: Number(validityDays),
      })
      if (res.ok) {
        const expires = new Date()
        expires.setDate(expires.getDate() + Number(validityDays))
        const newCard: GiftCard = {
          id: res.id!,
          code: res.code!,
          amount: Number(amount),
          balance: Number(amount),
          status: "active",
          expires_at: expires.toISOString(),
          created_at: new Date().toISOString(),
          purchased_by: purchasedBy || null,
        }
        setCards((prev) => [newCard, ...prev])
        setShowCreateModal(false)
        setAmount("")
        setPurchasedBy("")
      }
    })
  }

  async function handleRedeem() {
    if (!redeemCode || !redeemAmount) return
    startTransition(async () => {
      const res = await redeemGiftCard(clinicId, redeemCode, Number(redeemAmount), redeemPatient || "manual")
      setRedeemResult(res)
      if (res.ok) {
        setCards((prev) => prev.map((c) =>
          c.code === redeemCode.toUpperCase()
            ? { ...c, balance: res.remainingBalance!, status: res.remainingBalance === 0 ? "redeemed" : "active" }
            : c
        ))
      }
    })
  }

  const statusConfig = {
    active: { label: "Activa", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle },
    redeemed: { label: "Canjeada", color: "text-slate-600 bg-slate-100", icon: CheckCircle },
    expired: { label: "Vencida", color: "text-red-600 bg-red-50", icon: XCircle },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Gift Cards</h1>
          <p className="text-sm text-muted-foreground mt-1">Venta y canje de tarjetas de regalo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setRedeemResult(null); setShowRedeemModal(true) }} className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Canjear
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva gift card
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-premium p-4">
          <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Activas</p>
          <p className="text-xs text-muted-foreground">Saldo total: {formatCurrency(stats.totalValue)}</p>
        </div>
        <div className="card-premium p-4">
          <p className="text-2xl font-bold">{stats.redeemed}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Canjeadas</p>
        </div>
        <div className="card-premium p-4">
          <p className="text-2xl font-bold">{cards.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total emitidas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Buscar por código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="redeemed">Canjeadas</option>
          <option value="expired">Vencidas</option>
        </select>
      </div>

      {/* Cards list */}
      {filtered.length === 0 ? (
        <div className="card-premium text-center py-16">
          <Gift className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No hay gift cards</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreateModal(true)}>Crear primera</Button>
        </div>
      ) : (
        <div className="card-premium divide-y divide-border">
          {filtered.map((card) => {
            const cfg = statusConfig[card.status] ?? statusConfig.active
            const pctUsed = card.amount > 0 ? Math.round(((card.amount - card.balance) / card.amount) * 100) : 0
            const buyerName = patients.find((p) => p.id === card.purchased_by)?.name
            return (
              <div key={card.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm">{card.code}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(card.code)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Copiar código"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cfg.color)}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">Valor: {formatCurrency(card.amount)}</span>
                    {card.status === "active" && <span className="text-xs font-medium text-emerald-600">Saldo: {formatCurrency(card.balance)}</span>}
                    {buyerName && <span className="text-xs text-muted-foreground">Comprador: {buyerName}</span>}
                  </div>
                  {card.status === "active" && pctUsed > 0 && (
                    <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden w-32">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pctUsed}%` }} />
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(card.expires_at).toLocaleDateString("es-CR")}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold">Nueva Gift Card</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Monto *</label>
                <div className="flex gap-2 flex-wrap mt-1.5">
                  {PRESET_AMOUNTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setAmount(p.toString())}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all",
                        amount === p.toString() ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {formatCurrency(p)}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  className="mt-2 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="O ingresá un monto personalizado..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Comprador (paciente, opcional)</label>
                <select
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={purchasedBy}
                  onChange={(e) => setPurchasedBy(e.target.value)}
                >
                  <option value="">Sin paciente asignado</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Validez (días)</label>
                <input
                  type="number"
                  min="1"
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={!amount || isPending}>
                {isPending ? "Creando..." : "Emitir gift card"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Redeem modal */}
      {showRedeemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold">Canjear Gift Card</h2>
              <button onClick={() => setShowRedeemModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {redeemResult ? (
                <div className={cn("p-4 rounded-xl text-center", redeemResult.ok ? "bg-emerald-50" : "bg-red-50")}>
                  {redeemResult.ok ? (
                    <>
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="font-semibold text-emerald-700">¡Canje exitoso!</p>
                      <p className="text-sm text-emerald-600 mt-1">Saldo restante: {formatCurrency(redeemResult.remainingBalance!)}</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <p className="font-semibold text-red-700">{redeemResult.error}</p>
                    </>
                  )}
                  <Button className="mt-3 w-full" variant="outline" onClick={() => { setRedeemResult(null); setRedeemCode(""); setRedeemAmount("") }}>
                    Canjear otra
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Código de gift card</label>
                    <input
                      className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="XXXXXX-XXXX"
                      value={redeemCode}
                      onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Monto a descontar (₡)</label>
                    <input
                      type="number"
                      min="1"
                      className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button variant="outline" onClick={() => setShowRedeemModal(false)}>Cancelar</Button>
                    <Button onClick={handleRedeem} disabled={!redeemCode || !redeemAmount || isPending}>
                      {isPending ? "Procesando..." : "Canjear"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
