// ============================================================
// TIPOS BASE — DN Clínicas
// ============================================================

export type UserRole = "owner" | "professional" | "receptionist" | "admin";
export type ClinicPlan = "starter" | "growth" | "premium";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "no_show"
  | "completed"
  | "rescheduled";

export type CampaignType =
  | "reactivation"
  | "birthday"
  | "post_treatment"
  | "review_request"
  | "treatment_reminder"
  | "custom_promo";

export type InvoiceType = "factura" | "tiquete" | "nota_credito";
export type InvoiceStatus = "borrador" | "emitida" | "aceptada" | "rechazada" | "anulada";

export type ConversationStatus = "active" | "resolved" | "escalated";
export type MessageChannel = "whatsapp" | "web" | "email";

// ============================================================
// DATABASE TYPES
// ============================================================

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  timezone: string;
  business_hours: BusinessHours | null;
  holidays: string[] | null;
  settings: ClinicSettings | null;
  plan: ClinicPlan;
  onboarding_completed: boolean;
  whatsapp_connected: boolean;
  created_at: string;
}

export interface BusinessHours {
  mon?: DaySchedule;
  tue?: DaySchedule;
  wed?: DaySchedule;
  thu?: DaySchedule;
  fri?: DaySchedule;
  sat?: DaySchedule;
  sun?: DaySchedule;
}

export interface DaySchedule {
  start: string; // "08:00"
  end: string;   // "18:00"
  active: boolean;
}

export interface ClinicSettings {
  agent_tone: "formal" | "semi_formal" | "informal";
  agent_name: string;
  currency: string;
  welcome_message?: string;
  agent_schedule_24h: boolean;
  agent_can_book: boolean;
  auto_reminders: boolean;
}

export interface User {
  id: string;
  clinic_id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Professional {
  id: string;
  clinic_id: string;
  user_id: string | null;
  name: string;
  specialty: string | null;
  bio: string | null;
  photo_url: string | null;
  schedule: BusinessHours | null;
  exceptions: ProfessionalException[] | null;
  is_active: boolean;
  created_at: string;
}

export interface ProfessionalException {
  date: string;
  available: boolean;
  reason: string;
}

export interface Service {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  category: string | null;
  duration_minutes: number;
  price: number | null;
  is_active: boolean;
  created_at: string;
}

export interface ServiceProfessional {
  id: string;
  service_id: string;
  professional_id: string;
  custom_duration_minutes: number | null;
  custom_price: number | null;
}

export interface Patient {
  id: string;
  clinic_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  gender: string | null;
  id_number: string | null;
  tags: string[];
  notes: string | null;
  source: string | null;
  allergies: string | null;
  contraindications: string | null;
  skin_type: string | null;
  medical_notes: string | null;
  opt_out_marketing: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  professional_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  confirmation_sent: boolean;
  reminder_sent: boolean;
  notes: string | null;
  created_by: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  patient?: Patient;
  professional?: Professional;
  service?: Service;
}

export interface ClinicalRecord {
  id: string;
  clinic_id: string;
  appointment_id: string | null;
  patient_id: string;
  professional_id: string;
  record_date: string;
  chief_complaint: string | null;
  examination: string | null;
  diagnosis: string | null;
  treatment: string | null;
  recommendations: string | null;
  next_visit_notes: string | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
}

export interface PatientPhoto {
  id: string;
  patient_id: string;
  clinical_record_id: string | null;
  photo_url: string;
  photo_type: "before" | "after" | "progress" | "other";
  treatment: string | null;
  notes: string | null;
  taken_at: string;
}

export interface Conversation {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  patient_phone: string | null;
  channel: MessageChannel;
  status: ConversationStatus;
  handled_by: string;
  escalation_reason: string | null;
  summary: string | null;
  started_at: string;
  resolved_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "patient" | "agent" | "human";
  content: string;
  metadata: MessageMetadata | null;
  created_at: string;
}

export interface MessageMetadata {
  model_used?: string;
  tokens_in?: number;
  tokens_out?: number;
  tool_calls?: string[];
}

export interface Campaign {
  id: string;
  clinic_id: string;
  name: string;
  type: CampaignType;
  channel: MessageChannel;
  segment_query: Record<string, unknown> | null;
  message_template: string;
  is_automatic: boolean;
  requires_approval: boolean;
  status: "draft" | "active" | "paused" | "completed";
  schedule: Record<string, unknown> | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id: string | null;
  invoice_number: string;
  invoice_type: InvoiceType;
  subtotal: number;
  tax_amount: number;
  total: number;
  payment_method: string | null;
  status: InvoiceStatus;
  hacienda_key: string | null;
  hacienda_response: Record<string, unknown> | null;
  items: InvoiceItem[];
  created_at: string;
}

export interface InvoiceItem {
  service_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax: number;
}

export interface MetricsDaily {
  id: string;
  clinic_id: string;
  date: string;
  appointments_scheduled: number;
  appointments_completed: number;
  appointments_cancelled: number;
  no_shows: number;
  revenue: number;
  new_patients: number;
  returning_patients: number;
  agent_conversations: number;
  agent_appointments_created: number;
  agent_escalations: number;
  campaign_messages_sent: number;
  campaign_conversions: number;
}

export interface FAQ {
  id: string;
  clinic_id: string;
  question: string;
  answer: string;
  sort_order: number;
}

// ============================================================
// UI TYPES
// ============================================================

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
}
