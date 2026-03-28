// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/invoices/[id]/pdf
 * Returns a print-ready HTML invoice page
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse("Unauthorized", { status: 401 })

  const { data: profile } = await supabase.from("users").select("clinic_id").eq("id", user.id).single()
  if (!profile?.clinic_id) return new NextResponse("Forbidden", { status: 403 })

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, patients(name, phone, id_number, email)")
    .eq("id", params.id)
    .eq("clinic_id", profile.clinic_id)
    .single()

  if (!invoice) return new NextResponse("Not found", { status: 404 })

  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, address, phone, email, settings")
    .eq("id", profile.clinic_id)
    .single()

  const settings = (clinic?.settings ?? {}) as Record<string, unknown>
  const patient   = invoice.patients as { name?: string; phone?: string; id_number?: string; email?: string } | null
  const items     = (invoice.items ?? []) as { description: string; quantity: number; unit_price: number; tax_rate: number; tax_amount?: number; line_total?: number }[]

  const TYPE_MAP: Record<string, string> = { factura: "Factura Electrónica", tiquete: "Tiquete Electrónico", nota_credito: "Nota de Crédito" }
  const STATUS_MAP: Record<string, string> = { borrador: "Borrador", emitida: "Emitida", aceptada: "Aceptada por Hacienda", rechazada: "Rechazada por Hacienda", anulada: "ANULADA" }

  function colones(n: number) {
    return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(n)
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-CR", { timeZone: "America/Costa_Rica", day: "2-digit", month: "long", year: "numeric" })
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Factura ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; max-width: 680px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #0d9488; padding-bottom: 20px; }
    .logo-area h1 { font-size: 20px; font-weight: 700; color: #0d9488; }
    .logo-area p { font-size: 11px; color: #666; margin-top: 2px; }
    .invoice-meta { text-align: right; }
    .invoice-meta .number { font-size: 16px; font-weight: 700; font-family: monospace; }
    .invoice-meta .type { font-size: 11px; color: #666; margin-bottom: 4px; }
    .invoice-meta .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; ${invoice.status === "anulada" ? "background: #fef2f2; color: #dc2626;" : "background: #f0fdf4; color: #16a34a;"} }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .party h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin-bottom: 6px; }
    .party p { font-size: 12px; line-height: 1.5; }
    .party .name { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead th { background: #f4f4f5; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; }
    thead th:last-child, thead th:nth-child(3), thead th:nth-child(2) { text-align: right; }
    tbody td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 12px; vertical-align: middle; }
    tbody td:last-child, tbody td:nth-child(3), tbody td:nth-child(2) { text-align: right; font-family: monospace; }
    .totals { margin-left: auto; width: 240px; }
    .totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
    .totals .row.total { font-weight: 700; font-size: 14px; border-top: 2px solid #0d9488; padding-top: 8px; margin-top: 4px; }
    .totals .row span:last-child { font-family: monospace; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
    .hacienda-key { font-family: monospace; font-size: 10px; word-break: break-all; color: #666; background: #f9fafb; padding: 8px; border-radius: 4px; margin-top: 8px; }
    .void-overlay { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; font-weight: 900; color: rgba(220,38,38,0.08); pointer-events: none; }
    @media print {
      body { padding: 16px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  ${invoice.status === "anulada" ? '<div class="void-overlay">ANULADA</div>' : ""}

  <div class="no-print" style="margin-bottom:16px">
    <button onclick="window.print()" style="background:#0d9488;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px">
      Imprimir / Guardar PDF
    </button>
  </div>

  <div class="header">
    <div class="logo-area">
      <h1>${clinic?.name ?? "Clínica"}</h1>
      ${clinic?.address ? `<p>${clinic.address}</p>` : ""}
      ${clinic?.phone ? `<p>Tel: ${clinic.phone}</p>` : ""}
      ${clinic?.email ? `<p>${clinic.email}</p>` : ""}
      ${settings.cedula_juridica ? `<p>Cédula Jurídica: ${settings.cedula_juridica}</p>` : ""}
    </div>
    <div class="invoice-meta">
      <p class="type">${TYPE_MAP[invoice.invoice_type] ?? invoice.invoice_type}</p>
      <p class="number">${invoice.invoice_number}</p>
      <p style="font-size:11px;color:#666;margin-top:4px">${fmtDate(invoice.created_at)}</p>
      <p style="margin-top:6px"><span class="status">${STATUS_MAP[invoice.status] ?? invoice.status}</span></p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Emisor</h3>
      <p class="name">${clinic?.name ?? ""}</p>
      ${settings.cedula_juridica ? `<p>Cédula Jurídica: ${settings.cedula_juridica}</p>` : ""}
      ${clinic?.address ? `<p>${clinic.address}</p>` : ""}
    </div>
    <div class="party">
      <h3>Receptor</h3>
      <p class="name">${patient?.name ?? "Consumidor Final"}</p>
      ${patient?.id_number ? `<p>Cédula: ${patient.id_number}</p>` : ""}
      ${patient?.phone ? `<p>Tel: ${patient.phone}</p>` : ""}
      ${patient?.email ? `<p>${patient.email}</p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th>Cant.</th>
        <th>P. Unitario</th>
        <th>IVA</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item) => `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${colones(item.unit_price)}</td>
          <td>${item.tax_rate}%</td>
          <td>${colones(item.line_total ?? (item.quantity * item.unit_price + (item.tax_amount ?? 0)))}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${colones(Number(invoice.subtotal))}</span></div>
    <div class="row"><span>IVA</span><span>${colones(Number(invoice.tax_amount))}</span></div>
    <div class="row total"><span>TOTAL</span><span>${colones(Number(invoice.total))}</span></div>
  </div>

  <div class="footer">
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#666">
      <span>Forma de pago: <strong>${invoice.payment_method}</strong></span>
      <span>Generado: ${fmtDate(new Date().toISOString())}</span>
    </div>
    ${invoice.hacienda_key ? `
      <p style="margin-top:12px;font-size:10px;color:#666;font-weight:600">Clave numérica Hacienda:</p>
      <p class="hacienda-key">${invoice.hacienda_key}</p>
    ` : `
      <p style="margin-top:12px;font-size:10px;color:#999;font-style:italic">
        * Comprobante interno — sin emisión a Hacienda. Activá la integración con Alegra para emisión fiscal válida.
      </p>
    `}
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
