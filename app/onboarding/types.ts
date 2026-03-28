export interface BusinessHours {
  mon: DaySchedule
  tue: DaySchedule
  wed: DaySchedule
  thu: DaySchedule
  fri: DaySchedule
  sat: DaySchedule
  sun: DaySchedule
}

export interface DaySchedule {
  start: string
  end: string
  active: boolean
}

export interface WizardProfessional {
  tempId: string
  savedId?: string
  name: string
  specialty: string
  email: string
  schedule: BusinessHours
}

export interface WizardService {
  tempId: string
  savedId?: string
  name: string
  category: string
  duration_minutes: number
  price: number
  professionalTempIds: string[]
  selected: boolean
}

export interface WizardFAQ {
  question: string
  answer: string
}

export interface WizardData {
  clinicName: string
  address: string
  phone: string
  email: string
  timezone: string
  businessHours: BusinessHours
  professionals: WizardProfessional[]
  services: WizardService[]
  agentName: string
  agentTone: "formal" | "semi_formal" | "informal"
  welcomeMessage: string
  faqs: WizardFAQ[]
  agentCanBook: boolean
  autoReminders: boolean
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  mon: { start: "08:00", end: "18:00", active: true },
  tue: { start: "08:00", end: "18:00", active: true },
  wed: { start: "08:00", end: "18:00", active: true },
  thu: { start: "08:00", end: "18:00", active: true },
  fri: { start: "08:00", end: "18:00", active: true },
  sat: { start: "08:00", end: "13:00", active: true },
  sun: { start: "08:00", end: "18:00", active: false },
}

export const DAY_LABELS: Record<string, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miercoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sabado",
  sun: "Domingo",
}

export const SPECIALTY_OPTIONS = [
  { value: "dermatologia", label: "Dermatologia estetica" },
  { value: "odontologia", label: "Odontologia estetica" },
  { value: "cosmetologia", label: "Cosmetologia" },
  { value: "cirugia_plastica", label: "Cirugia plastica" },
  { value: "nutricion", label: "Nutricion" },
  { value: "psicologia", label: "Psicologia" },
  { value: "otro", label: "Otro" },
]
