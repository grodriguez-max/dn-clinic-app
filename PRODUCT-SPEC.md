# PRODUCT-SPEC.md — Digital Nomads para Clínicas (Versión Producción)

## Visión del producto

Sistema de gestión completo y listo para producción para clínicas estéticas, dermatológicas, dentales y de belleza en Costa Rica. Incluye 2 agentes de IA integrados, wizard de onboarding, y todo lo necesario para que una clínica nueva esté operativa en menos de 1 hora.

**ESTO NO ES UN MVP.** Es el producto final que se entrega al cliente.

---

## Wizard de Onboarding (primera experiencia del cliente)

### Flujo completo del wizard

Cuando una clínica nueva accede al sistema por primera vez, ve un wizard paso a paso. No ve el dashboard vacío — ve un proceso guiado que la toma de la mano.

#### Paso 1: Bienvenida
```
┌─────────────────────────────────────────────────────┐
│                                                      │
│    ¡Bienvenido a Digital Nomads para Clínicas!       │
│                                                      │
│    Vamos a configurar tu clínica en menos de         │
│    15 minutos. Al terminar, vas a tener:             │
│                                                      │
│    ✓ Tu agenda digital lista                         │
│    ✓ Tu base de pacientes organizada                 │
│    ✓ Tu recepcionista virtual activa en WhatsApp     │
│    ✓ Recordatorios automáticos de citas              │
│                                                      │
│              [ Empezar configuración → ]              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### Paso 2: Datos de la clínica
- Nombre de la clínica
- Dirección
- Teléfono principal
- Email
- Logo (upload)
- Horario de atención (selector visual: lunes-sábado, hora inicio-fin)
- Zona horaria (default: America/Costa_Rica)

#### Paso 3: Tu equipo
- "¿Cuántos profesionales trabajan en tu clínica?"
- Por cada profesional: nombre, especialidad (dropdown: dermatología, odontología, cosmetología, cirugía plástica, otro), email, horario individual
- Botón: "+ Agregar otro profesional"
- Opción: "Soy la única profesional" (simplifica el flujo)

#### Paso 4: Tus servicios
- Templates pre-cargados por especialidad:
  - Dermatología: Limpieza facial, Peeling químico, Microdermoabrasión, Tratamiento anti-acné, Botox, Relleno ácido hialurónico, Mesoterapia, Plasma rico en plaquetas
  - Odontología: Limpieza dental, Blanqueamiento, Carillas, Ortodoncia, Diseño de sonrisa, Implantes
  - Cosmetología: Depilación láser, Microblading, Micropigmentación, Tratamiento corporal, Drenaje linfático, Radiofrecuencia
  - Cirugía plástica: Consulta valoración, Control post-operatorio, Retiro de puntos
- El cliente selecciona los que ofrece (checkboxes)
- Puede editar nombre, duración y precio de cada uno
- Puede agregar servicios custom
- Asignar servicios a profesionales (quién hace qué)

#### Paso 5: Importar pacientes (opcional)
- "¿Tenés una lista de pacientes? Podés importarla."
- Opciones:
  - Subir Excel/CSV (nombre, teléfono, email)
  - Importar de contactos de Google
  - "Prefiero agregarlos manualmente después" (skip)
- Si sube archivo: preview de datos, mapeo de columnas, confirmación

#### Paso 6: Conectar WhatsApp
- "Conectá tu WhatsApp para que la recepcionista virtual pueda responder por vos."
- Muestra QR code (Baileys)
- El cliente escanea con su celular
- Confirmación: "✅ WhatsApp conectado. Tu recepcionista ya puede responder."
- Opción: "Prefiero configurar WhatsApp después" (skip)

#### Paso 7: Personalizar la recepcionista IA
- "Tu recepcionista virtual va a responder WhatsApp 24/7. Personalizala:"
- Nombre de la recepcionista (default: "Asistente de [nombre clínica]")
- Tono: Formal (usted) / Semi-formal / Informal (vos)
- Mensaje de bienvenida personalizable
- Preguntas frecuentes pre-cargadas (editables):
  - "¿Cuál es la dirección?" → [dirección de paso 2]
  - "¿Aceptan tarjeta?" → [editable]
  - "¿Tienen parqueo?" → [editable]
  - "¿Cuáles son los horarios?" → [horario de paso 2]
  - "+ Agregar pregunta frecuente"
- Toggle: "¿Querés que la recepcionista pueda agendar citas?" (default: sí)
- Toggle: "¿Querés que envíe recordatorios automáticos?" (default: sí)

#### Paso 8: Resumen y activación
```
┌─────────────────────────────────────────────────────┐
│  ✅ Todo listo. Resumen de tu configuración:         │
│                                                      │
│  Clínica: Estética Bella Vista                       │
│  Profesionales: 3 (Dra. Ana, Dr. Pedro, Lic. Sofía) │
│  Servicios: 12 activos                               │
│  Pacientes importados: 47                            │
│  WhatsApp: ✅ Conectado                              │
│  Recepcionista IA: ✅ Activa                         │
│  Recordatorios: ✅ 24h + 2h antes                    │
│                                                      │
│  ¿Querés hacer cambios o activar tu clínica?        │
│                                                      │
│    [ ← Revisar ]         [ Activar clínica ✓ ]      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### Post-wizard: Tour guiado del dashboard
- Después de activar, un tour interactivo (tooltips con flechas) muestra:
  - "Acá ves tus citas del día"
  - "Acá podés agendar una cita nueva"
  - "Acá ves la actividad de tu recepcionista virtual"
  - "Acá ves tus métricas de negocio"
- El tour se puede saltar y revivir desde configuración

---

## Pantallas del dashboard (producto completo)

### 1. LOGIN / REGISTRO
- Login con email + password
- "Crear cuenta nueva" → wizard de onboarding
- Recuperar contraseña
- Multi-tenant: cada clínica tiene su espacio aislado
- Roles: Dueño (todo), Profesional (su agenda + pacientes), Recepcionista (agenda + pacientes, sin métricas financieras)

### 2. HOME (Dashboard principal)
- Saludo personalizado con nombre y fecha
- 4 metric cards principales:
  - Citas hoy (número + lista resumida)
  - No-shows esta semana (número + % + comparación vs semana pasada)
  - Revenue este mes (₡ + % vs mes anterior)
  - Pacientes nuevos este mes (número + % vs mes anterior)
- Próximas citas del día (tabla con hora, paciente, servicio, profesional, estado)
- Widget del agente recepcionista:
  - Estado (🟢 Activa / 🔴 Desconectada)
  - Conversaciones hoy
  - Resumen: "Confirmó X citas, reagendó Y, respondió Z preguntas"
- Actividad reciente (timeline):
  - "9:15 — Recepcionista IA confirmó cita de María López"
  - "9:02 — Dr. Pedro completó cita de Carlos Rojas"
  - "8:45 — Nueva paciente registrada: Laura Soto (via WhatsApp)"
- Alertas:
  - Pacientes VIP sin cita programada
  - Profesional sin disponibilidad esta semana
  - No-show rate arriba del 15%

### 3. AGENDA
- Vista semanal por defecto (toggle: día / semana / mes)
- Columnas por profesional
- Franjas horarias según horario configurado
- Cada cita muestra: hora, nombre paciente, servicio, duración (visual), estado (color)
- Estados con colores:
  - Confirmada: verde
  - Pendiente de confirmación: amarillo
  - Cancelada: rojo tachado
  - No-show: rojo sólido
  - Completada: gris
  - Bloqueada (almuerzo, reunión): gris rayado
- Click en franja vacía → crear cita nueva (modal)
- Click en cita existente → ver detalle / editar / cancelar / marcar completada
- Drag & drop para mover citas entre horarios y profesionales
- Duración visual dinámica (un servicio de 30 min ocupa la mitad que uno de 60 min)
- Indicador de disponibilidad: franjas vacías resaltadas

#### Modal: Nueva cita
- Buscar paciente existente (autocompletado por nombre o teléfono)
- Si no existe: "Crear paciente nuevo" inline
- Seleccionar servicio (filtrado por profesional si ya se seleccionó uno)
- Seleccionar profesional (filtrado por servicio si ya se seleccionó uno)
- Fecha y hora (muestra solo disponibles)
- Duración (auto-completada por servicio, editable)
- Notas (opcional)
- Toggle: "Enviar confirmación por WhatsApp" (default: sí)
- Botón: "Agendar cita"

### 4. PACIENTES
#### Vista lista
- Tabla con búsqueda y filtros
- Columnas: nombre, teléfono, última visita, próxima cita, tags, total gastado
- Filtros rápidos: Todos, Nuevos (este mes), VIP, Inactivos (60+ días), Por profesional
- Exportar a Excel
- Botón: "+ Nuevo paciente"

#### Perfil del paciente (detalle)
- Header: nombre, foto (avatar o upload), teléfono, email, edad, tags editables
- Tab 1: Historial de citas
  - Timeline visual con todas las visitas
  - Cada visita: fecha, servicio, profesional, estado, notas
- Tab 2: Ficha clínica
  - Alergias, contraindicaciones, tipo de piel, notas médicas
  - Templates por especialidad (dermatológica, dental, estética general)
  - Campos custom configurables por clínica
  - Historial de tratamientos con notas del profesional
- Tab 3: Fotos antes/después
  - Upload de fotos organizadas por fecha y tratamiento
  - Vista lado a lado (antes | después)
  - Almacenadas en Supabase Storage
- Tab 4: Comunicaciones
  - Historial de mensajes WhatsApp con el agente
  - Emails enviados (recordatorios, campañas, cumpleaños)
- Tab 5: Facturación
  - Historial de pagos
  - Saldo pendiente si aplica

### 5. SERVICIOS
- Lista de servicios organizados por categoría
- Cada servicio: nombre, categoría, duración base, precio, profesionales asignados, estado (activo/inactivo)
- Duración personalizable por profesional (ej: Dra. Ana hace limpieza en 45 min, Lic. Sofía en 60 min)
- CRUD completo
- Categorías editables

### 6. EQUIPO
- Cards de cada profesional con: foto, nombre, especialidad, estado (activo/vacaciones/inactivo)
- Click en profesional → detalle:
  - Calendario individual (solo sus citas)
  - Servicios que ofrece
  - Métricas: citas esta semana, revenue generado, no-show rate, pacientes atendidos
  - Horario configurable (por día de la semana, con excepciones)

### 7. RESERVA ONLINE (página pública)
- URL pública: clinic.digitalnomads.co/estetica-bella-vista (o custom domain)
- Página embebible en sitio web de la clínica o Instagram (link en bio)
- Flujo para el paciente:
  1. Seleccionar servicio (cards visuales con nombre, duración, precio)
  2. Seleccionar profesional (o "sin preferencia")
  3. Seleccionar fecha y hora (calendario con disponibilidad real)
  4. Ingresar datos (nombre, teléfono, email, notas)
  5. Confirmación: "Tu cita está agendada. Vas a recibir un recordatorio por WhatsApp."
- Diseño responsive mobile-first
- Personalizable con logo y colores de la clínica

### 8. MÉTRICAS Y REPORTES
#### Dashboard de métricas
- Período seleccionable (hoy, esta semana, este mes, último trimestre, custom)
- Revenue:
  - Gráfico de área (revenue diario del último mes)
  - Revenue por profesional (bar chart horizontal)
  - Revenue por servicio (bar chart)
  - Revenue por categoría (donut chart)
  - Ticket promedio por paciente
- Citas:
  - Total agendadas vs completadas vs no-shows (funnel)
  - Tasa de no-shows con tendencia temporal (line chart)
  - Citas por día de la semana (bar chart — para saber cuándo hay más demanda)
  - Horas pico (heatmap de hora vs día)
- Pacientes:
  - Nuevos vs recurrentes (stacked bar)
  - Tasa de retención (% que vuelve en 30/60/90 días)
  - Top 10 pacientes por revenue
  - Origen de pacientes (pie chart: WhatsApp, web, referido, Instagram)
- Agente:
  - Conversaciones manejadas por día
  - Citas agendadas por el agente vs por humanos
  - Preguntas respondidas sin intervención
  - Tasa de escalación a humano
  - Citas rescatadas (cancelación → reagendamiento)

#### Reportes exportables
- Reporte mensual en PDF (auto-generado, enviado por email al dueño)
- Exportar métricas a Excel
- Reporte por profesional (para comisiones)

### 9. CAMPAÑAS DE MARKETING (Agente 2)
- Panel de campañas con templates pre-configurados:
  - **Reactivación:** Pacientes inactivos 60+ días → mensaje personalizado con incentivo
  - **Cumpleaños:** Felicitación + descuento especial
  - **Post-tratamiento:** 3 días después → encuesta de satisfacción + instrucciones de cuidado
  - **Solicitud de reseña:** 7 días después → pedir reseña en Google
  - **Promoción estacional:** Campaña custom a segmento específico
  - **Recordatorio de tratamiento:** "Hace 6 meses te hiciste limpieza, te agendamos la siguiente?"
- Cada campaña muestra: segmento target, canal (WhatsApp/email), estado, métricas (enviados, leídos, respondidos, conversiones)
- Campañas automáticas (se ejecutan solas con cron) vs manuales (dueño aprueba antes de enviar)
- Preview del mensaje antes de enviar
- A/B testing básico (2 versiones del mensaje, medir cuál convierte más)

### 10. FACTURACIÓN (integración Costa Rica)
- Generar factura electrónica conforme a Hacienda
- Tipos: Factura electrónica, Tiquete electrónico, Nota de crédito
- Datos del receptor: cédula, nombre, email
- Desglose de servicios con IVA
- Envío automático por email
- Historial de facturas con estado (emitida, aceptada, rechazada)
- Integración con proveedor local de factura electrónica (API de Hacienda o intermediario como Alegra, Gosocket, etc.)

### 11. COSTOS Y FACTURACIÓN DEL SISTEMA
- Para Gabriel (admin): panel que muestra consumo por clínica
- Tokens de IA consumidos por agente por clínica
- Costo de hosting por clínica
- Revenue por clínica
- Margen por clínica

### 12. CONFIGURACIÓN
- Datos de la clínica (editar lo del wizard)
- Horarios y días feriados
- Configuración del agente recepcionista:
  - Personalidad y tono
  - FAQs editables
  - Mensajes de confirmación/recordatorio editables
  - Horario del agente (¿responde 24/7 o solo en horario de atención?)
  - Límites: qué puede hacer solo vs qué escala a humano
- Configuración de marketing:
  - Activar/desactivar cada tipo de campaña automática
  - Editar templates de mensajes
  - Frecuencia de campañas
- Notificaciones:
  - Qué notificaciones recibe el dueño (nueva cita, cancelación, no-show, agente escaló)
  - Canal de notificación (email, WhatsApp, push)
- Usuarios y permisos
- Conexiones:
  - WhatsApp (reconectar, cambiar número)
  - Email (configurar SMTP o Resend)
  - Página de reserva online (activar/desactivar, personalizar URL)
- Plan y facturación (el plan de Digital Nomads, no la factura de la clínica)

---

## Agentes de IA (detalle completo)


## Agentes de IA (detalle completo)

### Agente 1: Recepcionista Virtual

#### System prompt (personalidad)
```
Sos la recepcionista virtual de [nombre clínica]. Tu trabajo es atender
a los pacientes como lo haría la mejor recepcionista del mundo: cálida,
eficiente, empática, proactiva, y con memoria perfecta.

PERSONALIDAD:
- Hablá de [usted/vos] según configuración de la clínica
- Usá el nombre del paciente si lo conocés
- Si el paciente está frustrado o enojado, ajustá el tono a más empático
- Si está entusiasmado, celebralo con él
- Sé proactiva: no solo respondés, sugerís
- Recordá conversaciones pasadas y preferencias del paciente

REGLAS INQUEBRANTABLES:
- NUNCA des diagnósticos ni recomendaciones médicas
- NUNCA inventés información — si no sabés, decí que vas a consultar
- Si detectás una URGENCIA médica (reacción alérgica, dolor intenso,
  sangrado, hinchazón severa), escalá INMEDIATAMENTE a humano
  con prioridad alta
- Siempre confirmá antes de agendar definitivamente
- Respondé en español siempre. Si te escriben en inglés, respondé en inglés
- Máximo 2 minutos sin respuesta — si necesitás tiempo, decilo
- NUNCA envíes un link de pago sin que el paciente lo pida o confirme

INFORMACIÓN DE LA CLÍNICA:
- Nombre: [nombre]
- Dirección: [dirección]
- Horario: [horario]
- Servicios: [lista de servicios con precios y duración]
- Profesionales: [lista con especialidades y horarios]
- FAQs: [preguntas frecuentes configuradas]
- Instrucciones pre-tratamiento: [por servicio]
- Políticas: [cancelación, adelantos, garantías]
```

#### Tools disponibles (20 funciones)

##### Gestión de citas (core)
```
check_availability(professional_id?, service_id?, date?)
  → Devuelve horarios disponibles

create_appointment(patient_id, professional_id, service_id, datetime)
  → Crea cita en el sistema, devuelve confirmación

cancel_appointment(appointment_id, reason?)
  → Cancela cita y ofrece reagendar

reschedule_appointment(appointment_id, new_datetime)
  → Reagenda cita existente
```

##### Gestión de pacientes
```
find_patient(phone_or_name)
  → Busca paciente por teléfono o nombre

create_patient(name, phone, email?)
  → Registra paciente nuevo

get_patient_preferences(patient_id)
  → Consulta alergias, contraindicaciones, preferencias,
    historial de tratamientos, notas médicas
  → Usa esta info para personalizar cada interacción
```

##### Información y consultas
```
get_clinic_info(topic?)
  → Devuelve información de la clínica

send_quote(patient_id, service_ids[])
  → Genera y envía cotización detallada

send_pre_appointment_instructions(appointment_id)
  → Envía instrucciones específicas del tratamiento
```

##### Comunicación inteligente
```
detect_urgency(message)
  → Analiza si el mensaje contiene señales de urgencia médica
  → Si detecta urgencia → escala inmediato con prioridad ALTA

escalate_to_human(reason, conversation_summary, priority)
  → Marca conversación para atención humana
  → Prioridad: normal, alta, urgente

notify_staff(type, message, data)
  → Envía notificación al staff
  → Tipos: lead_caliente, no_show, urgencia, cancelación,
    paciente_vip, feedback_negativo
```

##### Ventas y conversión
```
suggest_complementary_service(appointment_id)
  → Basado en el servicio agendado, sugiere un complemento
  → Incluye descuento si aplica

send_payment_link(patient_id, amount, concept)
  → Genera link de pago (Stripe/SINPE) y lo envía por WhatsApp

rate_lead(patient_phone, score, notes)
  → Clasifica: frío / tibio / caliente
```

##### Lista de espera y check-in
```
add_to_waitlist(patient_id, service_id, professional_id?, preferred_dates?)
  → Agrega paciente a lista de espera cuando no hay disponibilidad

check_waitlist_and_notify(appointment_id_cancelled)
  → Cuando se cancela una cita, notifica al primer paciente en lista

check_in_patient(patient_id)
  → Registra llegada del paciente, notifica al profesional

send_review_request(patient_id, appointment_id)
  → Envía encuesta 1-5, si 4-5 pide reseña en Google
```

#### Flujos automáticos (12 cron jobs)

##### Confirmaciones y recordatorios
1. **Confirmación 24h antes** — con instrucciones pre-tratamiento si aplica
2. **Recordatorio 2h antes** — dirección y datos de llegada
3. **Check-in pre-cita 30 min antes** — "¿Estás en camino?"

##### Post-cita
4. **Post no-show (mismo día 6pm)** — ofrece reagendar
5. **Post-cita (3 días después)** — follow-up de bienestar
6. **Solicitud de reseña (7 días después)** — solo si calificación fue 4-5

##### Seguimiento proactivo
7. **Follow-up leads no convertidos (3 días)** — "¿Pudiste decidirte?"
8. **Recordatorio tratamiento periódico (semanal)** — "Hace X meses de tu última limpieza"
9. **Alerta no-show en tiempo real** — 10 min post-hora → notifica staff

##### Para el staff
10. **Resumen diario al dueño (7am)** — citas, confirmaciones, VIPs, revenue ayer
11. **Notificación de lead caliente** — inmediata cuando lead se clasifica como caliente
12. **Lista de espera check (cada cancelación)** — notifica pacientes en espera

#### Capacidades de comunicación inteligente

- **Detección de urgencia:** reacción alérgica, dolor, sangrado → escala inmediato
- **Detección de emociones:** frustración → empatía extra | entusiasmo → celebra | indecisión → no presiona
- **Memoria contextual:** recuerda alergias, preferencias, historial, profesional favorito
- **Multi-idioma:** español default, inglés si le escriben en inglés (turismo médico CR)

#### Routing de modelos
- FAQ / confirmaciones / recordatorios → Claude Haiku (barato)
- Conversación compleja / urgencia / queja → Claude Sonnet
- Si conversación > 4 turnos O emoción negativa O urgencia → upgrade a Sonnet

---

### Agente 2: Marketing de la Clínica

#### Contexto
Este agente NO es el marketing de Digital Nomads. Es el agente de marketing QUE LE VENDEMOS AL CLIENTE. Trabaja PARA la clínica del cliente, promoviendo los servicios de la clínica, atrayendo pacientes nuevos, y fidelizando los existentes.

#### System prompt (personalidad)
```
Sos el asistente de marketing de [nombre clínica]. Tu trabajo es atraer
pacientes nuevos, fidelizar los existentes, y llenar la agenda de la
clínica usando contenido persuasivo, campañas automatizadas, y
comunicación personalizada.

METODOLOGÍA BASE: Copy que Conecta™
Cada pieza de comunicación debe:
- Conectar con el dolor real del paciente (externo, interno, filosófico)
- Usar gatillos psicológicos (rotar entre: escasez, prueba social,
  autoridad, urgencia, reciprocidad, contraste, curiosidad)
- Tener UN objetivo claro y UN CTA
- Gancho emocional en las primeras 2 líneas

PERSONALIDAD:
- Cálida, profesional, empática — es una clínica de salud/belleza
- Tono que refleje la marca de la clínica (configurado en onboarding)
- Nunca agresivo ni spam
- Siempre da valor antes de pedir algo

REGLAS INQUEBRANTABLES:
- Máximo 1 mensaje de marketing por semana por paciente
- Siempre incluir opción de "no quiero recibir más mensajes"
- Los descuentos y promociones deben estar pre-aprobados por el dueño
- No contactar pacientes que hicieron opt-out
- Solo enviar entre 9am y 7pm
- NUNCA hacer claims médicos falsos o exagerados
- NUNCA prometer resultados específicos de tratamientos
- Todo contenido pasa por aprobación del dueño antes de publicar

INFORMACIÓN DE LA CLÍNICA:
- Nombre, marca, tono de voz: [configurado en onboarding]
- Servicios estrella: [los más rentables o populares]
- Diferenciadores: [qué hace única a esta clínica]
- Pacientes ideales: [perfil demográfico y psicográfico]
- Testimonios aprobados: [si existen]
```

#### Tools disponibles (15 funciones)

##### Campañas automatizadas
```
send_reactivation_campaign(segment_criteria, message_template)
  → Busca pacientes inactivos (60+ días sin visita)
  → Envía mensaje personalizado con incentivo
  → Ej: "Hola María, te extrañamos. Tenemos 20% en limpieza facial este mes"

send_birthday_campaign(patient_id)
  → Felicitación + oferta especial
  → Ej: "¡Feliz cumpleaños! De regalo, 15% en tu próximo tratamiento"

send_post_treatment_followup(appointment_id)
  → 3 días post-tratamiento: instrucciones de cuidado + check de bienestar
  → "¿Cómo vas con tu peeling? Recordá no exponerte al sol esta semana"

send_treatment_reminder(patient_id, service_type, months_since)
  → Recordatorio de tratamiento periódico
  → "Hace 6 meses de tu última limpieza dental. ¿Agendamos la siguiente?"

send_seasonal_promo(campaign_id, segment, message)
  → Campaña estacional configurable
  → Ej: verano = depilación láser, diciembre = paquetes regalo, enero = detox facial

send_referral_request(patient_id)
  → Pide al paciente que refiera a alguien
  → "¿Conocés a alguien que le gustaría nuestros servicios? Si nos refiere,
    ambos reciben 10% de descuento"
```

##### Contenido para redes sociales
```
generate_social_post(topic, platform, format)
  → Genera contenido listo para publicar
  → Plataformas: Instagram (feed, stories, reels, carousel), Facebook, TikTok
  → Formatos: educativo, prueba social, tips, behind the scenes, oferta
  → Incluye: copy + brief de imagen/video + hashtags + hora sugerida
  → Usa Copy que Conecta™: gancho emocional, beneficio > característica, CTA claro
  → TODO contenido va como DRAFT para aprobación del dueño

generate_image(prompt, style, dimensions)
  → Genera imágenes para redes usando AI
  → Estilos: profesional médico, lifestyle belleza, antes/después, infografía
  → Siempre incluye branding de la clínica (colores, logo)

create_content_calendar(weeks, posts_per_week)
  → Plan de contenido con mix de pilares:
    - Educativo (30%): tips de cuidado de piel, datos sobre tratamientos
    - Prueba social (25%): resultados, testimonios, antes/después
    - Tips prácticos (25%): rutinas, productos, errores comunes
    - Oferta + behind the scenes (20%): promos, equipo, instalaciones
```

##### Gestión de leads
```
capture_instagram_lead(comment_data)
  → Cuando alguien comenta "precio" o "info" en un post
  → Envía DM automático con info + invitación a agendar
  → Registra como lead en el CRM

followup_unconverted_lead(patient_id, days_since_inquiry)
  → Lead que preguntó pero no agendó
  → Envía contenido de valor o testimonio relevante
  → "Hola María, vi que estabas interesada en el blanqueamiento.
    Te comparto el resultado de una paciente que se lo hizo la semana pasada"

track_campaign_results(campaign_id)
  → Mide: enviados, leídos, respondidos, citas agendadas, revenue generado
  → Calcula ROI de cada campaña
  → Reporta al dueño semanalmente
```

##### Email marketing
```
send_email_sequence(patient_id, sequence_type)
  → Secuencias pre-configuradas:
    - Bienvenida (nuevo paciente): 3 emails en 10 días
      Email 1: Bienvenida + tips de cuidado según su tratamiento
      Email 2: Testimonios de pacientes similares
      Email 3: Oferta para segunda visita
    - Reactivación: 2 emails en 7 días
      Email 1: "Te extrañamos" + novedad de la clínica
      Email 2: Oferta limitada + CTA directo
    - Post-tratamiento: 2 emails en 14 días
      Email 1: Instrucciones de cuidado detalladas
      Email 2: "¿Cómo vas? + oferta para tratamiento complementario"

create_email_template(type, subject, body, segment)
  → Crea template personalizado de email
  → Segmentos: por servicio, por profesional, por tag, por antigüedad
  → Preview antes de enviar
  → A/B testing: 2 versiones, medir cuál convierte más
```

#### Flujos automáticos del agente marketing (7 cron jobs)

1. **Reactivación (cada lunes 10am):**
   Busca pacientes sin cita en 60+ días → mensaje personalizado

2. **Cumpleaños (diario 9am):**
   Busca pacientes con cumpleaños hoy → felicitación + oferta

3. **Post-tratamiento (diario 10am):**
   Citas completadas hace 3 días → follow-up con instrucciones de cuidado

4. **Solicitud de reseña (diario 10am):**
   Citas completadas hace 7 días con calificación 4-5 → pide reseña Google

5. **Recordatorio tratamiento periódico (cada lunes):**
   Último tratamiento recurrente hace X meses → sugiere reagendar

6. **Follow-up leads tibios (cada miércoles 10am):**
   Leads que preguntaron pero no agendaron en 7 días → envía testimonio o valor

7. **Reporte semanal al dueño (lunes 8am):**
   Resumen: campañas enviadas, leídas, conversiones, revenue atribuido, opt-outs, recomendaciones

#### Pilares de contenido para clínicas estéticas

##### Pilar 1: Educativo (30%)
"Lo que tu piel te está diciendo y vos no sabés"
- Tips de cuidado según tipo de piel
- Qué esperar de cada tratamiento
- Mitos vs realidades de procedimientos estéticos
- Posicionar a los profesionales como expertos

##### Pilar 2: Prueba social (25%)
"Mirá el resultado de María después de 3 sesiones"
- Fotos antes/después (con autorización)
- Testimonios reales de pacientes
- Números: "más de 500 pacientes atendidos este año"
- Historias de transformación

##### Pilar 3: Tips prácticos (25%)
"Los 3 errores que estás cometiendo con tu rutina facial"
- Rutinas de cuidado por tipo de piel
- Qué productos usar/evitar después de un tratamiento
- Preparación para procedimientos
- Cuidado post-tratamiento

##### Pilar 4: Behind the scenes + Oferta (20%)
"Así preparamos cada sesión para que sea perfecta"
- El equipo, las instalaciones, la tecnología
- Proceso paso a paso de un tratamiento
- Promociones estacionales
- Nuevos servicios o equipos

#### Métricas que el agente de marketing reporta

##### Al dueño de la clínica (reporte semanal)
- Campañas enviadas y resultados (leídas, respondidas, convertidas)
- Contenido generado y publicado
- Leads nuevos capturados
- Pacientes reactivados
- Revenue atribuido a campañas del agente
- Tasa de opt-out
- Recomendaciones: "El contenido educativo genera 3x más engagement que las ofertas. Recomiendo aumentar tips de cuidado de piel."

##### Al dashboard (métricas en tiempo real)
- Campañas activas y estado
- Próximas campañas programadas
- Tasa de reactivación (% de inactivos que volvieron)
- ROI por campaña
- Mejores horarios de envío
- Contenido con más engagement

#### Configuración en el onboarding (wizard paso 7)

Cuando la clínica se configura por primera vez, el wizard pregunta:

1. **Tono de marca:** Formal / Semi-formal / Cercano
2. **Servicios estrella:** ¿Cuáles son los 3 servicios que más querés promover?
3. **Diferenciador:** ¿Qué hace única a tu clínica? (tecnología, experiencia, ubicación, precio)
4. **Redes sociales:** ¿Tenés Instagram? ¿Facebook? ¿TikTok? (links)
5. **Frecuencia deseada:** ¿Cuántos posts por semana? (default: 3-4)
6. **Presupuesto de descuentos:** ¿Aprobás descuentos de hasta X% para campañas automáticas?
7. **Aprobación:** ¿Querés aprobar cada mensaje/post antes de enviarse? (default: sí)
8. **Google Reviews:** Link a tu página de Google Business (para solicitar reseñas)

---

## Esquema de base de datos completo (Supabase/PostgreSQL)

```sql
-- Multi-tenancy
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- para URL pública
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  timezone TEXT DEFAULT 'America/Costa_Rica',
  business_hours JSONB, -- {mon: {start: "08:00", end: "18:00"}, ...}
  holidays JSONB, -- ["2026-12-25", ...]
  settings JSONB, -- {agent_tone: "formal", currency: "CRC", ...}
  plan TEXT DEFAULT 'growth', -- starter/growth/premium
  onboarding_completed BOOLEAN DEFAULT false,
  whatsapp_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Usuarios y auth
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users,
  clinic_id UUID REFERENCES clinics NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'professional', 'receptionist', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profesionales
CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics NOT NULL,
  user_id UUID REFERENCES users,
  name TEXT NOT NULL,
  specialty TEXT,
  bio TEXT,
  photo_url TEXT,
  schedule JSONB, -- {mon: {start: "09:00", end: "17:00"}, ...}
  exceptions JSONB, -- [{date: "2026-04-01", available: false, reason: "vacaciones"}]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Servicios
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- facial, corporal, laser, dental, inyectables, capilar
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Servicios por profesional (con duración custom)
CREATE TABLE service_professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services NOT NULL,
  professional_id UUID REFERENCES professionals NOT NULL,
  custom_duration_minutes INTEGER, -- null = usa duración base del servicio
  custom_price DECIMAL(10,2), -- null = usa precio base
  UNIQUE(service_id, professional_id)
);

-- Pacientes
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  birth_date DATE,
  gender TEXT,
  id_number TEXT, -- cédula para facturación
  tags TEXT[] DEFAULT '{}', -- {'vip', 'nuevo', 'dermatologia'}
  notes TEXT,
  source TEXT, -- whatsapp, web, referido, instagram, walkin
  allergies TEXT,
  contraindications TEXT,
  skin_type TEXT,
  medical_notes TEXT,
  opt_out_marketing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Citas
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics NOT NULL,
  patient_id UUID REFERENCES patients NOT NULL,
  professional_id UUID REFERENCES professionals NOT NULL,
  service_id UUID REFERENCES services NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'no_show', 'completed', 'rescheduled')),
  confirmation_sent BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  notes TEXT,
  created_by TEXT, -- user_id or 'agent' or 'online_booking'
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fichas clínicas
CREATE TABLE clinical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics NOT NULL,
  appointment_id UUID REFERENCES appointments,
  patient_id UUID REFERENCES patients NOT NULL,
  professional_id UUID REFERENCES professionals NOT NULL,
  record_date DATE NOT NULL,
  chief_complaint TEXT,
  examination TEXT,
  diagnosis TEXT,
  treatment TEXT,
  recommendations TEXT,
  next_visit_notes TEXT,
  custom_fields JSONB, -- campos específicos por especialidad
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fotos antes/después
CREATE TABLE patient_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients NOT NULL,
  clinical_record_id UUID REFERENCES clinical_records,
  photo_url TEXT NOT NULL,
  photo_type TEXT CHECK (photo_type IN ('before', 'after', 'progress', 'other')),
  treatment TEXT,
  notes TEXT,
  taken_at TIMESTAMPTZ DEFAULT now()
);

-- Conversaciones del agente
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics NOT NULL,
  patient_id UUID REFERENCES patients,
  patient_phone TEXT, -- para pacientes no registrados aún
  channel TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'web', 'email')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated')),
  handled_by TEXT DEFAULT 'agent', -- 'agent' or user_id
  escalation_reason TEXT,
  summary TEXT, -- resumen generado por IA al cerrar
  started_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Mensajes individuales
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'agent', 'human')),
  content TEXT NOT NULL,
  metadata JSONB, -- {model_used, tokens_in, tokens_out, tool_calls}
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Campañas de marketing
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('reactivation', 'birthday', 'post_treatment', 'review_request', 'treatment_reminder', 'custom_promo')),
  channel TEXT DEFAULT 'whatsapp',
  segment_query JSONB, -- criterios de segmentación
  message_template TEXT NOT NULL,
  is_automatic BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  schedule JSONB, -- cron expression o fecha específica
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Resultados de campaña
CREATE TABLE campaign_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns NOT NULL,
  patient_id UUID REFERENCES patients NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  responded BOOLEAN DEFAULT false,
  converted BOOLEAN DEFAULT false, -- ¿agendó cita?
  conversion_appointment_id UUID REFERENCES appointments,
  opt_out BOOLEAN DEFAULT false
);

-- Facturas
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics NOT NULL,
  patient_id UUID REFERENCES patients NOT NULL,
  appointment_id UUID REFERENCES appointments,
  invoice_number TEXT NOT NULL,
  invoice_type TEXT DEFAULT 'factura' CHECK (invoice_type IN ('factura', 'tiquete', 'nota_credito')),
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  payment_method TEXT, -- efectivo, tarjeta, sinpe, transferencia
  status TEXT DEFAULT 'emitida' CHECK (status IN ('borrador', 'emitida', 'aceptada', 'rechazada', 'anulada')),
  hacienda_key TEXT, -- clave numérica de Hacienda
  hacienda_response JSONB,
  items JSONB, -- [{service_id, description, quantity, unit_price, tax}]
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Métricas diarias (pre-calculadas para dashboard rápido)
CREATE TABLE metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics NOT NULL,
  date DATE NOT NULL,
  appointments_scheduled INTEGER DEFAULT 0,
  appointments_completed INTEGER DEFAULT 0,
  appointments_cancelled INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  new_patients INTEGER DEFAULT 0,
  returning_patients INTEGER DEFAULT 0,
  agent_conversations INTEGER DEFAULT 0,
  agent_appointments_created INTEGER DEFAULT 0,
  agent_escalations INTEGER DEFAULT 0,
  campaign_messages_sent INTEGER DEFAULT 0,
  campaign_conversions INTEGER DEFAULT 0,
  UNIQUE(clinic_id, date)
);

-- FAQs configurables por clínica
CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- Row Level Security (RLS) — cada clínica solo ve sus datos
-- Aplicar a TODAS las tablas:
-- ALTER TABLE [tabla] ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "[tabla]_clinic_isolation" ON [tabla]
--   USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));
```

---

## Stack técnico definitivo

```
Frontend:        Next.js 14 (App Router) + TypeScript
Styling:         TailwindCSS + shadcn/ui + Lucide Icons
Backend:         Next.js API Routes + Server Actions
Base de datos:   Supabase (PostgreSQL + Auth + Realtime + Storage)
Agente IA:       @anthropic-ai/sdk (Haiku + Sonnet)
WhatsApp:        @whiskeysockets/baileys (gratis)
Email:           Resend (@resend/node) + React Email
Cron jobs:       Railway cron o node-cron
Calendar UI:     FullCalendar (@fullcalendar/react) o custom con @hello-pangea/dnd
Charts:          Recharts
PDF reports:     @react-pdf/renderer
Factura CR:      API de proveedor local (Alegra, Gosocket, o directo a Hacienda)
File upload:     Supabase Storage + upload widget
Deploy:          Vercel (frontend) + Railway (WhatsApp bot + cron workers)
```

---

## Diseño UI

Antes de empezar, preguntarle a Gabriel qué prefiere:

**Opción A: Dark mode premium** (estilo tech: Linear, Vercel)
- Para clínicas de alto nivel que quieren verse innovadoras
- Fondo oscuro, acentos violeta/azul

**Opción B: Light mode clínico** (estilo médico: limpio, moderno)
- Fondo blanco/gris claro, acentos en verde agua o azul médico
- Más familiar para profesionales de salud
- Referentes: Cal.com, Calendly, Huli (pero mejor)

**Opción C: Híbrido** (light mode por defecto, dark mode toggle)
- Lo mejor de ambos mundos
- Más trabajo de desarrollo

---

## Datos demo completos: "Estética Bella Vista"

### Clínica
- Nombre: Estética Bella Vista
- Dirección: Barrio Escalante, San José, Costa Rica
- Teléfono: +506 2234-5678
- Horario: Lunes a Viernes 8:00-18:00, Sábado 8:00-13:00

### Profesionales (3)
1. **Dra. Ana Mora** — Dermatología estética
   - Servicios: Limpieza facial, Peeling, Botox, Rellenos, Mesoterapia, PRP
   - Horario: L-V 8:00-16:00

2. **Dr. Pedro Vargas** — Odontología estética
   - Servicios: Limpieza dental, Blanqueamiento, Carillas, Diseño de sonrisa
   - Horario: L-V 9:00-17:00, S 9:00-13:00

3. **Lic. Sofía Ruiz** — Cosmetología
   - Servicios: Depilación láser, Microblading, Tratamiento corporal, Drenaje linfático, Radiofrecuencia
   - Horario: L-V 8:00-18:00, S 8:00-13:00

### Servicios (15)
Dermatología: Limpieza facial profunda (60min, ₡35,000), Peeling químico (45min, ₡45,000), Botox por zona (30min, ₡85,000), Relleno ácido hialurónico (45min, ₡120,000), Mesoterapia facial (45min, ₡55,000), PRP facial (60min, ₡75,000)

Odontología: Limpieza dental (45min, ₡25,000), Blanqueamiento (90min, ₡95,000), Carillas por unidad (60min, ₡150,000), Diseño de sonrisa (120min, ₡350,000)

Cosmetología: Depilación láser piernas (60min, ₡45,000), Depilación láser axilas (30min, ₡25,000), Microblading cejas (120min, ₡85,000), Tratamiento corporal reductor (60min, ₡40,000), Radiofrecuencia facial (45min, ₡50,000)

### Pacientes (30)
Generar 30 pacientes con nombres costarricenses, historial de 2-4 citas cada uno, variedad de tags, algunos inactivos (última visita hace 90+ días), algunos VIP, algunos nuevos.

### Citas pre-cargadas
- 2 semanas de citas en la agenda (pasadas y futuras)
- Mix de estados: completadas, confirmadas, pendientes, 2-3 no-shows
- Ocupación ~70% para que se vea activa pero con espacios

### Conversaciones demo (5)
1. Paciente nuevo pregunta por botox → agente da info → agenda cita
2. Paciente confirma cita del día siguiente
3. Paciente cancela y reagenda
4. Paciente pregunta dirección y parqueo → agente responde
5. Pregunta médica → agente escala a humano

---

## Orden de construcción (para Claude Code)

### Fase 1: Foundation (Días 1-4)
1. Scaffold Next.js + TypeScript + TailwindCSS + shadcn/ui
2. Configurar Supabase (crear proyecto, schema completo, RLS)
3. Auth con Supabase (login, registro, roles)
4. Layout principal: sidebar + header + routing
5. Seed script para datos demo (Estética Bella Vista)

### Fase 2: Onboarding Wizard (Días 5-7)
6. Wizard de 8 pasos completo
7. Importación de pacientes (Excel/CSV)
8. Conexión WhatsApp (QR code con Baileys)
9. Tour guiado post-wizard

### Fase 3: Dashboard + Agenda (Días 8-12)
10. Home/Dashboard con metric cards y actividad
11. Agenda semanal por profesional (FullCalendar o custom)
12. CRUD de citas completo con modal
13. Drag & drop de citas

### Fase 4: Pacientes + Servicios + Equipo (Días 13-17)
14. Lista de pacientes con búsqueda y filtros
15. Perfil del paciente (5 tabs: historial, ficha clínica, fotos, comunicaciones, facturación)
16. CRUD de servicios con categorías
17. Servicios por profesional con duración custom
18. Equipo: lista + detalle + calendario individual

### Fase 5: Agente Recepcionista (Días 18-22)
19. Servidor WhatsApp con Baileys (Railway)
20. Integración Anthropic SDK con system prompt y tools
21. Todas las tools: check_availability, create_appointment, find_patient, etc.
22. Routing de modelos (Haiku para simple, Sonnet para complejo)
23. Cron jobs: confirmación 24h, recordatorio 2h, post no-show, post-cita
24. Panel de actividad del agente en el dashboard

### Fase 6: Reserva Online + Métricas (Días 23-27)
25. Página pública de reserva online
26. Dashboard de métricas con Recharts (todos los charts)
27. Reportes exportables (PDF + Excel)
28. Métricas pre-calculadas (cron nocturno)

### Fase 7: Marketing + Facturación (Días 28-33)
29. Agente de marketing con 6 campañas automáticas
30. Panel de campañas con resultados
31. Facturación electrónica CR (integración básica)
32. Panel de costos para admin (Gabriel)

### Fase 8: Polish + Testing (Días 34-40)
33. Responsive completo (mobile + tablet + desktop)
34. Empty states en todas las pantallas
35. Loading states y skeleton loaders
36. Error handling completo
37. Notificaciones (email + WhatsApp al dueño)
38. Testing interno completo con datos demo
39. Performance optimization
40. Deploy producción

### Resultado: Producto completo listo para instalar en una clínica real

---

## Instrucciones para Claude Code

```bash
cd ~/projects/dn-clinic
claude
```

"Leé PRODUCT-SPEC.md completo. Este NO es un MVP — es el producto final para producción. Seguí el orden de construcción fase por fase. Antes de empezar el UI, preguntame si quiero dark mode, light mode, o híbrido. Empezá por la Fase 1: scaffold + Supabase + Auth."
