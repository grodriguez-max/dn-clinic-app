# SKILLS.md — Capacidades del Agente de Marketing

## Campañas de pacientes (6 skills)

### 1. send_reactivation_campaign
Encuentra pacientes inactivos 60+ días y les envía un mensaje de reactivación personalizado.
- **Cuándo usarlo**: Lunes de cada semana (cron automático) o cuando la agenda está floja
- **Framework recomendado**: PAS — nombrar el problema (hace tiempo que no los ve), agitar (perderse el mantenimiento), solucionar (promo o invitación directa)
- **Regla**: Máximo 50 pacientes por campaña para mantener personalización

### 2. send_birthday_campaign
Detecta pacientes que cumplen años hoy y les envía felicitación + oferta especial.
- **Cuándo usarlo**: Cada mañana (cron automático 9am)
- **Framework recomendado**: Reciprocidad — regalo emocional primero, oferta después
- **Regla**: Descuento máximo según configuración de la clínica

### 3. send_post_treatment_followup
Envía mensaje de seguimiento 3 días después de un tratamiento completado.
- **Cuándo usarlo**: Diario (cron automático)
- **Framework recomendado**: BAB — cómo estaba, cómo está ahora, qué viene
- **Contenido**: Cuidados post-tratamiento + pregunta de cómo se siente + invitación a la próxima cita

### 4. send_treatment_reminder
Recuerda a pacientes que su tratamiento periódico está próximo a vencer.
- **Cuándo usarlo**: Lunes (cron automático) para tratamientos con ciclos de 3-6 meses
- **Framework recomendado**: Urgencia + Autoridad

### 5. send_referral_request
Invita a pacientes satisfechos a referir a alguien cercano.
- **Cuándo usarlo**: Después de tratamientos exitosos (calificación 4-5★)
- **Framework recomendado**: Prueba social + Reciprocidad

### 6. send_seasonal_promo
Envía campaña estacional o de evento especial (Día de la Madre, fin de año, etc.).
- **Cuándo usarlo**: Manual, con aprobación previa
- **Framework recomendado**: Escasez real + Urgencia

## Contenido para redes sociales (3 skills)

### 7. generate_social_post
Genera un post para Instagram/Facebook con copy + brief de imagen.
- **Siempre**: Crear como DRAFT — nunca publicar sin aprobación
- **Formato**: Gancho en las primeras 2 líneas, valor en el cuerpo, CTA al final
- **Variedad**: Rotar entre los 4 pilares de contenido

### 8. create_content_calendar
Genera el plan de contenido para 1-4 semanas.
- **Output**: JSON con fecha, tipo, tema, ángulo, gatillo, formato, plataforma
- **Mix**: 30% educativo, 25% prueba social, 25% tips, 20% oferta/behind scenes

### 9. capture_instagram_lead
Registra un lead que llegó por Instagram y lo ingresa al CRM.
- **Acción**: Crear/actualizar paciente en DB + etiquetar como "ig_lead"

## Leads y seguimiento (3 skills)

### 10. followup_unconverted_lead
Follow-up a leads que consultaron pero no agendaron cita en los últimos 7 días.
- **Framework recomendado**: Value-First (Hormozi) — dar un tip o insight antes de preguntar
- **Regla**: Máximo 2 follow-ups por lead, luego marcar como frío

### 11. track_campaign_results
Consulta métricas de campañas: mensajes enviados, respuestas, citas generadas.
- **Cuándo usarlo**: En cada reporte semanal

### 12. get_marketing_segments
Lista los segmentos de pacientes disponibles con su tamaño.
- **Segmentos**: inactivos_60d, cumpleaños_hoy, post_tratamiento_3d, leads_sin_convertir, tratamiento_periodico_vencido

## Email (2 skills)

### 13. send_email_sequence
Inicia secuencia de emails para un paciente: bienvenida, reactivación o post-tratamiento.
- **Regla**: Solo si el paciente tiene email registrado y no tiene opt-out

### 14. create_email_template
Crea template de email para aprobación del dueño.
- **Siempre**: Crear como DRAFT

## Análisis (1 skill)

### 15. generate_marketing_report
Genera reporte semanal de marketing: campañas, engagement, citas generadas, revenue atribuido al agente.
- **Cuándo usarlo**: Lunes 8am (cron automático)
- **Output**: Resumen ejecutivo + métricas + recomendaciones de la semana
