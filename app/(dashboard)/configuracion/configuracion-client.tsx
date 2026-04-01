"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Building2, Bot, Megaphone, Bell, Users, Smartphone, CreditCard,
  Save, ChevronRight, Check, Globe, Phone, Mail, MapPin, Clock,
  Shield, AlertCircle, DoorOpen, Star, Gift, CalendarSync, BarChart2, Plus, Trash2, Pencil,
  FileText, Instagram, Wand2, Banknote,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { saveClinicSettings, saveAgentSettings, saveNotificationSettings } from "./actions"
import { saveDepositPolicy } from "@/app/(dashboard)/agenda/payment-actions"
import { createRoom, updateRoom, deleteRoom } from "./room-actions"
import { saveSurveyTemplate } from "./survey-actions"
import { saveGiftCardSettings } from "./gift-card-actions"

interface Clinic {
  id: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  business_hours: Record<string, { open: string; close: string; closed: boolean }> | null
  settings: Record<string, unknown> | null
  whatsapp_connected: boolean
}

interface ClinicUser {
  id: string
  name: string
  email: string
  role: string
}

interface Props {
  clinic: Clinic
  users: ClinicUser[]
  currentUserRole: string
}

const DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
]

const DEFAULT_HOURS = { open: "08:00", close: "18:00", closed: false }

const NAV_ITEMS = [
  { id: "clinica", label: "Datos de la clínica", icon: Building2 },
  { id: "recepcionista", label: "Agente recepcionista", icon: Bot },
  { id: "marketing", label: "Agente marketing", icon: Megaphone },
  { id: "notificaciones", label: "Notificaciones", icon: Bell },
  { id: "usuarios", label: "Usuarios y permisos", icon: Users },
  { id: "abonos", label: "Política de abonos", icon: CreditCard },
  { id: "cabinas", label: "Cabinas y Salas", icon: DoorOpen },
  { id: "encuestas", label: "Encuestas", icon: Star },
  { id: "giftcards", label: "Gift Cards", icon: Gift },
  { id: "hacienda", label: "Factura Electrónica", icon: FileText },
  { id: "pagos", label: "Pagos (SINPE)", icon: Banknote },
  { id: "integraciones", label: "Integraciones", icon: CalendarSync },
  { id: "redes_sociales", label: "Redes Sociales", icon: Instagram },
  { id: "ia_avanzada", label: "IA Avanzada (fal.ai)", icon: Wand2 },
  { id: "whatsapp", label: "Conexión WhatsApp", icon: Smartphone },
  { id: "plan", label: "Plan y facturación", icon: CreditCard },
]

export function ConfiguracionClient({ clinic, users, currentUserRole }: Props) {
  const [activeTab, setActiveTab] = useState("clinica")
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState<string | null>(null)

  const isOwner = currentUserRole === "owner"

  // ── Clinic data state ──────────────────────────────────────────────────
  const [clinicName, setClinicName] = useState(clinic.name)
  const [address, setAddress] = useState(clinic.address ?? "")
  const [phone, setPhone] = useState(clinic.phone ?? "")
  const [email, setEmail] = useState(clinic.email ?? "")

  const hoursInit = clinic.business_hours ?? {}
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>(
    Object.fromEntries(DAYS.map((d) => [d.key, hoursInit[d.key] ?? { ...DEFAULT_HOURS }]))
  )

  // ── Agent settings state ───────────────────────────────────────────────
  const settings = (clinic.settings ?? {}) as Record<string, unknown>
  const agentCfg = (settings.agent ?? {}) as Record<string, unknown>
  const mktCfg = (settings.marketing ?? {}) as Record<string, unknown>
  const notifCfg = (settings.notifications ?? {}) as Record<string, unknown>

  const [agentTone, setAgentTone] = useState((agentCfg.tone as string) ?? "profesional")
  const [agentFaqs, setAgentFaqs] = useState((agentCfg.faqs as string) ?? "")
  const [agentMaxWait, setAgentMaxWait] = useState((agentCfg.max_wait_hours as string) ?? "2")
  const [agentStartHour, setAgentStartHour] = useState((agentCfg.start_hour as string) ?? "08:00")
  const [agentEndHour, setAgentEndHour] = useState((agentCfg.end_hour as string) ?? "20:00")

  const [mktFreq, setMktFreq] = useState((mktCfg.frequency as string) ?? "weekly")
  const [mktApproval, setMktApproval] = useState((mktCfg.require_approval as boolean) ?? true)
  const [mktWhatsapp, setMktWhatsapp] = useState((mktCfg.whatsapp_campaigns as boolean) ?? true)
  const [mktEmail, setMktEmail] = useState((mktCfg.email_campaigns as boolean) ?? false)

  const [notifNewAppt, setNotifNewAppt] = useState((notifCfg.new_appointment as boolean) ?? true)
  const [notifCancelled, setNotifCancelled] = useState((notifCfg.cancelled as boolean) ?? true)
  const [notifNoShow, setNotifNoShow] = useState((notifCfg.no_show as boolean) ?? true)
  const [notifHotLead, setNotifHotLead] = useState((notifCfg.hot_lead as boolean) ?? true)
  const [notifEscalation, setNotifEscalation] = useState((notifCfg.escalation as boolean) ?? true)
  const [notifChannel, setNotifChannel] = useState((notifCfg.channel as string) ?? "email")

  // ── Rooms state ────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<Array<{ id: string; name: string; description?: string; equipment: string[]; is_active: boolean }>>((clinic as any).rooms ?? [])
  const [roomForm, setRoomForm] = useState({ name: "", description: "", equipment: "" })
  const [editingRoom, setEditingRoom] = useState<string | null>(null)

  // ── Survey state ───────────────────────────────────────────────────────
  const surveyCfg = (settings.default_survey ?? {}) as Record<string, unknown>
  const [surveyName, setSurveyName] = useState((surveyCfg.name as string) ?? "Encuesta de satisfacción")
  const [surveySendDays, setSurveySendDays] = useState(String(surveyCfg.send_days_after ?? "3"))

  // ── Gift card state ────────────────────────────────────────────────────
  const gcCfg = (settings.gift_cards ?? {}) as Record<string, unknown>
  const [gcEnabled, setGcEnabled] = useState((gcCfg.enabled as boolean) ?? false)
  const [gcAmounts, setGcAmounts] = useState<string>((gcCfg.preset_amounts as string) ?? "5000,10000,25000,50000")
  const [gcValidityDays, setGcValidityDays] = useState(String(gcCfg.validity_days ?? "365"))

  // ── Deposit policy state ───────────────────────────────────────────────
  const depositCfg = (settings.deposit_policy ?? {}) as Record<string, unknown>
  const [depositRequired, setDepositRequired] = useState((depositCfg.deposit_required as boolean) ?? false)
  const [depositType, setDepositType] = useState<"percentage" | "fixed">((depositCfg.deposit_type as "percentage" | "fixed") ?? "percentage")
  const [depositAmount, setDepositAmount] = useState(String(depositCfg.deposit_amount ?? "30"))
  const [refundHours, setRefundHours] = useState(String(depositCfg.refund_policy_hours ?? "24"))

  function handleSaveDeposit() {
    startTransition(async () => {
      const res = await saveDepositPolicy(clinic.id, {
        deposit_required: depositRequired,
        deposit_type: depositType,
        deposit_amount: Number(depositAmount),
        refund_policy_hours: Number(refundHours),
        deposit_services: [],
      })
      if (res.success) showSaved("abonos")
    })
  }

  async function handleSaveRoom() {
    if (!roomForm.name.trim()) return
    const equipment = roomForm.equipment.split(",").map((e) => e.trim()).filter(Boolean)
    if (editingRoom) {
      await updateRoom(editingRoom, { name: roomForm.name, description: roomForm.description || undefined, equipment })
      setRooms((rs) => rs.map((r) => r.id === editingRoom ? { ...r, name: roomForm.name, description: roomForm.description, equipment } : r))
    } else {
      const res = await createRoom(clinic.id, { name: roomForm.name, description: roomForm.description || undefined, equipment })
      if (res.ok) setRooms((rs) => [...rs, { id: res.id!, name: roomForm.name, description: roomForm.description, equipment, is_active: true }])
    }
    setRoomForm({ name: "", description: "", equipment: "" })
    setEditingRoom(null)
    showSaved("cabinas")
  }

  async function handleDeleteRoom(id: string, name: string) {
    if (!confirm(`¿Eliminar cabina "${name}"?`)) return
    await deleteRoom(id)
    setRooms((rs) => rs.filter((r) => r.id !== id))
  }

  function handleSaveSurvey() {
    startTransition(async () => {
      await saveSurveyTemplate(clinic.id, {
        name: surveyName,
        send_days_after: Number(surveySendDays),
      })
      showSaved("encuestas")
    })
  }

  function handleSaveGiftCards() {
    startTransition(async () => {
      await saveGiftCardSettings(clinic.id, {
        enabled: gcEnabled,
        preset_amounts: gcAmounts,
        validity_days: Number(gcValidityDays),
      })
      showSaved("giftcards")
    })
  }

  function showSaved(id: string) {
    setSaved(id)
    setTimeout(() => setSaved(null), 2500)
  }

  function handleSaveClinic() {
    startTransition(async () => {
      await saveClinicSettings(clinic.id, {
        name: clinicName,
        address,
        phone,
        email,
        business_hours: hours,
      })
      showSaved("clinica")
    })
  }

  function handleSaveAgent() {
    startTransition(async () => {
      await saveAgentSettings(clinic.id, {
        agent: { tone: agentTone, faqs: agentFaqs, max_wait_hours: agentMaxWait, start_hour: agentStartHour, end_hour: agentEndHour },
        marketing: { frequency: mktFreq, require_approval: mktApproval, whatsapp_campaigns: mktWhatsapp, email_campaigns: mktEmail },
      })
      showSaved("agentes")
    })
  }

  function handleSaveNotif() {
    startTransition(async () => {
      await saveNotificationSettings(clinic.id, {
        new_appointment: notifNewAppt,
        cancelled: notifCancelled,
        no_show: notifNoShow,
        hot_lead: notifHotLead,
        escalation: notifEscalation,
        channel: notifChannel,
      })
      showSaved("notif")
    })
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar nav */}
      <nav className="w-52 shrink-0">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            // Hide plan/billing tab for non-owners
            if (item.id === "plan" && !isOwner) return null
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                    activeTab === item.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                  {activeTab !== item.id && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">

        {/* ── Datos de la clínica ─────────────────────────────────────────── */}
        {activeTab === "clinica" && (
          <Section title="Datos de la clínica" description="Información pública y horarios de atención">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nombre de la clínica" icon={<Building2 className="w-4 h-4" />}>
                <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
              </Field>
              <Field label="Teléfono" icon={<Phone className="w-4 h-4" />}>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+506 2222-3333" />
              </Field>
              <Field label="Email" icon={<Mail className="w-4 h-4" />}>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Dirección" icon={<MapPin className="w-4 h-4" />}>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </Field>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horarios de atención
              </h3>
              <div className="space-y-2">
                {DAYS.map((day) => {
                  const h = hours[day.key] ?? DEFAULT_HOURS
                  return (
                    <div key={day.key} className="flex items-center gap-3 text-sm">
                      <div className="w-24 text-muted-foreground">{day.label}</div>
                      <Switch
                        checked={!h.closed}
                        onCheckedChange={(v) => setHours((prev) => ({ ...prev, [day.key]: { ...h, closed: !v } }))}
                      />
                      {!h.closed ? (
                        <>
                          <Input
                            type="time"
                            value={h.open}
                            onChange={(e) => setHours((prev) => ({ ...prev, [day.key]: { ...h, open: e.target.value } }))}
                            className="w-28 h-8 text-xs"
                          />
                          <span className="text-muted-foreground">—</span>
                          <Input
                            type="time"
                            value={h.close}
                            onChange={(e) => setHours((prev) => ({ ...prev, [day.key]: { ...h, close: e.target.value } }))}
                            className="w-28 h-8 text-xs"
                          />
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs">Cerrado</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <SaveBar onSave={handleSaveClinic} isPending={isPending} saved={saved === "clinica"} />
          </Section>
        )}

        {/* ── Agente recepcionista ─────────────────────────────────────────── */}
        {activeTab === "recepcionista" && (
          <Section title="Agente recepcionista" description="Configuración del asistente virtual de WhatsApp">
            <div className="space-y-4">
              <Field label="Tono del agente">
                <Select value={agentTone} onValueChange={setAgentTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profesional">Profesional y formal</SelectItem>
                    <SelectItem value="amigable">Amigable y cercano</SelectItem>
                    <SelectItem value="casual">Casual y relajado</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Hora inicio del agente">
                  <Input type="time" value={agentStartHour} onChange={(e) => setAgentStartHour(e.target.value)} />
                </Field>
                <Field label="Hora fin del agente">
                  <Input type="time" value={agentEndHour} onChange={(e) => setAgentEndHour(e.target.value)} />
                </Field>
              </div>

              <Field label="Tiempo máximo de espera para escalar (horas)">
                <Input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={agentMaxWait}
                  onChange={(e) => setAgentMaxWait(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Si el paciente no recibe respuesta en este tiempo, el agente escala a un humano.
                </p>
              </Field>

              <Field label="Preguntas frecuentes (FAQs)">
                <Textarea
                  value={agentFaqs}
                  onChange={(e) => setAgentFaqs(e.target.value)}
                  rows={6}
                  placeholder={"P: ¿Tienen estacionamiento?\nR: Sí, contamos con parqueo gratuito para clientes.\n\nP: ¿Aceptan tarjeta?\nR: Aceptamos efectivo, tarjeta y SINPE Móvil."}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  El agente usará estas respuestas cuando los pacientes hagan estas preguntas.
                </p>
              </Field>
            </div>

            <SaveBar onSave={handleSaveAgent} isPending={isPending} saved={saved === "agentes"} />
          </Section>
        )}

        {/* ── Agente marketing ─────────────────────────────────────────── */}
        {activeTab === "marketing" && (
          <Section title="Agente marketing" description="Configura cómo el agente de marketing opera">
            <div className="space-y-5">
              <Field label="Frecuencia de campañas">
                <Select value={mktFreq} onValueChange={setMktFreq}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="biweekly">Quincenal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <ToggleRow
                label="Requerir aprobación antes de publicar"
                description="Los drafts de campañas necesitan tu OK antes de enviarse"
                checked={mktApproval}
                onChange={setMktApproval}
              />
              <ToggleRow
                label="Campañas por WhatsApp"
                description="El agente puede enviar promociones a la base de pacientes vía WhatsApp"
                checked={mktWhatsapp}
                onChange={setMktWhatsapp}
              />
              <ToggleRow
                label="Campañas por email"
                description="El agente puede enviar campañas por correo electrónico"
                checked={mktEmail}
                onChange={setMktEmail}
              />
            </div>

            <SaveBar onSave={handleSaveAgent} isPending={isPending} saved={saved === "agentes"} />
          </Section>
        )}

        {/* ── Notificaciones ─────────────────────────────────────────── */}
        {activeTab === "notificaciones" && (
          <Section title="Notificaciones" description="Qué alertas recibís y por cuál canal">
            <div className="space-y-4">
              <Field label="Canal de notificaciones">
                <Select value={notifChannel} onValueChange={setNotifChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="both">Email + WhatsApp</SelectItem>
                    <SelectItem value="none">Ninguno (solo in-app)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="space-y-3 mt-4">
                <h3 className="text-sm font-semibold">Eventos que te notifican</h3>
                <ToggleRow label="Nueva cita agendada" description="Cuando el agente o alguien agenda una cita" checked={notifNewAppt} onChange={setNotifNewAppt} />
                <ToggleRow label="Cita cancelada" description="Cuando un paciente cancela" checked={notifCancelled} onChange={setNotifCancelled} />
                <ToggleRow label="No-show detectado" description="Cuando el sistema detecta un paciente que no llegó" checked={notifNoShow} onChange={setNotifNoShow} />
                <ToggleRow label="Lead caliente" description="Cuando un paciente nuevo pregunta por servicio de alto valor" checked={notifHotLead} onChange={setNotifHotLead} />
                <ToggleRow label="Escalación del agente" description="Cuando el agente necesita intervención humana" checked={notifEscalation} onChange={setNotifEscalation} />
              </div>
            </div>

            <SaveBar onSave={handleSaveNotif} isPending={isPending} saved={saved === "notif"} />
          </Section>
        )}

        {/* ── Usuarios y permisos ─────────────────────────────────────────── */}
        {activeTab === "usuarios" && (
          <Section title="Usuarios y permisos" description="Personas con acceso a tu dashboard">
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-white">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <RoleBadge role={u.role} />
                </div>
              ))}
            </div>

            <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold mb-1">Gestión de usuarios</p>
                <p className="text-xs">Para agregar o eliminar usuarios, contactá al soporte. La gestión avanzada de roles estará disponible próximamente.</p>
              </div>
            </div>
          </Section>
        )}

        {/* ── Conexión WhatsApp ─────────────────────────────────────────── */}
        {activeTab === "whatsapp" && (
          <Section title="Conexión WhatsApp" description="Estado y configuración del número de WhatsApp">
            <div className="space-y-5">
              <div className={cn(
                "flex items-center gap-3 p-4 rounded-xl border",
                clinic.whatsapp_connected
                  ? "bg-green-50 border-green-200"
                  : "bg-amber-50 border-amber-200"
              )}>
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full shrink-0",
                  clinic.whatsapp_connected ? "bg-green-500" : "bg-amber-500"
                )} />
                <div>
                  <p className={cn("text-sm font-semibold", clinic.whatsapp_connected ? "text-green-800" : "text-amber-800")}>
                    {clinic.whatsapp_connected ? "WhatsApp conectado" : "WhatsApp no conectado"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {clinic.whatsapp_connected
                      ? "El agente recepcionista está activo y respondiendo mensajes."
                      : "Conectá tu número de WhatsApp para activar el agente recepcionista."}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl text-sm">
                <p className="font-semibold mb-2">Para conectar o reconectar WhatsApp:</p>
                <ol className="space-y-1.5 text-muted-foreground list-decimal ml-4">
                  <li>Asegurate de tener el servidor de WhatsApp corriendo</li>
                  <li>Escaneá el código QR con tu teléfono en WhatsApp → Dispositivos vinculados</li>
                  <li>El sistema detectará la conexión automáticamente</li>
                </ol>
              </div>

              <Field label="URL del servidor WhatsApp">
                <Input
                  value={(settings.whatsapp_server_url as string) ?? ""}
                  placeholder="https://tu-servidor-whatsapp.com"
                  readOnly={!isOwner}
                />
                <p className="text-xs text-muted-foreground mt-1">Configurado al desplegar el servidor de WhatsApp.</p>
              </Field>
            </div>
          </Section>
        )}

        {/* ── Política de abonos ─────────────────────────────────────────── */}
        {activeTab === "abonos" && isOwner && (
          <Section title="Política de abonos" description="Reducí inasistencias requiriendo un abono al reservar">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Requerir abono para confirmar citas</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Los pacientes deberán pagar un abono al agendar</p>
                </div>
                <Switch checked={depositRequired} onCheckedChange={setDepositRequired} />
              </div>

              {depositRequired && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Tipo de abono</Label>
                      <Select value={depositType} onValueChange={(v) => setDepositType(v as "percentage" | "fixed")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                          <SelectItem value="fixed">Monto fijo (₡)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{depositType === "percentage" ? "Porcentaje" : "Monto (₡)"}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder={depositType === "percentage" ? "30" : "5000"}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Horas antes para reembolso gratis</Label>
                    <Input
                      type="number"
                      min={0}
                      value={refundHours}
                      onChange={(e) => setRefundHours(e.target.value)}
                      placeholder="24"
                    />
                    <p className="text-xs text-muted-foreground">
                      Si el paciente cancela con al menos {refundHours}h de anticipación, se reembolsa el abono.
                      Con menos tiempo, el abono no se reembolsa.
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                    💡 AgendaPro reporta una reducción de 32% en inasistencias con esta funcionalidad habilitada.
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveDeposit} disabled={isPending}>
                {saved === "abonos" ? <><Check className="w-4 h-4 mr-1.5" />Guardado</> : <><Save className="w-4 h-4 mr-1.5" />Guardar política</>}
              </Button>
            </div>
          </Section>
        )}

        {/* ── Cabinas y Salas ──────────────────────────────────────────── */}
        {activeTab === "cabinas" && isOwner && (
          <Section title="Cabinas y Salas" description="Definí los espacios físicos de tu clínica">
            <div className="space-y-4">
              {rooms.length > 0 && (
                <div className="space-y-2">
                  {rooms.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                      <DoorOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{r.name}</p>
                        {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                        {r.equipment.length > 0 && <p className="text-xs text-muted-foreground">Equipo: {r.equipment.join(", ")}</p>}
                      </div>
                      <button onClick={() => { setEditingRoom(r.id); setRoomForm({ name: r.name, description: r.description ?? "", equipment: r.equipment.join(", ") }) }} className="p-1.5 rounded hover:bg-muted">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDeleteRoom(r.id, r.name)} className="p-1.5 rounded hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
                <p className="text-xs font-semibold text-muted-foreground">{editingRoom ? "Editar cabina" : "Nueva cabina"}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nombre *</Label>
                    <Input value={roomForm.name} onChange={(e) => setRoomForm((f) => ({ ...f, name: e.target.value }))} placeholder="Cabina Láser" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descripción</Label>
                    <Input value={roomForm.description} onChange={(e) => setRoomForm((f) => ({ ...f, description: e.target.value }))} placeholder="Cabina para tratamientos láser" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Equipamiento <span className="text-muted-foreground font-normal">(separado por comas)</span></Label>
                  <Input value={roomForm.equipment} onChange={(e) => setRoomForm((f) => ({ ...f, equipment: e.target.value }))} placeholder="Láser Alexandrita, Camilla, Lupa" />
                </div>
                <div className="flex gap-2">
                  {editingRoom && <Button variant="outline" size="sm" onClick={() => { setEditingRoom(null); setRoomForm({ name: "", description: "", equipment: "" }) }}>Cancelar</Button>}
                  <Button size="sm" onClick={handleSaveRoom}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    {editingRoom ? "Guardar cambios" : "Agregar cabina"}
                  </Button>
                </div>
              </div>
              {saved === "cabinas" && <p className="text-sm text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" />Guardado</p>}
            </div>
          </Section>
        )}

        {/* ── Encuestas ─────────────────────────────────────────────────── */}
        {activeTab === "encuestas" && isOwner && (
          <Section title="Encuestas de satisfacción" description="Envío automático post-cita para medir la experiencia del paciente">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nombre de la encuesta</Label>
                  <Input value={surveyName} onChange={(e) => setSurveyName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Enviar a los N días post-cita</Label>
                  <Input type="number" min={1} max={30} value={surveySendDays} onChange={(e) => setSurveySendDays(e.target.value)} />
                </div>
              </div>
              <div className="p-4 bg-muted/30 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preguntas default</p>
                {[
                  { text: "¿Cómo calificarías tu experiencia general?", type: "rating" },
                  { text: "¿Cómo calificarías la atención del profesional?", type: "rating" },
                  { text: "¿Nos recomendarías a un amigo?", type: "multiple_choice", options: ["Definitivamente sí", "Probablemente sí", "No estoy seguro/a", "Probablemente no"] },
                  { text: "¿Qué podemos mejorar?", type: "open_text" },
                ].map((q, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-2 bg-white border border-border rounded-lg">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="flex-1">{q.text}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{q.type}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                💡 Si la calificación es menor a 3 se crea una alerta inmediata para el dueño. El NPS y promedio por profesional aparecen en Métricas.
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveSurvey} disabled={isPending}>
                {saved === "encuestas" ? <><Check className="w-4 h-4 mr-1.5" />Guardado</> : <><Save className="w-4 h-4 mr-1.5" />Guardar</>}
              </Button>
            </div>
          </Section>
        )}

        {/* ── Gift Cards ────────────────────────────────────────────────── */}
        {activeTab === "giftcards" && isOwner && (
          <Section title="Gift Cards" description="Vendé tarjetas de regalo con montos predefinidos">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Habilitar Gift Cards</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Permite vender y canjear tarjetas de regalo</p>
                </div>
                <Switch checked={gcEnabled} onCheckedChange={setGcEnabled} />
              </div>
              {gcEnabled && (
                <>
                  <div className="space-y-1.5">
                    <Label>Montos predefinidos (₡, separados por coma)</Label>
                    <Input value={gcAmounts} onChange={(e) => setGcAmounts(e.target.value)} placeholder="5000,10000,25000,50000" />
                    <p className="text-xs text-muted-foreground">
                      Aparecerán como opciones rápidas al vender una gift card.
                      Actualmente: {gcAmounts.split(",").map((a) => `₡${Number(a.trim()).toLocaleString("es-CR")}`).join(" · ")}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vigencia (días)</Label>
                    <Input type="number" min={30} value={gcValidityDays} onChange={(e) => setGcValidityDays(e.target.value)} />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveGiftCards} disabled={isPending}>
                {saved === "giftcards" ? <><Check className="w-4 h-4 mr-1.5" />Guardado</> : <><Save className="w-4 h-4 mr-1.5" />Guardar</>}
              </Button>
            </div>
          </Section>
        )}

        {/* ── Integraciones ─────────────────────────────────────────────── */}
        {activeTab === "integraciones" && isOwner && (
          <Section title="Integraciones" description="Conectá con servicios externos">
            <div className="space-y-4">
              {/* Google Calendar */}
              <div className="flex items-start gap-4 p-4 border border-border rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <CalendarSync className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Google Calendar</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sincronizá las citas con el calendario del profesional. Bloqueos desde Google Calendar aparecen en la agenda.</p>
                </div>
                <a href="/api/integrations/google-calendar/connect" className="shrink-0">
                  <Button size="sm" variant="outline">Conectar</Button>
                </a>
              </div>
              {/* Google Business */}
              <div className="flex items-start gap-4 p-4 border border-border rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <BarChart2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Google Business Profile</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Mostrá tu rating de Google en el dashboard, gestioná reseñas y habilitá "Reservar en Google Maps".</p>
                  <div className="mt-2 space-y-1.5">
                    <Label className="text-xs">Google Place ID</Label>
                    <Input
                      className="h-7 text-xs"
                      placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                      defaultValue={(settings.google_place_id as string) ?? ""}
                      onBlur={async (e) => {
                        // Place ID saved via saveAgentSettings on blur
                        await saveAgentSettings(clinic.id, { google_place_id: e.target.value })
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Encontralo en Google Maps → Compartir → "Embed a map" → buscar el ID en la URL.</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* ── Factura Electrónica ATV ────────────────────────────────────── */}
        {activeTab === "hacienda" && isOwner && (
          <Section title="Factura Electrónica" description="Configuración para el ATV del Ministerio de Hacienda de Costa Rica">
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                ⚠️ Requiere Firma Digital BCCR y credenciales ATV. Contactá a tu contador para obtenerlas.
              </div>
              {[
                { key: "cedula", label: "Cédula Jurídica/Física", placeholder: "3-101-XXXXXX" },
                { key: "nombre", label: "Razón Social", placeholder: "Nombre de la empresa" },
                { key: "nombre_comercial", label: "Nombre Comercial", placeholder: "" },
                { key: "correo", label: "Correo ATV", placeholder: "facturacion@clinica.com" },
                { key: "telefono", label: "Teléfono", placeholder: "22XXXXXX" },
                { key: "actividad_economica", label: "Código Actividad Económica (CIIU)", placeholder: "8621" },
                { key: "provincia", label: "Código Provincia (1-7)", placeholder: "1" },
                { key: "canton", label: "Código Cantón", placeholder: "01" },
                { key: "distrito", label: "Código Distrito", placeholder: "01" },
                { key: "direccion", label: "Dirección", placeholder: "San José, Escazú..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    className="mt-1 h-8 text-sm"
                    placeholder={placeholder}
                    defaultValue={((settings.hacienda ?? {}) as Record<string, unknown>)[key] as string ?? ""}
                    onBlur={async (e) => {
                      const current = (settings.hacienda ?? {}) as Record<string, unknown>
                      await saveAgentSettings(clinic.id, { hacienda: { ...current, [key]: e.target.value } })
                    }}
                  />
                </div>
              ))}
              <div>
                <Label className="text-xs">Ambiente</Label>
                <select
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  defaultValue={((settings.hacienda ?? {}) as Record<string, unknown>).ambiente as string ?? "02"}
                  onBlur={async (e) => {
                    const current = (settings.hacienda ?? {}) as Record<string, unknown>
                    await saveAgentSettings(clinic.id, { hacienda: { ...current, ambiente: e.target.value } })
                  }}
                >
                  <option value="02">Pruebas (Staging)</option>
                  <option value="01">Producción</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">El firmador digital (.p12) se configura via la variable de entorno <code>HACIENDA_P12_BASE64</code> en el servidor.</p>
            </div>
          </Section>
        )}

        {/* ── Pagos SINPE Móvil ──────────────────────────────────────────── */}
        {activeTab === "pagos" && isOwner && (
          <Section title="SINPE Móvil" description="Configuración para recibir pagos por SINPE Móvil">
            <div className="space-y-4 text-sm">
              <div>
                <Label className="text-xs">Número de teléfono SINPE Móvil (8 dígitos)</Label>
                <Input
                  className="mt-1 h-8 text-sm font-mono"
                  placeholder="88XXXXXX"
                  defaultValue={(settings.sinpe_phone as string) ?? ""}
                  onBlur={async (e) => {
                    await saveAgentSettings(clinic.id, { sinpe_phone: e.target.value.replace(/\D/g, "") })
                    showSaved("pagos")
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">El sistema generará QR y códigos de referencia para cada pago.</p>
              </div>
              <div>
                <Label className="text-xs">IBAN (opcional — para transferencias SINPE)</Label>
                <Input
                  className="mt-1 h-8 text-sm font-mono"
                  placeholder="CR21XXXXXXXXXXXXXXXXXXXX"
                  defaultValue={(settings.sinpe_iban as string) ?? ""}
                  onBlur={async (e) => {
                    await saveAgentSettings(clinic.id, { sinpe_iban: e.target.value })
                  }}
                />
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs">
                💡 Para confirmación automática de pagos via SMS bancario, contactanos para configurar el webhook de tu banco.
              </div>
            </div>
          </Section>
        )}

        {/* ── Redes Sociales (Meta / Instagram) ─────────────────────────── */}
        {activeTab === "redes_sociales" && isOwner && (
          <Section title="Redes Sociales" description="Conectá Instagram y Facebook Messenger al agente IA">
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-4 p-4 border border-border rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
                  <Instagram className="w-5 h-5 text-pink-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="font-medium text-sm">Instagram Direct Messages</p>
                  <p className="text-xs text-muted-foreground">El agente responde mensajes directos en Instagram automáticamente.</p>
                  <div>
                    <Label className="text-xs">Instagram Business Account ID</Label>
                    <Input
                      className="mt-1 h-8 text-sm font-mono"
                      placeholder="17841XXXXXXXXX"
                      defaultValue={(settings.meta_instagram_account_id as string) ?? ""}
                      onBlur={async (e) => {
                        await saveAgentSettings(clinic.id, { meta_instagram_account_id: e.target.value })
                      }}
                    />
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                    <p className="font-medium">Setup requerido:</p>
                    <ol className="space-y-0.5 list-decimal list-inside text-muted-foreground">
                      <li>Crear app en Meta for Developers → Instagram</li>
                      <li>Agregar permisos: <code>instagram_manage_messages</code></li>
                      <li>Configurar webhook URL: <code>{typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/instagram</code></li>
                      <li>Verify token: valor de <code>META_WEBHOOK_VERIFY_TOKEN</code></li>
                      <li>Agregar a Railway: <code>META_PAGE_ACCESS_TOKEN</code>, <code>META_INSTAGRAM_ACCOUNT_ID</code></li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* ── IA Avanzada (fal.ai) ───────────────────────────────────────── */}
        {activeTab === "ia_avanzada" && isOwner && (
          <Section title="IA Avanzada" description="Generación de imágenes y análisis de piel con fal.ai">
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg text-violet-800 text-xs">
                🪄 La clave de fal.ai se configura via la variable de entorno <code>FAL_KEY</code> en Railway. Creala en <strong>fal.ai → Settings → API Keys</strong>.
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border border-border rounded-lg">
                  <Wand2 className="w-5 h-5 text-violet-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Generación de imágenes para marketing</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Creá imágenes profesionales para Instagram y WhatsApp desde Marketing → Calendario de contenido.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border border-border rounded-lg">
                  <Wand2 className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Análisis de piel con IA</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Analizá fotos de pacientes para recomendar tratamientos. Disponible en perfil del paciente.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border border-border rounded-lg">
                  <Wand2 className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Preview Before/After</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Mostrá al paciente un preview realista del resultado esperado antes del procedimiento.</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Costo estimado: ~$0.003-0.01 por imagen. Se registra en el log de generaciones.</p>
            </div>
          </Section>
        )}

        {/* ── Plan y facturación ─────────────────────────────────────────── */}
        {activeTab === "plan" && isOwner && (
          <Section title="Plan y facturación" description="Gestión de tu suscripción">
            <div className="p-4 bg-muted/50 rounded-xl text-sm flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium">Gestión completa de facturación</p>
                <p className="text-muted-foreground mt-0.5">
                  Encontrá el historial de facturas, uso del período y opciones de upgrade en la sección{" "}
                  <a href="/billing" className="text-primary underline">Suscripción</a>.
                </p>
              </div>
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-xl p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <hr className="border-border" />
      {children}
    </div>
  )
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-t border-border/60 first:border-t-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function SaveBar({ onSave, isPending, saved }: { onSave: () => void; isPending: boolean; saved: boolean }) {
  return (
    <div className="pt-4 border-t border-border flex justify-end">
      <Button onClick={onSave} disabled={isPending} size="sm">
        {saved ? (
          <><Check className="w-4 h-4 mr-1.5" />Guardado</>
        ) : (
          <><Save className="w-4 h-4 mr-1.5" />{isPending ? "Guardando..." : "Guardar cambios"}</>
        )}
      </Button>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const cfg: Record<string, { label: string; color: string }> = {
    owner: { label: "Master", color: "bg-purple-100 text-purple-700" },
    admin: { label: "Admin", color: "bg-blue-100 text-blue-700" },
    receptionist: { label: "Recepcionista", color: "bg-emerald-100 text-emerald-700" },
    professional: { label: "Profesional", color: "bg-amber-100 text-amber-700" },
  }
  const c = cfg[role] ?? { label: role, color: "bg-gray-100 text-gray-700" }
  return (
    <span className={cn("text-xs px-2 py-1 rounded-full font-medium", c.color)}>
      {c.label}
    </span>
  )
}
