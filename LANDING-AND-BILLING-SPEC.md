# LANDING-AND-BILLING-SPEC.md — Landing Page de Venta + Sistema de Billing AaaS

## PARTE 1: Landing Page de Venta

### Objetivo
Página pública donde clínicas estéticas ven qué ofrece el sistema, entienden el valor, y se registran. No es un sitio corporativo genérico — es una máquina de conversión diseñada para que la dueña de una clínica diga "lo necesito" en menos de 3 minutos.

### URL
- `/` — Home / Landing page principal
- `/precios` — Planes y pricing detallado
- `/demo` — Solicitar demo o ver video demo
- `/registro` — Crear cuenta (entra directo al wizard de onboarding)

### Diseño
- Light mode clínico (consistente con el dashboard)
- Mobile-first — la mayoría de dueñas de clínica van a verla desde el celular
- Referentes: Cal.com, Calendly, Huli landing (pero mucho mejor)
- Colores de la marca Digital Nomads adaptados al nicho salud/belleza
- Fotos/mockups del dashboard real (screenshots o mockups del producto)
- Velocidad: debe cargar en menos de 2 segundos

### Secciones de la landing (en orden de scroll)

#### 1. Hero
```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  [Logo Digital Nomads para Clínicas]                         │
│                                                              │
│  Tu clínica funcionando sola                                 │
│  mientras vos atendés pacientes.                             │
│                                                              │
│  Una recepcionista virtual que responde WhatsApp 24/7,       │
│  confirma citas, reduce no-shows un 85%, y un asistente      │
│  de marketing que llena tu agenda automáticamente.            │
│                                                              │
│  [Ver demo →]        [Empezar gratis — 14 días →]            │
│                                                              │
│  +500 citas gestionadas por IA este mes                      │
│                                                              │
│  [Mockup del dashboard en laptop + celular con WhatsApp]     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 2. El problema (conexión emocional)
```
¿Te suena familiar?

□ Respondés WhatsApp hasta las 11pm y los mensajes siguen llegando
□ Perdés 5-10 citas por semana porque los pacientes se olvidan
□ Tu agenda es un cuaderno con tachaduras y doble reservaciones
□ No sabés cuánto facturaste este mes sin revisar 3 cuadernos
□ Pacientes que se hicieron un tratamiento y nunca más volvieron
□ Tu recepcionista se enferma y nadie entiende la agenda

Si marcaste 3 o más, tu clínica está perdiendo dinero cada día.
```

#### 3. La solución (qué ofrecemos)
3 bloques visuales con ícono + título + descripción:

**Recepcionista Virtual 24/7**
"Responde WhatsApp a las 3am. Confirma citas. Reagenda cancelaciones. Responde preguntas frecuentes. Todo automático — vos solo ves los resultados."

**Marketing que llena tu agenda**
"Reactiva pacientes que no vuelven. Felicita cumpleaños con descuento. Pide reseñas en Google. Genera contenido para tus redes. Tu clínica siempre presente."

**Dashboard donde ves todo**
"Agenda visual, base de pacientes, métricas de negocio, factura electrónica CR. Todo en un solo lugar, desde tu celular o computadora."

#### 4. Números que importan (prueba social con datos)
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│   85%    │ │  10hrs   │ │   40%    │ │   24/7   │
│ menos    │ │ ahorradas│ │ más      │ │ atención │
│ no-shows │ │ /semana  │ │ pacientes│ │ WhatsApp │
│          │ │          │ │ recurrentes│         │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

#### 5. Cómo funciona (3 pasos)
```
Paso 1: Configurá tu clínica en 15 minutos
→ Un wizard te guía: servicios, equipo, horarios, WhatsApp.

Paso 2: Tu recepcionista virtual empieza a trabajar
→ Responde WhatsApp, confirma citas, reduce no-shows desde el día 1.

Paso 3: Mirá los resultados en tu dashboard
→ Métricas en tiempo real, agenda organizada, pacientes felices.
```

#### 6. Screenshots / Demo visual
- 4-5 screenshots reales del dashboard:
  - Agenda con citas coloridas
  - Dashboard con métricas
  - Conversación del agente en WhatsApp (mockup)
  - Panel de campañas de marketing
  - Reserva online pública
- Alternativa: video demo de 60 segundos (embed)

#### 7. Funcionalidades completas (expandible)
Grid de features con íconos:
- Agenda por profesional con drag & drop
- CRM de pacientes con historial completo
- Ficha clínica con fotos antes/después
- Reserva online para pacientes (link en tu bio de IG)
- Factura electrónica Costa Rica (Hacienda)
- Recordatorios automáticos por WhatsApp
- Recepcionista virtual con IA 24/7
- Marketing automatizado (reactivación, cumpleaños, reseñas)
- Contenido para redes sociales con IA
- Métricas y reportes exportables
- Multi-profesional con horarios individuales
- Duración personalizable por profesional y servicio

#### 8. Pricing (planes)
→ Link a `/precios` o sección embebida (ver Parte 2 de este doc)

#### 9. Testimonios (cuando existan)
- Placeholder con estructura lista para agregar testimonios reales
- Formato: foto + nombre + clínica + quote + métrica de resultado
- "Antes perdía 8 citas por semana. Ahora el agente confirma todo y mi tasa de no-shows bajó de 25% a 3%." — Dra. Ana Mora, Estética Bella Vista

#### 10. FAQ
Preguntas frecuentes expandibles (accordion):

**¿Necesito saber de tecnología para usarlo?**
No. El wizard te guía paso a paso. Si sabés usar WhatsApp, podés usar nuestro sistema.

**¿Cómo funciona la recepcionista virtual?**
Es un agente de IA que se conecta a tu WhatsApp. Responde automáticamente las preguntas de tus pacientes, confirma citas, reagenda cancelaciones, y te avisa cuando hay algo que necesita tu atención.

**¿Mis pacientes van a saber que hablan con una IA?**
La recepcionista virtual es muy natural y cálida. Muchos pacientes no notan la diferencia. Y si alguien necesita hablar con un humano, el sistema escala la conversación inmediatamente.

**¿Funciona con factura electrónica de Costa Rica?**
Sí. Generamos factura electrónica, tiquete electrónico y notas de crédito conforme a la normativa de Hacienda.

**¿Puedo probarlo antes de pagar?**
Sí. Tenés 14 días gratis sin tarjeta de crédito. Si no te convence, no pagás nada.

**¿Qué pasa si quiero cancelar?**
Cancelás cuando quieras. Sin contratos. Sin penalidades. Tus datos te los exportamos.

**¿Funciona en mi celular?**
Sí. El dashboard es 100% responsive. Podés ver tu agenda, métricas y mensajes del agente desde cualquier dispositivo.

#### 11. CTA final
```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  Tu clínica merece funcionar sola.                           │
│                                                              │
│  Empezá hoy. 14 días gratis. Sin tarjeta.                    │
│                                                              │
│            [ Crear mi cuenta gratis → ]                      │
│                                                              │
│  ¿Tenés dudas? Escribinos por WhatsApp [ícono]               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 12. Footer
- Logo Digital Nomads
- Links: Producto, Precios, Demo, Blog (futuro), Contacto
- Redes sociales
- "Hecho en Costa Rica 🇨🇷"
- © 2026 Digital Nomads — digital-nomads.co

---

## PARTE 2: Sistema de Billing AaaS (Agent as a Service)

### Modelo de pricing

Siguiendo la tendencia que Jensen Huang describió en GTC 2026: no solo cobrar por acceso (SaaS), sino por resultados que los agentes generan (AaaS).

#### Planes

| | Starter | Growth | Premium |
|---|---|---|---|
| **Base mensual** | $99/mes | $199/mes | $299/mes |
| **Agentes incluidos** | 1 (recepcionista) | 2 (recepcionista + marketing) | 2 + personalización |
| **Pacientes en CRM** | Hasta 500 | Hasta 2,000 | Ilimitado |
| **WhatsApp** | Baileys (gratis) | Baileys o Business API | Business API incluido |
| **Profesionales** | Hasta 3 | Hasta 8 | Ilimitado |
| **Reserva online** | ✅ | ✅ | ✅ + dominio custom |
| **Factura electrónica** | ✅ Básica | ✅ Completa | ✅ + integración contable |
| **Métricas** | Básicas | Completas + export | Completas + API |
| **Soporte** | Email | WhatsApp + Email | Prioritario |
| **Setup** | $0 (self-service) | $500 (asistido) | $1,500-3,000 (personalizado) |

#### Cobro por resultado (adicional a la base)

| Acción del agente | Costo por acción | Qué cuenta |
|---|---|---|
| Cita agendada por el agente | $1.50 | Cada cita creada por la recepcionista IA (no por humano) |
| Cita confirmada por el agente | $0.50 | Cada confirmación exitosa de cita existente |
| Paciente reactivado | $2.00 | Paciente inactivo 60+ días que agenda nueva cita por campaña |
| Lead capturado | $1.00 | Nuevo paciente registrado via WhatsApp o reserva online |
| Reseña obtenida | $1.50 | Paciente que deja reseña en Google después del request del agente |
| Campaña enviada | $0.10 | Cada mensaje de campaña de marketing enviado |

**Ejemplo real — Clínica Growth ($199/mes):**
- Base: $199
- 60 citas agendadas por IA × $1.50 = $90
- 120 citas confirmadas × $0.50 = $60
- 8 pacientes reactivados × $2.00 = $16
- 15 leads capturados × $1.00 = $15
- 3 reseñas obtenidas × $1.50 = $4.50
- 200 mensajes de campaña × $0.10 = $20
- **Total: $404.50/mes**
- La clínica está feliz porque cada cita vale ₡25,000-150,000 ($45-270)

#### Tope mensual por plan
Para que el cliente no se asuste con costos variables:
- Starter: tope $199/mes (base $99 + máx $100 en acciones)
- Growth: tope $499/mes (base $199 + máx $300 en acciones)
- Premium: sin tope (el cliente es enterprise y entiende el modelo)

#### Free trial
- 14 días gratis
- Incluye todas las funciones del plan Growth
- Sin tarjeta de crédito
- Al terminar: elige plan o se desactivan los agentes (dashboard sigue funcionando en modo básico)

### Implementación técnica del billing

#### Nuevas tablas en Supabase

```sql
-- Suscripciones
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('trial', 'starter', 'growth', 'premium')),
  status TEXT DEFAULT 'active' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'paused')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  monthly_action_cap DECIMAL(10,2), -- tope mensual de acciones
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Acciones facturables de los agentes
CREATE TABLE billable_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'appointment_created_by_agent',
    'appointment_confirmed_by_agent',
    'patient_reactivated',
    'lead_captured',
    'review_obtained',
    'campaign_message_sent'
  )),
  unit_price DECIMAL(10,4) NOT NULL,
  reference_id UUID, -- appointment_id, patient_id, campaign_result_id según tipo
  description TEXT,
  billed BOOLEAN DEFAULT false,
  billing_period_start DATE,
  billing_period_end DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Facturas de Digital Nomads al cliente
CREATE TABLE platform_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions NOT NULL,
  invoice_number TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_amount DECIMAL(10,2) NOT NULL, -- cargo base del plan
  actions_amount DECIMAL(10,2) DEFAULT 0, -- cargo por acciones
  actions_detail JSONB, -- desglose: {appointment_created: {count: 60, unit: 1.50, total: 90}, ...}
  cap_applied BOOLEAN DEFAULT false, -- si se aplicó el tope
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'past_due', 'void')),
  stripe_invoice_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Precios por acción (configurable por Gabriel)
CREATE TABLE action_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT UNIQUE NOT NULL,
  unit_price DECIMAL(10,4) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Seed de precios default
INSERT INTO action_pricing (action_type, unit_price, description) VALUES
  ('appointment_created_by_agent', 1.50, 'Cita agendada por la recepcionista IA'),
  ('appointment_confirmed_by_agent', 0.50, 'Cita confirmada por el agente'),
  ('patient_reactivated', 2.00, 'Paciente inactivo 60+ días que volvió por campaña'),
  ('lead_captured', 1.00, 'Nuevo paciente registrado via agente o reserva online'),
  ('review_obtained', 1.50, 'Reseña en Google obtenida por el agente'),
  ('campaign_message_sent', 0.10, 'Mensaje de campaña de marketing enviado');
```

#### Integración con Stripe

```
Flujo de suscripción:
1. Clínica se registra → trial 14 días (sin tarjeta)
2. Día 12: email "Tu trial termina en 2 días, elegí tu plan"
3. Clínica elige plan → Stripe Checkout → suscripción activa
4. Cada mes: Stripe cobra base + Digital Nomads calcula acciones
5. Al final del período: cron genera platform_invoice con desglose
6. Si supera el tope: se cobra el tope, no más

API endpoints necesarios:
- POST /api/billing/create-checkout — genera Stripe Checkout session
- POST /api/billing/webhook — recibe eventos de Stripe (payment_succeeded, subscription_cancelled, etc.)
- GET /api/billing/subscription — estado de suscripción de la clínica
- GET /api/billing/usage — acciones del período actual con costo acumulado
- GET /api/billing/invoices — historial de facturas de la plataforma
- POST /api/billing/change-plan — upgrade/downgrade de plan
- POST /api/billing/cancel — cancelar suscripción
```

#### Tracking de acciones

Cada vez que un agente ejecuta una acción facturable, se registra automáticamente:

```typescript
// En los tool-handlers del agente, después de cada acción exitosa:
async function trackBillableAction(clinicId: string, actionType: string, referenceId?: string) {
  const pricing = await getActionPrice(actionType);
  const subscription = await getSubscription(clinicId);
  
  // Verificar si ya alcanzó el tope mensual
  const currentUsage = await getCurrentMonthUsage(clinicId);
  if (currentUsage >= subscription.monthly_action_cap) return; // no cobrar más
  
  await supabase.from('billable_actions').insert({
    clinic_id: clinicId,
    action_type: actionType,
    unit_price: pricing.unit_price,
    reference_id: referenceId,
    billing_period_start: subscription.current_period_start,
    billing_period_end: subscription.current_period_end,
  });
}
```

#### Cron de facturación mensual
```
Cada fin de período de suscripción:
1. Sumar todas las billable_actions del período
2. Aplicar tope si corresponde
3. Crear platform_invoice con desglose
4. Enviar email al dueño con resumen de uso + factura
5. Cobrar via Stripe (base ya cobrada, acciones como line item adicional)
```

### Panel de administración para Gabriel

Nueva ruta: `/admin` (solo accesible con role='admin')

#### Dashboard admin
```
┌─────────────────────────────────────────────────────────────┐
│  Admin — Digital Nomads para Clínicas                        │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Clínicas │ │ MRR      │ │ Acciones │ │ Margen   │       │
│  │ activas  │ │ total    │ │ este mes │ │ promedio │       │
│  │ 12       │ │ $2,850   │ │ 1,247    │ │ 68%      │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  ┌─ Clínicas ────────────────────────────────────────────┐  │
│  │ Bella Vista | Growth | $404 | 60 citas IA | 🟢 activa │  │
│  │ Dental Plus | Starter | $156 | 38 citas IA | 🟢 activa│  │
│  │ Estética CR | Growth | $312 | 45 citas IA | 🟡 trial  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Costos de infra ─────────────────────────────────────┐  │
│  │ Tokens IA: $89/mes | Hosting: $45/mes | Total: $134   │  │
│  │ Revenue: $2,850 | Costo: $134 | Margen: $2,716 (95%) │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Detalle por clínica
- Suscripción: plan, estado, fecha de inicio, próximo cobro
- Uso del período: acciones por tipo con costo
- Historial de facturas
- Tokens de IA consumidos y costo real
- Margen real (revenue - costo IA - costo hosting)
- Botón: pausar/cancelar suscripción
- Botón: cambiar plan
- Botón: enviar mensaje al dueño

#### Configuración de precios
- Editar precio por acción (para todos los clientes o por plan)
- Editar topes mensuales por plan
- Editar precio base por plan
- Preview: "Si cambio el precio de cita a $2.00, el revenue estimado sube de $2,850 a $3,200"

### Restricciones por plan (enforcement)

El sistema debe BLOQUEAR funciones según el plan:

```
Starter ($99):
- Solo 1 agente (recepcionista). Marketing deshabilitado.
- CRM hasta 500 pacientes. Al llegar a 500: "Upgrade a Growth para más pacientes"
- Hasta 3 profesionales
- Métricas básicas (sin export)
- Sin soporte WhatsApp prioritario

Growth ($199):
- 2 agentes (recepcionista + marketing)
- CRM hasta 2,000 pacientes
- Hasta 8 profesionales
- Métricas completas con export
- Soporte WhatsApp

Premium ($299):
- Todo ilimitado
- Personalización de agentes
- API access
- Dominio custom para reserva online
- Soporte prioritario
- Onboarding asistido
```

Implementar con middleware que verifica el plan:
```typescript
// Middleware de plan
function requirePlan(minimumPlan: 'starter' | 'growth' | 'premium') {
  // Verificar suscripción de la clínica
  // Si trial expirado sin plan → redirect a /billing/choose-plan
  // Si plan inferior → mostrar upgrade modal
}
```

---

## Orden de construcción para Claude Code

### Fase 10: Landing Page (2-3 días)
1. Crear rutas: `/`, `/precios`, `/demo`, `/registro`
2. Hero con headline, subtítulo, CTAs, mockup
3. Sección problema (checkboxes emocionales)
4. Sección solución (3 bloques)
5. Números/métricas (4 cards animadas)
6. Cómo funciona (3 pasos)
7. Screenshots/demo visual
8. Pricing cards (3 planes)
9. FAQ accordion
10. CTA final
11. Footer
12. SEO: meta tags, Open Graph, sitemap
13. Responsive completo mobile-first

### Fase 11: Billing AaaS (3-4 días)
14. Tablas nuevas en Supabase (subscriptions, billable_actions, platform_invoices, action_pricing)
15. Integración Stripe (checkout, webhooks, portal)
16. Trial de 14 días con countdown
17. Tracking automático de acciones en los tool-handlers
18. Cron de facturación mensual
19. Restricciones por plan (middleware)
20. Página `/billing` para el dueño de la clínica (plan actual, uso, facturas)
21. Panel admin `/admin` para Gabriel (todas las clínicas, revenue, costos, márgenes)
22. Emails: trial ending, payment succeeded, payment failed, invoice
23. Upgrade/downgrade flow con proration

### Instrucciones para Claude Code

```
Leé LANDING-AND-BILLING-SPEC.md. Construí la Fase 10 (landing page) y Fase 11 (billing AaaS) siguiendo el orden de construcción. Empezá por la landing page. Usá el mismo design system light mode clínico del dashboard.
```
