/**
 * Facturación Electrónica — Ministerio de Hacienda Costa Rica
 *
 * Flow:
 * 1. Generate XML invoice (version 4.3 schema)
 * 2. Sign XML with clinic's BCCR digital certificate (.p12)
 * 3. POST to ATV API (base64 encoded)
 * 4. Poll/webhook for acceptance (estado: aceptado / rechazado)
 *
 * For signing we use a third-party signing service (configurable via env)
 * since Node.js xmldsig with .p12 requires native crypto bindings.
 * Set HACIENDA_SIGNER_URL for self-hosted or leave for direct mode.
 */

import { createServiceClient } from "@/lib/supabase/server"

// ─── Types ────────────────────────────────────────────────────────────

export interface HaciendaClinicConfig {
  cedula: string            // Cédula jurídica o física
  cedula_tipo: "01" | "02" | "03" | "04"  // 01=física, 02=jurídica, 03=DIMEX, 04=NITE
  nombre: string
  nombre_comercial?: string
  telefono: string
  correo: string
  provincia: string         // código provincia (1-7)
  canton: string            // código cantón
  distrito: string          // código distrito
  direccion: string
  actividad_economica: string  // CIIU code e.g. "8621" para actividades médicas
  ambiente: "01" | "02"    // 01=producción, 02=pruebas (staging)
  consecutivo_actual: number
}

export interface LineItem {
  codigo: string
  descripcion: string
  cantidad: number
  unidad: string           // "Sp" for services, "Unid" for products
  precio_unitario: number
  impuesto_codigo?: "01" | "02" | "03" | "04" | "05" | "08"  // 01=IVA, 08=exento
  impuesto_tarifa?: number // e.g. 13 for 13% IVA
}

export interface InvoiceData {
  clinicId: string
  invoiceId?: string
  receptor: {
    nombre: string
    cedula?: string
    cedula_tipo?: "01" | "02" | "03" | "04"
    correo?: string
    telefono?: string
  }
  lineas: LineItem[]
  medio_pago: "01" | "02" | "03" | "04" | "05"
  // 01=efectivo, 02=tarjeta, 03=cheque, 04=transferencia, 05=recaudado_por_terceros
  condicion_venta: "01" | "02"  // 01=contado, 02=crédito
  plazo_credito?: string
  notas?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────

function pad(n: number, len: number) { return String(n).padStart(len, "0") }

function generateClave(config: HaciendaClinicConfig): string {
  const now = new Date()
  const day   = pad(now.getDate(), 2)
  const month = pad(now.getMonth() + 1, 2)
  const year  = pad(now.getFullYear() % 100, 2)
  const pais  = "506"
  const cedula = config.cedula.padStart(12, "0")
  const consec = pad(config.consecutivo_actual + 1, 10)
  const sitSec = config.ambiente === "01" ? "1" : "2"  // 1=normal, 2=contingencia
  const codigo = Math.floor(Math.random() * 100000000).toString().padStart(8, "0")
  return `${pais}${day}${month}${year}${cedula}${consec}${sitSec}${codigo}`
}

function generateConsecutivo(type: "FE" | "TE" | "NC" | "ND", config: HaciendaClinicConfig): string {
  const sucursal = "001"
  const terminal = "00001"
  const typeCode = type === "FE" ? "01" : type === "TE" ? "02" : type === "NC" ? "03" : "04"
  const seq = pad(config.consecutivo_actual + 1, 10)
  return `${sucursal}${terminal}${typeCode}${seq}`
}

function formatDate(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "-06:00")
}

function calcularImpuesto(items: LineItem[]) {
  const impuestos: Record<string, { tarifa: number; monto: number }> = {}
  items.forEach((item) => {
    if (item.impuesto_codigo && item.impuesto_codigo !== "08") {
      const key = item.impuesto_codigo
      const base = item.cantidad * item.precio_unitario
      const tarifa = item.impuesto_tarifa ?? 13
      const monto = base * (tarifa / 100)
      if (!impuestos[key]) impuestos[key] = { tarifa, monto: 0 }
      impuestos[key].monto += monto
    }
  })
  return impuestos
}

// ─── XML Generation ────────────────────────────────────────────────────

export function generateInvoiceXML(config: HaciendaClinicConfig, data: InvoiceData, clave: string, consecutivo: string): string {
  const now = formatDate()
  const lines = data.lineas

  // Subtotals
  const subtotal = lines.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0)
  const impuestos = calcularImpuesto(lines)
  const totalImpuesto = Object.values(impuestos).reduce((s, i) => s + i.monto, 0)
  const totalVenta = subtotal
  const totalVentaNeta = subtotal
  const totalComprobante = subtotal + totalImpuesto

  const lineItems = lines.map((line, idx) => {
    const lineSubtotal = line.cantidad * line.precio_unitario
    const lineImpuesto = line.impuesto_codigo && line.impuesto_codigo !== "08"
      ? `<Impuesto>
          <Codigo>${line.impuesto_codigo}</Codigo>
          <Tarifa>${line.impuesto_tarifa ?? 13}</Tarifa>
          <Monto>${(lineSubtotal * ((line.impuesto_tarifa ?? 13) / 100)).toFixed(5)}</Monto>
        </Impuesto>` : ""
    const lineTotal = lineSubtotal + (line.impuesto_codigo && line.impuesto_codigo !== "08"
      ? lineSubtotal * ((line.impuesto_tarifa ?? 13) / 100) : 0)

    return `<LineaDetalle>
      <NumeroLinea>${idx + 1}</NumeroLinea>
      <Codigo>
        <Tipo>04</Tipo>
        <Codigo>${line.codigo}</Codigo>
      </Codigo>
      <Cantidad>${line.cantidad}</Cantidad>
      <UnidadMedida>${line.unidad}</UnidadMedida>
      <Detalle>${line.descripcion.substring(0, 200)}</Detalle>
      <PrecioUnitario>${line.precio_unitario.toFixed(5)}</PrecioUnitario>
      <MontoTotal>${lineSubtotal.toFixed(5)}</MontoTotal>
      ${lineImpuesto}
      <SubTotal>${lineSubtotal.toFixed(5)}</SubTotal>
      <MontoTotalLinea>${lineTotal.toFixed(5)}</MontoTotalLinea>
    </LineaDetalle>`
  }).join("\n")

  const receptorXml = data.receptor.cedula ? `<Receptor>
    <Nombre>${data.receptor.nombre}</Nombre>
    <Identificacion>
      <Tipo>${data.receptor.cedula_tipo ?? "01"}</Tipo>
      <Numero>${data.receptor.cedula}</Numero>
    </Identificacion>
    ${data.receptor.correo ? `<CorreoElectronico>${data.receptor.correo}</CorreoElectronico>` : ""}
  </Receptor>` : ""

  return `<?xml version="1.0" encoding="UTF-8"?>
<FacturaElectronica xmlns="https://tribunet.hacienda.go.cr/docs/esquemas/2017/v4.3/facturaElectronica"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="https://tribunet.hacienda.go.cr/docs/esquemas/2017/v4.3/facturaElectronica">
  <Clave>${clave}</Clave>
  <NumeroConsecutivo>${consecutivo}</NumeroConsecutivo>
  <FechaEmision>${now}</FechaEmision>
  <Emisor>
    <Nombre>${config.nombre}</Nombre>
    <Identificacion>
      <Tipo>${config.cedula_tipo}</Tipo>
      <Numero>${config.cedula}</Numero>
    </Identificacion>
    <NombreComercial>${config.nombre_comercial ?? config.nombre}</NombreComercial>
    <Ubicacion>
      <Provincia>${config.provincia}</Provincia>
      <Canton>${config.canton}</Canton>
      <Distrito>${config.distrito}</Distrito>
      <OtrasSenas>${config.direccion}</OtrasSenas>
    </Ubicacion>
    <Telefono>
      <CodigoPais>506</CodigoPais>
      <NumTelefono>${config.telefono.replace(/\D/g, "")}</NumTelefono>
    </Telefono>
    <CorreoElectronico>${config.correo}</CorreoElectronico>
  </Emisor>
  ${receptorXml}
  <CondicionVenta>${data.condicion_venta}</CondicionVenta>
  ${data.plazo_credito ? `<PlazoCredito>${data.plazo_credito}</PlazoCredito>` : ""}
  <MedioPago>${data.medio_pago}</MedioPago>
  <DetalleServicio>
    ${lineItems}
  </DetalleServicio>
  <ResumenFactura>
    <CodigoMoneda>CRC</CodigoMoneda>
    <TipoCambio>1</TipoCambio>
    <TotalServGravados>${subtotal.toFixed(5)}</TotalServGravados>
    <TotalServExentos>0.00000</TotalServExentos>
    <TotalMercanciasGravadas>0.00000</TotalMercanciasGravadas>
    <TotalMercanciasExentas>0.00000</TotalMercanciasExentas>
    <TotalGravado>${subtotal.toFixed(5)}</TotalGravado>
    <TotalExento>0.00000</TotalExento>
    <TotalVenta>${totalVenta.toFixed(5)}</TotalVenta>
    <TotalDescuentos>0.00000</TotalDescuentos>
    <TotalVentaNeta>${totalVentaNeta.toFixed(5)}</TotalVentaNeta>
    <TotalImpuesto>${totalImpuesto.toFixed(5)}</TotalImpuesto>
    <TotalComprobante>${totalComprobante.toFixed(5)}</TotalComprobante>
  </ResumenFactura>
  ${data.notas ? `<Otros><OtroTexto>${data.notas}</OtroTexto></Otros>` : ""}
</FacturaElectronica>`
}

// ─── API Submission ───────────────────────────────────────────────────

async function getAtvToken(config: HaciendaClinicConfig): Promise<string | null> {
  const base = config.ambiente === "01"
    ? "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token"
    : "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token"

  try {
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: "api-prod",
        client_secret: process.env.HACIENDA_CLIENT_SECRET ?? "",
        username: config.cedula,
        password: process.env.HACIENDA_API_PASSWORD ?? "",
        grant_type: "password",
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.access_token as string
  } catch { return null }
}

async function signXml(xml: string): Promise<string | null> {
  // If a signing service is configured, use it
  const signerUrl = process.env.HACIENDA_SIGNER_URL
  if (!signerUrl) {
    // Return unsigned XML — clinic must configure signing service or p12
    console.warn("[hacienda] No signer configured — returning unsigned XML")
    return xml
  }
  try {
    const res = await fetch(`${signerUrl}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        xml,
        p12_base64: process.env.HACIENDA_P12_BASE64,
        p12_password: process.env.HACIENDA_P12_PASSWORD,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.signed_xml as string
  } catch { return null }
}

async function submitToAtv(config: HaciendaClinicConfig, signedXml: string, token: string, clave: string): Promise<{ ok: boolean; error?: string }> {
  const base = config.ambiente === "01"
    ? "https://api.comprobanteselectronicos.go.cr/recepcion/v1/recepcion"
    : "https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/recepcion"

  const xmlB64 = Buffer.from(signedXml).toString("base64")
  const payload = {
    clave,
    fecha: new Date().toISOString(),
    emisor: { tipoIdentificacion: config.cedula_tipo, numeroIdentificacion: config.cedula },
    comprobanteXml: xmlB64,
  }

  try {
    const res = await fetch(base, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    // 202 = accepted for processing
    return res.status === 202 ? { ok: true } : { ok: false, error: `HTTP ${res.status}` }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── Main Entry Points ─────────────────────────────────────────────────

export async function emitirFactura(data: InvoiceData): Promise<{ ok: boolean; clave?: string; consecutivo?: string; error?: string }> {
  const supabase = createServiceClient()

  // Load clinic hacienda config from settings
  const { data: clinic } = await supabase.from("clinics").select("settings, name").eq("id", data.clinicId).single()
  const settings = (clinic?.settings ?? {}) as Record<string, unknown>
  const hcfg = settings.hacienda as HaciendaClinicConfig | undefined

  if (!hcfg?.cedula) return { ok: false, error: "Clínica sin configuración de Hacienda. Configure en Configuración → Facturación." }

  const clave = generateClave(hcfg)
  const consecutivo = generateConsecutivo("FE", hcfg)
  const xml = generateInvoiceXML(hcfg, data, clave, consecutivo)

  // Sign the XML
  const signedXml = await signXml(xml)
  if (!signedXml) return { ok: false, error: "Error al firmar el XML. Configure el firmador digital." }

  // Get ATV token
  const token = await getAtvToken(hcfg)
  if (!token) return { ok: false, error: "Error de autenticación con Hacienda. Verifique credenciales." }

  // Submit
  const result = await submitToAtv(hcfg, signedXml, token, clave)

  // Record in DB
  await supabase.from("electronic_invoices").insert({
    clinic_id: data.clinicId,
    invoice_id: data.invoiceId ?? null,
    clave,
    consecutivo,
    xml_payload: signedXml,
    estado_hacienda: result.ok ? "pendiente" : "error",
    mensaje_hacienda: result.error ?? null,
    sent_at: result.ok ? new Date().toISOString() : null,
  })

  if (!result.ok) return { ok: false, error: result.error }

  // Increment consecutivo in clinic settings
  await supabase.from("clinics").update({
    settings: { ...settings, hacienda: { ...hcfg, consecutivo_actual: hcfg.consecutivo_actual + 1 } },
  }).eq("id", data.clinicId)

  return { ok: true, clave, consecutivo }
}

export async function checkInvoiceStatus(clinicId: string, clave: string): Promise<{ estado: string; mensaje?: string }> {
  const supabase = createServiceClient()
  const { data: clinic } = await supabase.from("clinics").select("settings").eq("id", clinicId).single()
  const settings = (clinic?.settings ?? {}) as Record<string, unknown>
  const hcfg = settings.hacienda as HaciendaClinicConfig | undefined

  if (!hcfg) return { estado: "error", mensaje: "No configurado" }

  const base = hcfg.ambiente === "01"
    ? `https://api.comprobanteselectronicos.go.cr/recepcion/v1/recepcion/${clave}`
    : `https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/recepcion/${clave}`

  const token = await getAtvToken(hcfg)
  if (!token) return { estado: "error", mensaje: "Error de autenticación" }

  try {
    const res = await fetch(base, { headers: { "Authorization": `Bearer ${token}` } })
    if (!res.ok) return { estado: "error", mensaje: `HTTP ${res.status}` }
    const data = await res.json()
    const estado = data.ind_estado === "aceptado" ? "aceptado" : data.ind_estado === "rechazado" ? "rechazado" : "pendiente"

    // Update DB
    await supabase.from("electronic_invoices")
      .update({
        estado_hacienda: estado,
        xml_response: data.respuesta_xml ?? null,
        mensaje_hacienda: data.mensaje_hacienda ?? null,
        accepted_at: estado === "aceptado" ? new Date().toISOString() : null,
      })
      .eq("clave", clave)

    return { estado, mensaje: data.mensaje_hacienda }
  } catch { return { estado: "error", mensaje: "Error de conexión" } }
}
