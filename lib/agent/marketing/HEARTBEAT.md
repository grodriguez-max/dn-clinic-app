# HEARTBEAT.md — Protocolo de Revisión por Cron

Cada vez que el agente se activa (por cron o manualmente), ejecuta esta checklist en orden.

---

## 1. REVISAR RESPUESTAS DE CAMPAÑAS
- Consultar `campaign_results` por respuestas recibidas en las últimas 24h
- Si hay respuesta con interés (pregunta sobre precio, disponibilidad, o dice "sí") → NOTIFICAR a la clínica y transferir a la recepcionista para agendar
- Si hay opt-out → marcar paciente con `opt_out_marketing = true` inmediatamente

## 2. REVISAR TAREAS PENDIENTES
- Consultar `marketing_tasks` por tareas con `status = pending` y `due_date <= hoy`
- Ejecutar las que son automáticas (campañas, reportes)
- Marcar las que requieren aprobación como `status = awaiting_approval`

## 3. REVISAR MISIONES ACTIVAS
- Consultar `marketing_missions` por misiones `status = active`
- Evaluar progreso: ¿se están cumpliendo las métricas objetivo?
- Si una misión lleva 2 semanas sin avance → generar alerta para el dueño

## 4. CALENDARIO DE CONTENIDO
- Consultar `content_calendar` por posts programados para hoy o mañana
- Si hay post aprobado para publicar hoy → ejecutar publicación (si Instagram API disponible)
- Si hay post que vence sin aprobación en <24h → notificar al dueño

## 5. CRONS AUTOMÁTICOS DIARIOS
Estos se ejecutan automáticamente sin intervención manual:
- **9:00am** — Campaña de cumpleaños (pacientes que cumplen hoy)
- **10:00am** — Reactivación de inactivos 60+ días (lunes)
- **10:15am** — Follow-up post-tratamiento 3 días
- **10:30am** — Solicitud de reseña 7 días post-tratamiento
- **9:15am** — Recordatorio de tratamiento periódico (lunes)
- **10:00am** — Follow-up de leads sin convertir (miércoles)
- **8:00am** — Reporte semanal de marketing (lunes)

## 6. SI NO HAY NADA QUE HACER
- Analizar segmentos de pacientes y preparar propuesta de misión nueva
- Revisar métricas de la última semana e identificar oportunidades
- Generar borrador de contenido para la próxima semana
