"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Receipt, Plus, CheckCircle2, XCircle, Clock, AlertCircle,
  Download, Printer, Search, ChevronDown, ChevronRight,
  CreditCard, Banknote, Smartphone, Building2, FileText,
  ShieldCheck, ShieldX, BarChart3, Calendar, User, X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { createInvoice, voidInvoice, type CreateInvoiceFormData } from "./actions"
import type { TaxRate } from "@/lib/billing/cr-invoice"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string
  invoice_number: string
  invoice_type: string
  subtotal: number
  tax_amount: number
  total: number
  payment_method: string
  status: string
  hacienda_key: string | null
  hacienda_response: Record<string, unknown> | null
  items: { description: string; quantity: number; unit_price: number; tax_rate: number; tax_amount?: number; line_total?: number }[]
  created_at: string
  patient_id: string
  appointment_id: string | null
  patients: { name: string; phone?: string; id_number?: string } | null
}

interface Patient { id: string; name: string; phone?: string; id_number?: string }
interface Service { id: string; name: string; price: number; category?: string }

interface PendingAppt {
  id: string
  start_time: string
  patient_id: string
  service_id: string
  patients: { name?: string } | null
  services: { name?: string; price?: number } | null
  professionals: { name?: string } | null
}

interface Props {
  invoices: Invoice[]
  patients: Patient[]
  services: Service[]
  pendingAppointments: PendingAppt[]
  stats: {
    totalRevenue: number
    totalTax: number
    avgTicket: number
    totalInvoices: number
    voidedCount: number
    byPayment: { name: string; total: number }[]
    byType: { type: string; count: number }[]
  }
  period: string
  haciendaConnected: boolean
  clinicName: string
  userRole: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  borrador:  { label: "Borrador",  icon: Clock,         className: "bg-amber-50 text-amber-700 border-amber-200" },
  emitida:   { label: "Emitida",   icon: CheckCircle2,  className: "bg-blue-50 text-blue-700 border-blue-200" },
  aceptada:  { label: "Aceptada",  icon: ShieldCheck,   className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rechazada: { label: "Rechazada", icon: ShieldX,       className: "bg-red-50 text-red-700 border-red-200" },
  anulada:   { label: "Anulada",   icon: XCircle,       className: "bg-slate-50 text-slate-500 border-slate-200" },
}

const TYPE_LABELS: Record<string, string> = {
  factura:      "Factura",
  tiquete:      "Tiquete",
  nota_credito: "Nota Crédito",
}

const PAYMENT_ICONS: Record<string, React.ElementType> = {
  efectivo:     Banknote,
  tarjeta:      CreditCard,
  sinpe:        Smartphone,
  transferencia: Building2,
  credito:      FileText,
}

function colones(n: number) {
  return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(n)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CR", { timeZone: "America/Costa_Rica", day: "2-digit", month: "short", year: "numeric" })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-CR", { timeZone: "America/Costa_Rica", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

// ── Invoice Row ───────────────────────────────────────────────────────────────

function InvoiceRow({ inv, selected, onClick }: { inv: Invoice; selected: boolean; onClick: () => void }) {
  const status = STATUS_CONFIG[inv.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.emitida
  const StatusIcon = status.icon
  const PayIcon = PAYMENT_ICONS[inv.payment_method] ?? Banknote

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40 transition-colors",
        selected && "bg-primary/5",
        inv.status === "anulada" && "opacity-50",
      )}
    >
      <div className="flex items-center gap-3">
        <StatusIcon className={cn("w-4 h-4 shrink-0", status.className.split(" ")[1])} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono font-medium">{inv.invoice_number}</span>
            <Badge variant="outline" className={cn("text-[10px] border px-1.5", status.className)}>{status.label}</Badge>
            <Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[inv.invoice_type] ?? inv.invoice_type}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{inv.patients?.name ?? "—"}</span>
            <span className="flex items-center gap-1"><PayIcon className="w-3 h-3" />{inv.payment_method}</span>
            <span>{fmtDate(inv.created_at)}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold font-numeric">{colones(Number(inv.total))}</p>
          {Number(inv.tax_amount) > 0 && (
            <p className="text-[10px] text-muted-foreground">IVA {colones(Number(inv.tax_amount))}</p>
          )}
        </div>
        <ChevronRight className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", selected && "rotate-90")} />
      </div>
    </button>
  )
}

// ── Invoice Detail ─────────────────────────────────────────────────────────────

function InvoiceDetail({
  inv,
  canVoid,
  onVoid,
  onPrint,
}: {
  inv: Invoice
  canVoid: boolean
  onVoid: (id: string) => void
  onPrint: (inv: Invoice) => void
}) {
  const status = STATUS_CONFIG[inv.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.emitida

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-mono font-bold">{inv.invoice_number}</p>
          <p className="text-sm text-muted-foreground">{fmtDateTime(inv.created_at)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onPrint(inv)}>
            <Printer className="w-3.5 h-3.5 mr-1" />Imprimir
          </Button>
          {canVoid && inv.status !== "anulada" && (
            <Button variant="destructive" size="sm" onClick={() => onVoid(inv.id)}>
              <XCircle className="w-3.5 h-3.5 mr-1" />Anular
            </Button>
          )}
        </div>
      </div>

      {/* Patient */}
      <div className="bg-muted/40 rounded-lg p-3 text-sm">
        <p className="text-xs text-muted-foreground mb-1">Receptor</p>
        <p className="font-medium">{inv.patients?.name ?? "Consumidor Final"}</p>
        {inv.patients?.id_number && <p className="text-xs text-muted-foreground">Cédula: {inv.patients.id_number}</p>}
        {inv.patients?.phone && <p className="text-xs text-muted-foreground">{inv.patients.phone}</p>}
      </div>

      {/* Line items */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Detalle</p>
        <div className="border border-border rounded-lg overflow-hidden text-sm">
          <div className="bg-muted/50 grid grid-cols-12 px-3 py-1.5 text-xs text-muted-foreground font-medium">
            <span className="col-span-5">Descripción</span>
            <span className="col-span-2 text-center">Cant.</span>
            <span className="col-span-2 text-right">P. Unit.</span>
            <span className="col-span-1 text-center">IVA</span>
            <span className="col-span-2 text-right">Total</span>
          </div>
          {(inv.items ?? []).map((item, i) => (
            <div key={i} className="grid grid-cols-12 px-3 py-2 border-t border-border text-xs">
              <span className="col-span-5">{item.description}</span>
              <span className="col-span-2 text-center">{item.quantity}</span>
              <span className="col-span-2 text-right font-numeric">{colones(item.unit_price)}</span>
              <span className="col-span-1 text-center text-muted-foreground">{item.tax_rate}%</span>
              <span className="col-span-2 text-right font-numeric font-medium">{colones(item.line_total ?? (item.quantity * item.unit_price))}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-numeric">{colones(Number(inv.subtotal))}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>IVA</span>
          <span className="font-numeric">{colones(Number(inv.tax_amount))}</span>
        </div>
        <div className="flex justify-between font-bold text-base border-t border-border pt-1.5">
          <span>Total</span>
          <span className="font-numeric">{colones(Number(inv.total))}</span>
        </div>
      </div>

      {/* Hacienda status */}
      {inv.hacienda_key && (
        <div className="bg-muted/30 rounded-lg p-3 text-xs">
          <p className="text-muted-foreground mb-1">Clave numérica Hacienda</p>
          <p className="font-mono break-all">{inv.hacienda_key}</p>
        </div>
      )}
    </div>
  )
}

// ── New Invoice Form ──────────────────────────────────────────────────────────

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  tax_rate: TaxRate
  service_id?: string
}

function NewInvoiceModal({
  open,
  onClose,
  patients,
  services,
  pendingAppointments,
}: {
  open: boolean
  onClose: () => void
  patients: Patient[]
  services: Service[]
  pendingAppointments: PendingAppt[]
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [invoiceType, setInvoiceType] = useState<"factura" | "tiquete">("factura")
  const [patientId, setPatientId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<CreateInvoiceFormData["payment_method"]>("sinpe")
  const [receptorNombre, setReceptorNombre] = useState("")
  const [receptorCedula, setReceptorCedula] = useState("")
  const [receptorCedulaType, setReceptorCedulaType] = useState<"fisica" | "juridica">("fisica")
  const [notes, setNotes] = useState("")
  const [fromAppt, setFromAppt] = useState("")
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0, tax_rate: 13 },
  ])

  function handleApptSelect(apptId: string) {
    setFromAppt(apptId)
    const appt = pendingAppointments.find((a) => a.id === apptId)
    if (!appt) return
    setPatientId(appt.patient_id)
    const svc = appt.services as { name?: string; price?: number } | null
    setItems([{
      description: svc?.name ?? "Servicio",
      quantity: 1,
      unit_price: Number(svc?.price ?? 0),
      tax_rate: 13,
      service_id: appt.service_id,
    }])
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, tax_rate: 13 }])
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: keyof LineItem, value: unknown) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function handleServiceSelect(i: number, serviceId: string) {
    const svc = services.find((s) => s.id === serviceId)
    if (!svc) return
    updateItem(i, "description", svc.name)
    updateItem(i, "unit_price", svc.price)
    updateItem(i, "service_id", svc.id)
  }

  const subtotal = items.reduce((s, item) => s + item.quantity * item.unit_price, 0)
  const taxTotal = items.reduce((s, item) => s + Math.round(item.quantity * item.unit_price * item.tax_rate) / 100, 0)

  function handleSubmit() {
    if (!patientId) { setError("Seleccioná un paciente"); return }
    if (items.some((i) => !i.description || i.unit_price <= 0)) {
      setError("Completá todos los ítems"); return
    }

    setError(null)
    startTransition(async () => {
      const result = await createInvoice({
        patient_id:     patientId,
        appointment_id: fromAppt || undefined,
        invoice_type:   invoiceType,
        payment_method: paymentMethod,
        items,
        receptor_nombre:      invoiceType === "factura" ? receptorNombre : undefined,
        receptor_cedula:      invoiceType === "factura" && receptorCedula ? receptorCedula : undefined,
        receptor_cedula_type: receptorCedulaType,
        notes: notes || undefined,
      })
      if (result.error) { setError(result.error); return }
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Nueva factura
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* From appointment shortcut */}
          {pendingAppointments.length > 0 && (
            <div>
              <Label className="text-xs">Facturar desde cita completada</Label>
              <Select value={fromAppt} onValueChange={handleApptSelect}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar cita (opcional)..." />
                </SelectTrigger>
                <SelectContent>
                  {pendingAppointments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {(a.patients as { name?: string } | null)?.name} — {(a.services as { name?: string } | null)?.name} — {new Date(a.start_time).toLocaleDateString("es-CR")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Type + patient */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Tipo de comprobante</Label>
              <Select value={invoiceType} onValueChange={(v) => setInvoiceType(v as "factura" | "tiquete")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="factura">Factura Electrónica</SelectItem>
                  <SelectItem value="tiquete">Tiquete Electrónico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Paciente</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fiscal data (only for factura) */}
          {invoiceType === "factura" && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/40 rounded-lg">
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-2">Datos fiscales del receptor</p>
              </div>
              <div>
                <Label className="text-xs">Nombre / Razón social</Label>
                <Input className="mt-1 h-8 text-sm" value={receptorNombre} onChange={(e) => setReceptorNombre(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Tipo de cédula</Label>
                <Select value={receptorCedulaType} onValueChange={(v) => setReceptorCedulaType(v as "fisica" | "juridica")}>
                  <SelectTrigger className="mt-1 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fisica">Física (9 dígitos)</SelectItem>
                    <SelectItem value="juridica">Jurídica (10 dígitos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Número de cédula</Label>
                <Input className="mt-1 h-8 text-sm font-mono" value={receptorCedula} onChange={(e) => setReceptorCedula(e.target.value)} placeholder="000000000" />
              </div>
            </div>
          )}

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Ítems facturados</Label>
              <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" />Agregar
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    {i === 0 && <Label className="text-[10px] text-muted-foreground">Servicio</Label>}
                    <Select value={item.service_id ?? ""} onValueChange={(v) => handleServiceSelect(i, v)}>
                      <SelectTrigger className="h-8 mt-0.5">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    {i === 0 && <Label className="text-[10px] text-muted-foreground">Descripción</Label>}
                    <Input className="h-8 mt-0.5 text-xs" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                  </div>
                  <div className="col-span-1">
                    {i === 0 && <Label className="text-[10px] text-muted-foreground">Cant.</Label>}
                    <Input type="number" min={1} className="h-8 mt-0.5 text-xs" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <Label className="text-[10px] text-muted-foreground">P. Unit (₡)</Label>}
                    <Input type="number" min={0} className="h-8 mt-0.5 text-xs font-mono" value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))} />
                  </div>
                  <div className="col-span-1">
                    {i === 0 && <Label className="text-[10px] text-muted-foreground">IVA</Label>}
                    <Select value={String(item.tax_rate)} onValueChange={(v) => updateItem(i, "tax_rate", Number(v) as TaxRate)}>
                      <SelectTrigger className="h-8 mt-0.5 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="13">13%</SelectItem>
                        <SelectItem value="4">4%</SelectItem>
                        <SelectItem value="0">0% (Exento)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 flex justify-end pb-0.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeItem(i)} disabled={items.length === 1}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals preview */}
          <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span className="font-numeric">{colones(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>IVA</span><span className="font-numeric">{colones(taxTotal)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-border pt-1 mt-1">
              <span>Total</span><span className="font-numeric">{colones(subtotal + taxTotal)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <Label className="text-xs">Método de pago</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(["efectivo", "tarjeta", "sinpe", "transferencia", "credito"] as const).map((m) => {
                const Icon = PAYMENT_ICONS[m]
                return (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border text-xs font-medium capitalize transition-colors",
                      paymentMethod === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {m === "transferencia" ? "Transfer." : m}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Notas (opcional)</Label>
            <Input className="mt-1 h-8 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas internas..." />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Emitiendo..." : "Emitir factura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Void Confirm Modal ─────────────────────────────────────────────────────────

function VoidModal({ open, onClose, onConfirm, isPending }: {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  isPending: boolean
}) {
  const [reason, setReason] = useState("")
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Anular factura</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-3">Esta acción no se puede deshacer. Indicá el motivo de anulación.</p>
          <Label className="text-xs">Motivo</Label>
          <Input className="mt-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Error en datos, devolución, etc." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={!reason.trim() || isPending} onClick={() => onConfirm(reason)}>
            {isPending ? "Anulando..." : "Confirmar anulación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function FacuracionClient({
  invoices,
  patients,
  services,
  pendingAppointments,
  stats,
  period,
  haciendaConnected,
  clinicName,
  userRole,
}: Props) {
  const router  = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [voidingId, setVoidingId] = useState<string | null>(null)

  const canVoid = userRole === "owner" || userRole === "admin"

  const filtered = invoices.filter((i) => {
    const matchStatus = statusFilter === "all" || i.status === statusFilter
    const matchSearch = !search || (
      i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (i.patients?.name ?? "").toLowerCase().includes(search.toLowerCase())
    )
    return matchStatus && matchSearch
  })

  const selected = invoices.find((i) => i.id === selectedId)

  function handleVoidConfirm(reason: string) {
    if (!voidingId) return
    startTransition(async () => {
      await voidInvoice(voidingId, reason)
      setVoidingId(null)
      setSelectedId(null)
    })
  }

  function handlePrint(inv: Invoice) {
    window.open(`/api/invoices/${inv.id}/pdf`, "_blank")
  }

  function handlePeriodChange(p: string) {
    router.push(`/facturacion?period=${p}`)
  }

  return (
    <div className="space-y-6">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Hacienda status */}
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 text-xs",
              haciendaConnected
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700",
            )}
          >
            {haciendaConnected ? <ShieldCheck className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {haciendaConnected ? "Hacienda conectado" : "Modo local (demo)"}
          </Badge>

          {/* Period */}
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {pendingAppointments.length > 0 && (
            <Badge variant="outline" className="gap-1 text-xs border-blue-200 bg-blue-50 text-blue-700">
              <Calendar className="w-3 h-3" />
              {pendingAppointments.length} citas sin facturar
            </Badge>
          )}
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-1" />Nueva factura
          </Button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Ingresos período",  value: colones(stats.totalRevenue),   icon: Receipt,     sub: `${stats.totalInvoices} facturas` },
          { label: "IVA del período",   value: colones(stats.totalTax),        icon: FileText,    sub: "IVA generado" },
          { label: "Ticket promedio",   value: colones(stats.avgTicket),       icon: BarChart3,   sub: "Por factura" },
          { label: "Facturas anuladas", value: stats.voidedCount,              icon: XCircle,     sub: "En el período" },
        ].map(({ label, value, icon: Icon, sub }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold font-numeric">{value}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">
            <Receipt className="w-3.5 h-3.5 mr-1.5" />Facturas
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />Reportes
          </TabsTrigger>
        </TabsList>

        {/* ── INVOICES TAB ── */}
        <TabsContent value="invoices" className="mt-4">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número o paciente..."
                className="pl-8 h-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {["all", "emitida", "aceptada", "borrador", "rechazada", "anulada"].map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? `Todas (${invoices.length})` : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* List */}
            <Card>
              <div className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    <Receipt className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p>No hay facturas que coincidan.</p>
                  </div>
                ) : (
                  filtered.map((inv) => (
                    <InvoiceRow
                      key={inv.id}
                      inv={inv}
                      selected={selectedId === inv.id}
                      onClick={() => setSelectedId(selectedId === inv.id ? null : inv.id)}
                    />
                  ))
                )}
              </div>
            </Card>

            {/* Detail */}
            <Card>
              {selected ? (
                <InvoiceDetail
                  inv={selected}
                  canVoid={canVoid}
                  onVoid={(id) => setVoidingId(id)}
                  onPrint={handlePrint}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center text-muted-foreground">
                  <Receipt className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-sm">Seleccioná una factura</p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* ── REPORTS TAB ── */}
        <TabsContent value="reports" className="mt-4 space-y-4">
          {/* By payment method */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ingresos por método de pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {stats.byPayment.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                ) : stats.byPayment.map((p) => {
                  const Icon = PAYMENT_ICONS[p.name.toLowerCase()] ?? Banknote
                  const pct = stats.totalRevenue > 0 ? Math.round((p.total / stats.totalRevenue) * 100) : 0
                  return (
                    <div key={p.name} className="flex items-center gap-3">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize">{p.name}</span>
                          <span className="font-numeric">{colones(p.total)} ({pct}%)</span>
                        </div>
                        <div className="bg-muted rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* By type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Comprobantes emitidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.byType.map((t) => (
                    <div key={t.type} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{TYPE_LABELS[t.type] ?? t.type}</span>
                      </div>
                      <Badge variant="secondary" className="font-numeric">{t.count}</Badge>
                    </div>
                  ))}
                  {stats.byType.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin datos aún</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hacienda info card */}
          <Card className={cn("border", haciendaConnected ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30")}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                {haciendaConnected
                  ? <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  : <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                }
                <div>
                  <p className="text-sm font-medium">
                    {haciendaConnected ? "Integración con Hacienda activa (via Alegra)" : "Facturación en modo local"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {haciendaConnected
                      ? "Las facturas se envían automáticamente a Hacienda via Alegra API. Los comprobantes son válidos fiscalmente."
                      : "Las facturas se guardan localmente. Para emisión válida ante Hacienda, configurá ALEGRA_EMAIL y ALEGRA_API_KEY en variables de entorno, o solicitá un certificado digital directo a Hacienda (ATV)."
                    }
                  </p>
                  {!haciendaConnected && (
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Opciones para activar:</strong><br />
                      1. <strong>Alegra</strong> — alegra.com/cr (más fácil, ₡15k/mes)<br />
                      2. <strong>Gosocket</strong> — gosocket.net (alternativa)<br />
                      3. <strong>Directo Hacienda</strong> — requiere certificado .p12 y XML firmado
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modals ── */}
      <NewInvoiceModal
        open={showNew}
        onClose={() => setShowNew(false)}
        patients={patients}
        services={services}
        pendingAppointments={pendingAppointments}
      />

      <VoidModal
        open={!!voidingId}
        onClose={() => setVoidingId(null)}
        onConfirm={handleVoidConfirm}
        isPending={isPending}
      />
    </div>
  )
}
