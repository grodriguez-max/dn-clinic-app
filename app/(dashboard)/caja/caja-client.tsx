"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn, formatCurrency } from "@/lib/utils"
import {
  openCashRegister, closeCashRegister, addCashMovement,
  getRegisterMovements,
} from "./actions"
import {
  DollarSign, TrendingUp, TrendingDown, Plus, X, Lock,
  Unlock, Clock, CreditCard, Smartphone, Banknote, ArrowUpRight, History
} from "lucide-react"

interface Register {
  id: string
  opened_at: string
  opening_balance: number
  status: string
}

interface Movement {
  id: string
  type: "income" | "expense" | "adjustment"
  category: string
  amount: number
  payment_method: string
  description?: string
  created_at: string
}

interface HistoryEntry {
  id: string
  opened_at: string
  closed_at: string
  opening_balance: number
  closing_balance: number
  expected_balance: number
  difference: number
  status: string
  notes?: string
}

interface Props {
  clinicId: string
  currentRegister: Register | null
  initialMovements: Movement[]
  history: HistoryEntry[]
}

const INCOME_CATEGORIES = ["Servicio", "Venta producto", "Pago paquete", "Otro ingreso"]
const EXPENSE_CATEGORIES = ["Insumos", "Pago proveedor", "Retiro efectivo", "Gastos generales", "Otro egreso"]
const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: Banknote },
  { value: "card", label: "Tarjeta", icon: CreditCard },
  { value: "sinpe", label: "SINPE", icon: Smartphone },
  { value: "transfer", label: "Transferencia", icon: ArrowUpRight },
  { value: "online", label: "Online", icon: DollarSign },
]

function PayMethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    cash: "bg-emerald-100 text-emerald-700",
    card: "bg-blue-100 text-blue-700",
    sinpe: "bg-violet-100 text-violet-700",
    transfer: "bg-amber-100 text-amber-700",
    online: "bg-cyan-100 text-cyan-700",
  }
  const labels: Record<string, string> = {
    cash: "Efectivo", card: "Tarjeta", sinpe: "SINPE", transfer: "Transf.", online: "Online",
  }
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[11px] font-medium", colors[method] ?? "bg-muted text-muted-foreground")}>
      {labels[method] ?? method}
    </span>
  )
}

export function CajaClient({ clinicId, currentRegister, initialMovements, history }: Props) {
  const [register, setRegister] = useState<Register | null>(currentRegister)
  const [movements, setMovements] = useState<Movement[]>(initialMovements)
  const [, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<"today" | "history">("today")

  // Open register state
  const [openBalance, setOpenBalance] = useState("0")
  const [opening, setOpening] = useState(false)

  // Close register state
  const [showClose, setShowClose] = useState(false)
  const [closeBalance, setCloseBalance] = useState("")
  const [closeNotes, setCloseNotes] = useState("")
  const [closing, setClosing] = useState(false)
  const [closeResult, setCloseResult] = useState<{ expected: number; diff: number } | null>(null)

  // Movement form state
  const [showMovForm, setShowMovForm] = useState<"income" | "expense" | null>(null)
  const [movCategory, setMovCategory] = useState("")
  const [movAmount, setMovAmount] = useState("")
  const [movMethod, setMovMethod] = useState("cash")
  const [movDesc, setMovDesc] = useState("")
  const [movLoading, setMovLoading] = useState(false)
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")

  // Totals by payment method (income only)
  const totalByMethod: Record<string, number> = {}
  const expByMethod: Record<string, number> = {}
  movements.forEach((m) => {
    if (m.type === "income") totalByMethod[m.payment_method] = (totalByMethod[m.payment_method] ?? 0) + Number(m.amount)
    if (m.type === "expense") expByMethod[m.payment_method] = (expByMethod[m.payment_method] ?? 0) + Number(m.amount)
  })
  const totalIncome = movements.filter((m) => m.type === "income").reduce((s, m) => s + Number(m.amount), 0)
  const totalExpense = movements.filter((m) => m.type === "expense").reduce((s, m) => s + Number(m.amount), 0)
  const netTotal = totalIncome - totalExpense

  const filteredMovements = movements.filter((m) => filterType === "all" ? true : m.type === filterType)

  async function handleOpen() {
    setOpening(true)
    const res = await openCashRegister(clinicId, Number(openBalance))
    setOpening(false)
    if (res.error) { alert(res.error); return }
    window.location.reload()
  }

  async function handleClose() {
    setClosing(true)
    const res = await closeCashRegister(register!.id, Number(closeBalance), closeNotes)
    setClosing(false)
    if (res.error) { alert(res.error); return }
    if (res.ok) {
      setCloseResult({ expected: res.expectedBalance!, diff: res.difference! })
      setTimeout(() => window.location.reload(), 3000)
    }
  }

  async function handleAddMovement() {
    if (!movAmount || Number(movAmount) <= 0 || !movCategory) return
    setMovLoading(true)
    const res = await addCashMovement(clinicId, register!.id, {
      type: showMovForm!,
      category: movCategory,
      amount: Number(movAmount),
      payment_method: movMethod as any,
      description: movDesc || undefined,
    })
    setMovLoading(false)
    if (res.error) { alert(res.error); return }
    // Refresh movements
    const updated = await getRegisterMovements(register!.id)
    setMovements(updated as Movement[])
    setShowMovForm(null)
    setMovCategory("")
    setMovAmount("")
    setMovDesc("")
  }

  if (!register) {
    return (
      <div className="space-y-6">
        <div className="max-w-md mx-auto">
          <div className="card-premium p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-lg">Caja cerrada</p>
              <p className="text-sm text-muted-foreground mt-1">Ingresá el saldo inicial para abrir la caja del día</p>
            </div>
            <div className="space-y-2 text-left">
              <Label>Saldo inicial (₡)</Label>
              <Input
                type="number"
                min={0}
                value={openBalance}
                onChange={(e) => setOpenBalance(e.target.value)}
                placeholder="0"
              />
            </div>
            <Button onClick={handleOpen} disabled={opening} className="w-full">
              <Unlock className="w-4 h-4 mr-2" />
              {opening ? "Abriendo..." : "Abrir caja"}
            </Button>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Cierres anteriores
            </p>
            {history.map((h) => (
              <div key={h.id} className="card-premium p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{new Date(h.closed_at).toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" })}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Abierta {new Date(h.opened_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })} · Cerrada {new Date(h.closed_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{formatCurrency(h.closing_balance)}</p>
                  {h.difference !== 0 && (
                    <p className={cn("text-xs font-medium", h.difference > 0 ? "text-emerald-600" : "text-red-600")}>
                      {h.difference > 0 ? "+" : ""}{formatCurrency(h.difference)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm text-muted-foreground">
            Caja abierta · {new Date(register.opened_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => setShowClose(true)}
        >
          <Lock className="w-3.5 h-3.5 mr-1.5" />
          Cerrar caja
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-premium p-4">
          <p className="text-xs text-muted-foreground">Saldo inicial</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(register.opening_balance)}</p>
        </div>
        <div className="card-premium p-4">
          <p className="text-xs text-emerald-600 font-medium">Ingresos</p>
          <p className="text-xl font-bold mt-1 text-emerald-700">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="card-premium p-4">
          <p className="text-xs text-red-600 font-medium">Egresos</p>
          <p className="text-xl font-bold mt-1 text-red-700">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="card-premium p-4">
          <p className="text-xs text-muted-foreground">Neto del día</p>
          <p className={cn("text-xl font-bold mt-1", netTotal >= 0 ? "text-foreground" : "text-red-600")}>
            {formatCurrency(netTotal)}
          </p>
        </div>
      </div>

      {/* By payment method breakdown */}
      <div className="card-premium p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Desglose por método de pago</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
            <div key={value} className="space-y-0.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Icon className="w-3 h-3" />{label}
              </p>
              <p className="text-sm font-semibold text-emerald-700">+{formatCurrency(totalByMethod[value] ?? 0)}</p>
              {expByMethod[value] > 0 && (
                <p className="text-[11px] text-red-600">-{formatCurrency(expByMethod[value])}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          onClick={() => { setShowMovForm("income"); setMovCategory("") }}
        >
          <TrendingUp className="w-4 h-4 mr-1.5" />
          + Ingreso
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => { setShowMovForm("expense"); setMovCategory("") }}
        >
          <TrendingDown className="w-4 h-4 mr-1.5" />
          + Egreso
        </Button>
      </div>

      {/* Movement form */}
      {showMovForm && (
        <div className="card-premium p-4 space-y-3 border-2 border-primary/20">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{showMovForm === "income" ? "Registrar ingreso" : "Registrar egreso"}</p>
            <button type="button" onClick={() => setShowMovForm(null)}>
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <select
                className="w-full h-9 border border-border rounded-md px-3 text-sm bg-background"
                value={movCategory}
                onChange={(e) => setMovCategory(e.target.value)}
              >
                <option value="">Seleccioná...</option>
                {(showMovForm === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <Select value={movMethod} onValueChange={setMovMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Monto (₡)</Label>
            <Input type="number" min={0} value={movAmount} onChange={(e) => setMovAmount(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input value={movDesc} onChange={(e) => setMovDesc(e.target.value)} placeholder="Descripción breve..." />
          </div>
          <Button onClick={handleAddMovement} disabled={movLoading} size="sm" className="w-full">
            {movLoading ? "Registrando..." : "Registrar"}
          </Button>
        </div>
      )}

      {/* Close register modal */}
      {showClose && !closeResult && (
        <div className="card-premium p-6 space-y-4 border-2 border-red-200">
          <p className="font-semibold">Cierre de caja</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Saldo inicial</p>
              <p className="font-medium">{formatCurrency(register.opening_balance)}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600">Ingresos efectivo</p>
              <p className="font-medium text-emerald-700">{formatCurrency(totalByMethod.cash ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-red-600">Egresos efectivo</p>
              <p className="font-medium text-red-700">{formatCurrency(expByMethod.cash ?? 0)}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Saldo real en caja (₡)</Label>
            <Input
              type="number"
              min={0}
              value={closeBalance}
              onChange={(e) => setCloseBalance(e.target.value)}
              placeholder="Contá el efectivo en caja..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notas del cierre <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} rows={2} placeholder="Observaciones..." />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowClose(false)} disabled={closing} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleClose}
              disabled={closing || !closeBalance}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {closing ? "Cerrando..." : "Confirmar cierre"}
            </Button>
          </div>
        </div>
      )}

      {closeResult && (
        <div className="card-premium p-6 text-center space-y-3">
          <p className="font-semibold text-lg">Caja cerrada ✓</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Saldo esperado</p>
              <p className="font-semibold">{formatCurrency(closeResult.expected)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Diferencia</p>
              <p className={cn("font-semibold", closeResult.diff === 0 ? "text-foreground" : closeResult.diff > 0 ? "text-emerald-600" : "text-red-600")}>
                {closeResult.diff > 0 ? "+" : ""}{formatCurrency(closeResult.diff)}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Recargando...</p>
        </div>
      )}

      {/* Movements list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Movimientos del día ({movements.length})
          </p>
          <div className="flex gap-1">
            {(["all", "income", "expense"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium transition-colors",
                  filterType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {t === "all" ? "Todos" : t === "income" ? "Ingresos" : "Egresos"}
              </button>
            ))}
          </div>
        </div>

        {filteredMovements.length === 0 ? (
          <div className="card-premium text-center py-8 text-muted-foreground text-sm">
            Sin movimientos
          </div>
        ) : (
          <div className="card-premium divide-y divide-border overflow-hidden">
            {filteredMovements.map((m) => (
              <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                  m.type === "income" ? "bg-emerald-100" : "bg-red-100"
                )}>
                  {m.type === "income"
                    ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    : <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.category}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {m.description && <p className="text-xs text-muted-foreground truncate max-w-32">{m.description}</p>}
                    <PayMethodBadge method={m.payment_method} />
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
                <p className={cn("text-sm font-semibold shrink-0", m.type === "income" ? "text-emerald-700" : "text-red-600")}>
                  {m.type === "income" ? "+" : "-"}{formatCurrency(m.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
