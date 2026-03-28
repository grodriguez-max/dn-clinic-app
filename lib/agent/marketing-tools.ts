import Anthropic from "@anthropic-ai/sdk"

/**
 * 15 tool definitions for Agente 2: Marketing Agent
 * Groups: Campaigns (6), Social Content (3), Lead Management (3), Email (2), Analytics (1)
 */
export const MARKETING_TOOLS: Anthropic.Tool[] = [

  // ── CAMPAÑAS (6) ─────────────────────────────────────────────────────────

  {
    name: "send_reactivation_campaign",
    description: "Envía mensajes personalizados de reactivación a pacientes inactivos (sin cita en 60+ días). Usa Copy que Conecta™: gancho emocional + incentivo personalizado según sus tratamientos previos.",
    input_schema: {
      type: "object" as const,
      properties: {
        segment_criteria: {
          type: "object",
          description: "Criterios de filtrado: { days_inactive: number, service_category?: string, tags?: string[] }",
        },
        message_template: {
          type: "string",
          description: "Template del mensaje con variables: {nombre}, {servicio}, {descuento}. Debe tener gancho emocional + CTA.",
        },
        discount_percent: {
          type: "number",
          description: "Porcentaje de descuento a ofrecer (máximo configurado en clínica). Opcional.",
        },
      },
      required: ["segment_criteria", "message_template"],
    },
  },

  {
    name: "send_birthday_campaign",
    description: "Envía felicitación de cumpleaños con oferta especial al paciente. Personalizado con su nombre y tratamientos favoritos.",
    input_schema: {
      type: "object" as const,
      properties: {
        patient_id: { type: "string", description: "ID del paciente." },
        discount_percent: { type: "number", description: "Porcentaje de descuento de regalo de cumpleaños." },
        custom_message: { type: "string", description: "Mensaje personalizado. Si no se provee, se genera automáticamente." },
      },
      required: ["patient_id", "discount_percent"],
    },
  },

  {
    name: "send_post_treatment_followup",
    description: "Follow-up 3 días post-tratamiento: instrucciones de cuidado personalizadas + check de bienestar. Demuestra cuidado genuino y abre la puerta a siguiente visita.",
    input_schema: {
      type: "object" as const,
      properties: {
        appointment_id: { type: "string", description: "ID de la cita completada (hace 3 días)." },
        include_next_visit_cta: { type: "boolean", description: "Si incluir CTA suave para agendar próxima visita. Default: true." },
      },
      required: ["appointment_id"],
    },
  },

  {
    name: "send_treatment_reminder",
    description: "Recordatorio de tratamiento periódico a pacientes cuyo último tratamiento fue hace X meses. Ideal para limpiezas, mantenimientos y tratamientos recurrentes.",
    input_schema: {
      type: "object" as const,
      properties: {
        patient_id: { type: "string", description: "ID del paciente." },
        service_name: { type: "string", description: "Nombre del servicio a recordar." },
        months_since_last: { type: "number", description: "Meses desde el último tratamiento." },
        suggested_service_id: { type: "string", description: "ID del servicio a reagendar." },
      },
      required: ["patient_id", "service_name", "months_since_last"],
    },
  },

  {
    name: "send_referral_request",
    description: "Solicita referidos a pacientes satisfechos. Ofrece beneficio para ambos (referidor y referido). Solo contactar pacientes con historial positivo.",
    input_schema: {
      type: "object" as const,
      properties: {
        patient_id: { type: "string", description: "ID del paciente (debe tener ≥2 citas completadas)." },
        referral_discount: { type: "number", description: "Porcentaje de descuento para ambos por referido." },
      },
      required: ["patient_id", "referral_discount"],
    },
  },

  {
    name: "send_seasonal_promo",
    description: "Campaña estacional o especial configurable. Puede ser por temporada (verano=depilación, enero=detox), evento especial o nueva tecnología/servicio.",
    input_schema: {
      type: "object" as const,
      properties: {
        campaign_name: { type: "string", description: "Nombre interno de la campaña." },
        segment: {
          type: "object",
          description: "Segmento objetivo: { tags?: string[], service_history?: string[], min_visits?: number }",
        },
        message: { type: "string", description: "Mensaje de la campaña. Debe seguir Copy que Conecta™." },
        valid_until: { type: "string", description: "Fecha de vencimiento de la promo (ISO string). Opcional." },
        service_id: { type: "string", description: "ID del servicio en promo. Opcional." },
      },
      required: ["campaign_name", "segment", "message"],
    },
  },

  // ── CONTENIDO REDES SOCIALES (3) ─────────────────────────────────────────

  {
    name: "generate_social_post",
    description: "Genera contenido listo para publicar en redes sociales usando Copy que Conecta™. Siempre crea como DRAFT para aprobación del dueño. Incluye copy, brief de imagen, hashtags y hora sugerida.",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: { type: "string", description: "Tema del post. Ej: 'limpieza facial', 'botox', 'tips piel grasa'." },
        platform: {
          type: "string",
          enum: ["instagram_feed", "instagram_story", "instagram_reel", "instagram_carousel", "facebook", "tiktok"],
          description: "Plataforma de destino.",
        },
        content_pillar: {
          type: "string",
          enum: ["educativo", "prueba_social", "tips_practicos", "oferta", "behind_the_scenes"],
          description: "Pilar de contenido (ver metodología).",
        },
        psychological_trigger: {
          type: "string",
          enum: ["prueba_social", "escasez", "urgencia", "reciprocidad", "autoridad", "contraste", "curiosidad"],
          description: "Gatillo psicológico a usar.",
        },
      },
      required: ["topic", "platform", "content_pillar"],
    },
  },

  {
    name: "create_content_calendar",
    description: "Crea un plan de contenido para redes sociales con el mix correcto de pilares (educativo 30%, prueba social 25%, tips 25%, oferta 20%). Genera como DRAFT para aprobación.",
    input_schema: {
      type: "object" as const,
      properties: {
        weeks: { type: "number", description: "Semanas a planificar (1-4)." },
        posts_per_week: { type: "number", description: "Posts por semana (default: 3)." },
        platforms: {
          type: "array",
          items: { type: "string" },
          description: "Plataformas a incluir: ['instagram_feed', 'instagram_story', 'facebook', etc.]",
        },
        focus_services: {
          type: "array",
          items: { type: "string" },
          description: "IDs de servicios a priorizar en el calendario. Opcional.",
        },
      },
      required: ["weeks"],
    },
  },

  {
    name: "capture_instagram_lead",
    description: "Procesa un lead de Instagram (comentario 'precio', 'info', 'cuánto' en un post). Envía DM automático con información y CTA para agendar. Registra como lead en el CRM.",
    input_schema: {
      type: "object" as const,
      properties: {
        instagram_username: { type: "string", description: "Username de Instagram del lead." },
        comment_text: { type: "string", description: "Texto del comentario original." },
        post_topic: { type: "string", description: "Tema del post donde comentó (para personalizar respuesta)." },
        phone: { type: "string", description: "Teléfono si ya se conoce. Opcional." },
      },
      required: ["instagram_username", "comment_text", "post_topic"],
    },
  },

  // ── GESTIÓN DE LEADS (3) ─────────────────────────────────────────────────

  {
    name: "followup_unconverted_lead",
    description: "Follow-up a lead que preguntó pero no agendó en los últimos 7 días. Envía contenido de valor o testimonio relevante a su servicio de interés. Usa FOMO suave, no presión.",
    input_schema: {
      type: "object" as const,
      properties: {
        patient_id: { type: "string", description: "ID del paciente/lead." },
        days_since_inquiry: { type: "number", description: "Días desde que preguntó sin agendar." },
        service_of_interest: { type: "string", description: "Servicio por el que preguntó. Opcional." },
      },
      required: ["patient_id", "days_since_inquiry"],
    },
  },

  {
    name: "track_campaign_results",
    description: "Consulta los resultados de una campaña: enviados, leídos, respondidos, citas agendadas, revenue generado y ROI calculado.",
    input_schema: {
      type: "object" as const,
      properties: {
        campaign_id: { type: "string", description: "ID de la campaña a consultar." },
      },
      required: ["campaign_id"],
    },
  },

  {
    name: "get_marketing_segments",
    description: "Obtiene los segmentos de pacientes disponibles con sus tamaños: inactivos, cumpleaños próximos, post-tratamiento, leads sin convertir, etc. Útil para planificar campañas.",
    input_schema: {
      type: "object" as const,
      properties: {
        clinic_id: { type: "string", description: "ID de la clínica." },
      },
      required: ["clinic_id"],
    },
  },

  // ── EMAIL SEQUENCES (2) ──────────────────────────────────────────────────

  {
    name: "send_email_sequence",
    description: "Inicia una secuencia de emails para un paciente. Secuencias disponibles: bienvenida (3 emails/10 días), reactivación (2 emails/7 días), post-tratamiento (2 emails/14 días).",
    input_schema: {
      type: "object" as const,
      properties: {
        patient_id: { type: "string", description: "ID del paciente." },
        sequence_type: {
          type: "string",
          enum: ["bienvenida", "reactivacion", "post_tratamiento"],
          description: "Tipo de secuencia a enviar.",
        },
        appointment_id: { type: "string", description: "ID de la cita (requerido para post_tratamiento). Opcional." },
      },
      required: ["patient_id", "sequence_type"],
    },
  },

  {
    name: "create_email_template",
    description: "Crea un template de email personalizado para la clínica. Soporta segmentación por servicio, profesional, tag o antigüedad. Se guarda como DRAFT para aprobación.",
    input_schema: {
      type: "object" as const,
      properties: {
        template_type: {
          type: "string",
          enum: ["bienvenida", "reactivacion", "post_tratamiento", "promo", "recordatorio", "custom"],
          description: "Tipo de template.",
        },
        subject: { type: "string", description: "Asunto del email. Debe tener gancho emocional." },
        body: { type: "string", description: "Cuerpo del email en HTML o texto plano." },
        segment: {
          type: "object",
          description: "Segmentación: { by_service?: string, by_tag?: string[], by_months_inactive?: number }",
        },
      },
      required: ["template_type", "subject", "body"],
    },
  },

  // ── ANALYTICS (1) ────────────────────────────────────────────────────────

  {
    name: "generate_marketing_report",
    description: "Genera el reporte semanal de marketing para el dueño: campañas enviadas, tasas de lectura/conversión, revenue atribuido, ROI por campaña, opt-outs y recomendaciones basadas en datos.",
    input_schema: {
      type: "object" as const,
      properties: {
        period_days: { type: "number", description: "Días a reportar. Default: 7." },
        include_recommendations: { type: "boolean", description: "Si incluir recomendaciones de IA basadas en los datos. Default: true." },
      },
      required: [],
    },
  },
]
