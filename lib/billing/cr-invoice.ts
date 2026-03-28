/**
 * Facturación Electrónica Costa Rica
 *
 * Arquitectura de 3 capas:
 * 1. LOCAL  — guarda en Supabase, no envía a Hacienda (modo demo/desarrollo)
 * 2. ALEGRA — envía via Alegra API (requiere ALEGRA_EMAIL + ALEGRA_API_KEY)
 * 3. HACIENDA DIRECTA — reservado para futuro (requiere certificado .p12)
 *
 * Tipos de comprobante según Hacienda:
 *   01 = Factura Electrónica (FE)
 *   04 = Tiquete Electrónico (TE) — sin receptor identificado
 *   03 = Nota de Crédito Electrónica (NC)
 *
 * IVA Costa Rica:
 *   13% — tarifa general (servicios estéticos, dentales)
 *    4% — tarifa reducida (servicios médicos específicos)
 *    0% — exento (algunos servicios médico-asistenciales)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type InvoiceType = "factura" | "tiquete" | "nota_credito"
export type TaxRate = 13 | 4 | 0

export interface InvoiceLineItem {
  service_id?: string
  description: string
  quantity: number
  unit_price: number   // sin IVA
  tax_rate: TaxRate    // 13 | 4 | 0
  tax_amount?: number  // calculado
  line_total?: number  // quantity * unit_price + tax_amount
}

export interface CRInvoiceInput {
  clinic_id: string
  patient_id: string
  appointment_id?: string
  invoice_type: InvoiceType
  items: InvoiceLineItem[]
  payment_method: "efectivo" | "tarjeta" | "sinpe" | "transferencia" | "credito"
  // Datos fiscales del receptor (requerido para factura, opcional para tiquete)
  receptor?: {
    nombre: string
    cedula: string            // 9 dígitos física, 10 jurídica, 12 DIMEX
    cedula_type: "fisica" | "juridica" | "dimex" | "nite"
    email?: string
  }
  notes?: string
  related_invoice_id?: string // para nota de crédito
}

export interface CRInvoiceResult {
  invoice_number: string
  hacienda_key: string | null  // null en modo local
  subtotal: number
  tax_amount: number
  total: number
  status: "borrador" | "emitida" | "aceptada" | "rechazada"
  hacienda_response?: Record<string, unknown>
  items_computed: InvoiceLineItem[]
  provider: "local" | "alegra" | "hacienda_directa"
}

// ── Clave numérica (50 dígitos) ───────────────────────────────────────────────

/**
 * Genera la clave numérica de 50 dígitos según especificación Hacienda CR v4.3
 * Formato:
 *   [2] día + [2] mes + [2] año
 *   [3] código país = 506
 *   [12] cédula emisor (padded)
 *   [2]  tipo de comprobante (01=FE, 04=TE, 03=NC)
 *   [3]  número de oficina (001)
 *   [10] número de secuencia (padded)
 *   [5]  situación (1=Normal, 2=Contingencia, 3=Sin internet)
 *   [8]  código de seguridad (random)
 */
export function generateClaveNumerica(
  invoiceType: InvoiceType,
  emitterCedula: string,
  sequence: number,
): string {
  const now = new Date()
  const dd   = String(now.getDate()).padStart(2, "0")
  const mm   = String(now.getMonth() + 1).padStart(2, "0")
  const yy   = String(now.getFullYear()).slice(-2)

  const pais = "506"
  const cedula = emitterCedula.replace(/\D/g, "").padStart(12, "0").slice(-12)

  const tipoMap: Record<InvoiceType, string> = {
    factura:      "01",
    tiquete:      "04",
    nota_credito: "03",
  }
  const tipo = tipoMap[invoiceType]
  const oficina  = "001"
  const seq      = String(sequence).padStart(10, "0")
  const situacion = "00001" // Normal
  const seguridad = String(Math.floor(Math.random() * 99999999)).padStart(8, "0")

  const clave = `${dd}${mm}${yy}${pais}${cedula}${tipo}${oficina}${seq}${situacion}${seguridad}`
  return clave.slice(0, 50)
}

/**
 * Genera el número consecutivo de la factura
 * Formato: [3] tipo de comprobante + [3] sucursal + [2] terminal + [10] secuencia
 * Ejemplo: 00100200000000012
 */
export function generateInvoiceNumber(
  invoiceType: InvoiceType,
  sequence: number,
): string {
  const tipoMap: Record<InvoiceType, string> = {
    factura:      "001",
    tiquete:      "004",
    nota_credito: "003",
  }
  const tipo     = tipoMap[invoiceType]
  const sucursal = "001"
  const terminal = "01"
  const seq      = String(sequence).padStart(10, "0")
  return `${tipo}-${sucursal}-${terminal}-${seq}`
}

// ── Tax calculations ───────────────────────────────────────────────────────────

export function computeLineItems(items: InvoiceLineItem[]): {
  items: InvoiceLineItem[]
  subtotal: number
  tax_amount: number
  total: number
} {
  let subtotal   = 0
  let tax_amount = 0

  const computed = items.map((item) => {
    const base   = item.quantity * item.unit_price
    const tax    = Math.round(base * (item.tax_rate / 100) * 100) / 100
    const total  = Math.round((base + tax) * 100) / 100
    subtotal   += base
    tax_amount += tax
    return { ...item, tax_amount: tax, line_total: total }
  })

  subtotal   = Math.round(subtotal * 100) / 100
  tax_amount = Math.round(tax_amount * 100) / 100
  const total = Math.round((subtotal + tax_amount) * 100) / 100

  return { items: computed, subtotal, tax_amount, total }
}

// ── Alegra API integration ─────────────────────────────────────────────────────

interface AlegraInvoicePayload {
  date: string
  dueDate: string
  client: {
    name: string
    identification?: { type: string; number: string }
    email?: string
  }
  items: { name: string; quantity: number; price: number; tax?: { id: number }[] }[]
  paymentMethod: string
  stamp: { generateStamp: boolean }
}

export async function submitToAlegra(
  input: CRInvoiceInput,
  computed: ReturnType<typeof computeLineItems>,
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  const email  = process.env.ALEGRA_EMAIL
  const apiKey = process.env.ALEGRA_API_KEY
  if (!email || !apiKey) {
    return { success: false, error: "ALEGRA_EMAIL y ALEGRA_API_KEY no configurados" }
  }

  const credentials = Buffer.from(`${email}:${apiKey}`).toString("base64")
  const today = new Date().toISOString().slice(0, 10)

  const alegraItems = computed.items.map((item) => ({
    name: item.description,
    quantity: item.quantity,
    price: item.unit_price,
    tax: item.tax_rate > 0 ? [{ id: item.tax_rate === 13 ? 3 : 5 }] : [],
    // Alegra tax IDs for CR: 3 = IVA 13%, 5 = IVA 4%
  }))

  const payload: AlegraInvoicePayload = {
    date: today,
    dueDate: today,
    client: {
      name: input.receptor?.nombre ?? "Consumidor Final",
      ...(input.receptor?.cedula && {
        identification: {
          type: { fisica: "CC", juridica: "NIT", dimex: "TE", nite: "NI" }[input.receptor.cedula_type] ?? "CC",
          number: input.receptor.cedula,
        },
      }),
      ...(input.receptor?.email && { email: input.receptor.email }),
    },
    items: alegraItems,
    paymentMethod: input.payment_method === "sinpe" ? "cash" : input.payment_method,
    stamp: { generateStamp: true },
  }

  try {
    const res = await fetch("https://app.alegra.com/api/v1/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${credentials}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json() as Record<string, unknown>
    if (!res.ok) {
      return { success: false, error: (data.message as string) ?? "Error de Alegra" }
    }
    return { success: true, data }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ── Main invoice creator ────────────────────────────────────────────────────────

export async function createCRInvoice(
  input: CRInvoiceInput,
  emitterCedula: string,
  sequence: number,
): Promise<CRInvoiceResult> {
  const computed    = computeLineItems(input.items)
  const invoiceNum  = generateInvoiceNumber(input.invoice_type, sequence)
  const useAlegra   = !!(process.env.ALEGRA_EMAIL && process.env.ALEGRA_API_KEY)

  let claveNumerica: string | null = null
  let haciendaResponse: Record<string, unknown> | undefined
  let status: CRInvoiceResult["status"] = "emitida"
  let provider: CRInvoiceResult["provider"] = "local"

  if (useAlegra) {
    const alegraResult = await submitToAlegra(input, computed)
    provider = "alegra"
    if (alegraResult.success && alegraResult.data) {
      claveNumerica    = (alegraResult.data.stamp as Record<string, unknown>)?.electronicInvoiceKey as string ?? null
      haciendaResponse = alegraResult.data
      status           = "emitida"
    } else {
      // Fallback to local if Alegra fails
      provider          = "local"
      claveNumerica     = generateClaveNumerica(input.invoice_type, emitterCedula, sequence)
      haciendaResponse  = { error: alegraResult.error, fallback: "local" }
      status            = "borrador"
    }
  } else {
    // Local mode — generate clave locally (not valid for Hacienda, but functional for demo)
    claveNumerica = generateClaveNumerica(input.invoice_type, emitterCedula, sequence)
    status        = "emitida"
    provider      = "local"
  }

  return {
    invoice_number:   invoiceNum,
    hacienda_key:     claveNumerica,
    subtotal:         computed.subtotal,
    tax_amount:       computed.tax_amount,
    total:            computed.total,
    status,
    hacienda_response: haciendaResponse,
    items_computed:   computed.items,
    provider,
  }
}
