import Anthropic from "@anthropic-ai/sdk"

// 20 tools for Agente 1: Recepcionista Virtual
export const RECEPTIONIST_TOOLS: Anthropic.Tool[] = [
  // ─── GESTIÓN DE CITAS ──────────────────────────────────────
  {
    name: "check_availability",
    description: "Verifica disponibilidad de citas. Devuelve horarios libres para una fecha, servicio y/o profesional específicos.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Fecha en formato YYYY-MM-DD. Si no se especifica, devuelve la próxima semana disponible." },
        service_id: { type: "string", description: "ID del servicio (opcional)" },
        professional_id: { type: "string", description: "ID del profesional (opcional)" },
      },
      required: [],
    },
  },
  {
    name: "create_appointment",
    description: "Crea una cita en el sistema DESPUÉS de confirmar todos los detalles con el paciente.",
    input_schema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "ID del paciente" },
        professional_id: { type: "string", description: "ID del profesional" },
        service_id: { type: "string", description: "ID del servicio" },
        datetime: { type: "string", description: "Fecha y hora en formato ISO 8601 con timezone CR, ej: 2026-04-01T10:00:00-06:00" },
        notes: { type: "string", description: "Notas opcionales" },
      },
      required: ["patient_id", "professional_id", "service_id", "datetime"],
    },
  },
  {
    name: "cancel_appointment",
    description: "Cancela una cita existente.",
    input_schema: {
      type: "object",
      properties: {
        appointment_id: { type: "string", description: "ID de la cita" },
        reason: { type: "string", description: "Motivo de cancelación" },
      },
      required: ["appointment_id"],
    },
  },
  {
    name: "reschedule_appointment",
    description: "Reagenda una cita existente a una nueva fecha y hora.",
    input_schema: {
      type: "object",
      properties: {
        appointment_id: { type: "string", description: "ID de la cita a reagendar" },
        new_datetime: { type: "string", description: "Nueva fecha y hora en formato ISO 8601" },
      },
      required: ["appointment_id", "new_datetime"],
    },
  },

  // ─── GESTIÓN DE PACIENTES ──────────────────────────────────
  {
    name: "find_patient",
    description: "Busca un paciente por teléfono o nombre. Siempre buscar antes de crear para evitar duplicados.",
    input_schema: {
      type: "object",
      properties: {
        phone: { type: "string", description: "Número de teléfono del paciente" },
        name: { type: "string", description: "Nombre del paciente (búsqueda parcial)" },
      },
      required: [],
    },
  },
  {
    name: "create_patient",
    description: "Registra un paciente nuevo en el sistema.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre completo" },
        phone: { type: "string", description: "Número de teléfono" },
        email: { type: "string", description: "Email (opcional)" },
      },
      required: ["name", "phone"],
    },
  },
  {
    name: "get_patient_preferences",
    description: "Obtiene alergias, contraindicaciones, historial de tratamientos, y preferencias del paciente para personalizar la atención.",
    input_schema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "ID del paciente" },
      },
      required: ["patient_id"],
    },
  },

  // ─── INFORMACIÓN Y CONSULTAS ───────────────────────────────
  {
    name: "get_clinic_info",
    description: "Obtiene información de la clínica: horarios, dirección, servicios, precios, políticas, etc.",
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: ["horarios", "direccion", "servicios", "precios", "profesionales", "politicas", "todo"],
          description: "Qué información se necesita",
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "send_quote",
    description: "Genera y envía una cotización detallada con los servicios de interés del paciente.",
    input_schema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "ID del paciente" },
        service_ids: {
          type: "array",
          items: { type: "string" },
          description: "Lista de IDs de servicios a cotizar",
        },
      },
      required: ["service_ids"],
    },
  },
  {
    name: "send_pre_appointment_instructions",
    description: "Envía instrucciones específicas de preparación para un tratamiento.",
    input_schema: {
      type: "object",
      properties: {
        appointment_id: { type: "string", description: "ID de la cita" },
      },
      required: ["appointment_id"],
    },
  },

  // ─── COMUNICACIÓN INTELIGENTE ──────────────────────────────
  {
    name: "detect_urgency",
    description: "Analiza un mensaje para detectar señales de urgencia médica (reacción alérgica, dolor intenso, sangrado, etc). Llamar cuando hay sospecha.",
    input_schema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Texto del mensaje a analizar" },
      },
      required: ["message"],
    },
  },
  {
    name: "escalate_to_human",
    description: "Escala la conversación a un humano del staff. Usar cuando: el paciente lo pide, hay urgencia médica, la consulta es demasiado compleja, o hay queja grave.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Motivo de escalación" },
        conversation_summary: { type: "string", description: "Resumen de la conversación hasta ahora" },
        priority: {
          type: "string",
          enum: ["normal", "alta", "urgente"],
          description: "Prioridad: normal (responde en horario), alta (responde hoy), urgente (responde ahora)",
        },
      },
      required: ["reason", "priority"],
    },
  },
  {
    name: "notify_staff",
    description: "Envía una notificación al staff de la clínica.",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["lead_caliente", "no_show", "urgencia", "cancelacion", "paciente_vip", "feedback_negativo", "nueva_cita"],
          description: "Tipo de notificación",
        },
        message: { type: "string", description: "Mensaje de la notificación" },
        patient_id: { type: "string", description: "ID del paciente relacionado (opcional)" },
      },
      required: ["type", "message"],
    },
  },

  // ─── VENTAS Y CONVERSIÓN ───────────────────────────────────
  {
    name: "suggest_complementary_service",
    description: "Sugiere un servicio complementario basado en lo que el paciente está agendando o sus tratamientos anteriores.",
    input_schema: {
      type: "object",
      properties: {
        service_id: { type: "string", description: "ID del servicio base" },
        patient_id: { type: "string", description: "ID del paciente (para personalizar)" },
      },
      required: ["service_id"],
    },
  },
  {
    name: "send_payment_link",
    description: "Genera y envía un link de pago (SINPE Móvil o Stripe) para que el paciente pague su adelanto o servicio.",
    input_schema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "ID del paciente" },
        amount: { type: "number", description: "Monto en colones costarricenses" },
        concept: { type: "string", description: "Descripción del pago, ej: Adelanto limpieza facial" },
      },
      required: ["patient_id", "amount", "concept"],
    },
  },
  {
    name: "rate_lead",
    description: "Clasifica la temperatura de un lead potencial para priorizar seguimiento.",
    input_schema: {
      type: "object",
      properties: {
        patient_phone: { type: "string", description: "Teléfono del paciente/lead" },
        score: {
          type: "string",
          enum: ["frio", "tibio", "caliente"],
          description: "Frío: solo preguntó precio. Tibio: preguntó y mostró interés. Caliente: quiere agendar pronto.",
        },
        notes: { type: "string", description: "Notas sobre el lead" },
      },
      required: ["patient_phone", "score"],
    },
  },

  // ─── LISTA DE ESPERA Y CHECK-IN ────────────────────────────
  {
    name: "add_to_waitlist",
    description: "Agrega un paciente a la lista de espera cuando no hay disponibilidad para el horario que quiere.",
    input_schema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "ID del paciente" },
        service_id: { type: "string", description: "ID del servicio" },
        professional_id: { type: "string", description: "ID del profesional preferido (opcional)" },
        preferred_dates: {
          type: "array",
          items: { type: "string" },
          description: "Fechas preferidas en formato YYYY-MM-DD",
        },
      },
      required: ["patient_id", "service_id"],
    },
  },
  {
    name: "check_waitlist_and_notify",
    description: "Cuando se cancela una cita, verifica si hay pacientes en lista de espera y los notifica.",
    input_schema: {
      type: "object",
      properties: {
        appointment_id: { type: "string", description: "ID de la cita cancelada" },
      },
      required: ["appointment_id"],
    },
  },
  {
    name: "check_in_patient",
    description: "Registra la llegada del paciente a la clínica y notifica al profesional que lo atenderá.",
    input_schema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "ID del paciente" },
      },
      required: ["patient_id"],
    },
  },
  {
    name: "send_review_request",
    description: "Envía encuesta de satisfacción post-cita. Si la calificación es 4 o 5, solicita reseña en Google.",
    input_schema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "ID del paciente" },
        appointment_id: { type: "string", description: "ID de la cita completada" },
      },
      required: ["patient_id", "appointment_id"],
    },
  },
]
