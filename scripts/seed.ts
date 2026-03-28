/**
 * Seed script — Estetica Bella Vista (datos demo)
 * Uso: npm run seed
 */

import { readFileSync } from "fs"
import { join } from "path"
import { createClient } from "@supabase/supabase-js"
import { addDays, addMinutes, setHours, setMinutes, subDays, format } from "date-fns"

// ── Cargar .env.local ────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const env = readFileSync(join(process.cwd(), ".env.local"), "utf-8")
    for (const line of env.split("\n")) {
      const eqIdx = line.indexOf("=")
      if (eqIdx > 0) {
        const key = line.slice(0, eqIdx).trim()
        const val = line.slice(eqIdx + 1).trim()
        if (key && val) process.env[key] = val
      }
    }
  } catch { /* ignore */ }
}
loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── Datos demo ────────────────────────────────────────────────────────────────

const CLINIC = {
  name: "Estetica Bella Vista",
  slug: "estetica-bella-vista-demo",
  address: "Barrio Escalante, San Jose, Costa Rica",
  phone: "+50622345678",
  email: "info@bellavista.cr",
  timezone: "America/Costa_Rica",
  business_hours: {
    mon: { start: "08:00", end: "18:00", active: true },
    tue: { start: "08:00", end: "18:00", active: true },
    wed: { start: "08:00", end: "18:00", active: true },
    thu: { start: "08:00", end: "18:00", active: true },
    fri: { start: "08:00", end: "18:00", active: true },
    sat: { start: "08:00", end: "13:00", active: true },
    sun: { start: "00:00", end: "00:00", active: false },
  },
  settings: {
    agent_tone: "semi_formal",
    agent_name: "Sofia",
    currency: "CRC",
    agent_schedule_24h: false,
    agent_can_book: true,
    auto_reminders: true,
  },
  plan: "growth",
  onboarding_completed: true,
  whatsapp_connected: false,
}

const OWNER = {
  email: "demo@bellavista.cr",
  password: "Demo1234!",
  name: "Gabriel Rodriguez",
  role: "owner" as const,
}

const PROFESSIONALS = [
  {
    name: "Dra. Ana Mora",
    specialty: "Dermatologia estetica",
    bio: "Especialista en dermatologia estetica con 10 anos de experiencia.",
    schedule: {
      mon: { start: "08:00", end: "16:00", active: true },
      tue: { start: "08:00", end: "16:00", active: true },
      wed: { start: "08:00", end: "16:00", active: true },
      thu: { start: "08:00", end: "16:00", active: true },
      fri: { start: "08:00", end: "16:00", active: true },
      sat: { start: "00:00", end: "00:00", active: false },
    },
  },
  {
    name: "Dr. Pedro Vargas",
    specialty: "Odontologia estetica",
    bio: "Odontologo con especializacion en estetica dental y diseno de sonrisa.",
    schedule: {
      mon: { start: "09:00", end: "17:00", active: true },
      tue: { start: "09:00", end: "17:00", active: true },
      wed: { start: "09:00", end: "17:00", active: true },
      thu: { start: "09:00", end: "17:00", active: true },
      fri: { start: "09:00", end: "17:00", active: true },
      sat: { start: "09:00", end: "13:00", active: true },
    },
  },
  {
    name: "Lic. Sofia Ruiz",
    specialty: "Cosmetologia",
    bio: "Cosmetologa certificada especializada en tratamientos corporales y faciales.",
    schedule: {
      mon: { start: "08:00", end: "18:00", active: true },
      tue: { start: "08:00", end: "18:00", active: true },
      wed: { start: "08:00", end: "18:00", active: true },
      thu: { start: "08:00", end: "18:00", active: true },
      fri: { start: "08:00", end: "18:00", active: true },
      sat: { start: "08:00", end: "13:00", active: true },
    },
  },
]

const SERVICES = [
  // Dermatologia (profesional index 0)
  { name: "Limpieza facial profunda",    category: "facial",      duration_minutes: 60,  price: 35000,  prof: 0 },
  { name: "Peeling quimico",             category: "facial",      duration_minutes: 45,  price: 45000,  prof: 0 },
  { name: "Botox por zona",              category: "inyectables", duration_minutes: 30,  price: 85000,  prof: 0 },
  { name: "Relleno acido hialuronico",   category: "inyectables", duration_minutes: 45,  price: 120000, prof: 0 },
  { name: "Mesoterapia facial",          category: "facial",      duration_minutes: 45,  price: 55000,  prof: 0 },
  { name: "PRP facial",                  category: "facial",      duration_minutes: 60,  price: 75000,  prof: 0 },
  // Odontologia (profesional index 1)
  { name: "Limpieza dental",             category: "dental",      duration_minutes: 45,  price: 25000,  prof: 1 },
  { name: "Blanqueamiento dental",       category: "dental",      duration_minutes: 90,  price: 95000,  prof: 1 },
  { name: "Carillas por unidad",         category: "dental",      duration_minutes: 60,  price: 150000, prof: 1 },
  { name: "Diseno de sonrisa",           category: "dental",      duration_minutes: 120, price: 350000, prof: 1 },
  // Cosmetologia (profesional index 2)
  { name: "Depilacion laser piernas",    category: "laser",       duration_minutes: 60,  price: 45000,  prof: 2 },
  { name: "Depilacion laser axilas",     category: "laser",       duration_minutes: 30,  price: 25000,  prof: 2 },
  { name: "Microblading cejas",          category: "capilar",     duration_minutes: 120, price: 85000,  prof: 2 },
  { name: "Tratamiento corporal reductor", category: "corporal",  duration_minutes: 60,  price: 40000,  prof: 2 },
  { name: "Radiofrecuencia facial",      category: "facial",      duration_minutes: 45,  price: 50000,  prof: 2 },
]

const PATIENTS = [
  { name: "Maria Lopez Solano",       phone: "+50688123456", email: "maria.lopez@gmail.com",   birth_date: "1988-04-15", gender: "F", tags: ["vip"],           source: "referido" },
  { name: "Carlos Rojas Jimenez",     phone: "+50688234567", email: "carlos.rojas@gmail.com",  birth_date: "1975-09-22", gender: "M", tags: [],                source: "instagram" },
  { name: "Laura Soto Alvarado",      phone: "+50688345678", email: "laura.soto@hotmail.com",  birth_date: "1995-02-08", gender: "F", tags: ["nuevo"],         source: "whatsapp" },
  { name: "Andres Mora Castro",       phone: "+50688456789", email: null,                       birth_date: "1983-11-30", gender: "M", tags: [],                source: "walkin" },
  { name: "Gabriela Vargas Ulate",    phone: "+50688567890", email: "gaby.v@gmail.com",        birth_date: "1991-06-17", gender: "F", tags: ["vip"],           source: "referido" },
  { name: "Jorge Hernandez Blanco",   phone: "+50688678901", email: null,                       birth_date: "1969-03-05", gender: "M", tags: [],                source: "walkin" },
  { name: "Silvia Nunez Porras",      phone: "+50688789012", email: "silvia.np@gmail.com",     birth_date: "1987-08-12", gender: "F", tags: ["vip"],           source: "referido" },
  { name: "Roberto Chaves Arias",     phone: "+50688890123", email: "rchaves@yahoo.com",       birth_date: "1979-12-28", gender: "M", tags: [],                source: "web" },
  { name: "Patricia Quesada Brenes",  phone: "+50688901234", email: "paty.q@gmail.com",        birth_date: "1993-05-20", gender: "F", tags: ["nuevo"],         source: "instagram" },
  { name: "Diego Zamora Salas",       phone: "+50689012345", email: null,                       birth_date: "1996-07-14", gender: "M", tags: [],                source: "walkin" },
  { name: "Ana Cecilia Fallas",       phone: "+50689123456", email: "anacfallas@gmail.com",    birth_date: "1985-01-09", gender: "F", tags: ["vip"],           source: "referido" },
  { name: "Luis Diego Araya",         phone: "+50689234567", email: "ldiego.araya@gmail.com",  birth_date: "1990-10-03", gender: "M", tags: [],                source: "web" },
  { name: "Mariela Gutierrez Prado",  phone: "+50689345678", email: "mariela.gp@gmail.com",    birth_date: "1982-04-25", gender: "F", tags: [],                source: "instagram" },
  { name: "Fernando Benavides Cruz",  phone: "+50689456789", email: null,                       birth_date: "1977-08-18", gender: "M", tags: [],                source: "walkin" },
  { name: "Stephanie Orozco Marin",   phone: "+50689567890", email: "stepha.o@gmail.com",      birth_date: "1998-03-31", gender: "F", tags: ["nuevo"],         source: "instagram" },
  { name: "Mauricio Sanchez Vega",    phone: "+50689678901", email: "mauricio.sv@gmail.com",   birth_date: "1974-11-07", gender: "M", tags: [],                source: "referido" },
  { name: "Karina Alvarado Monge",    phone: "+50689789012", email: "karina.am@gmail.com",     birth_date: "1989-06-22", gender: "F", tags: ["vip"],           source: "referido" },
  { name: "Pablo Rojas Corrales",     phone: "+50689890123", email: null,                       birth_date: "1981-09-15", gender: "M", tags: [],                source: "walkin" },
  { name: "Viviana Castro Valverde",  phone: "+50689901234", email: "vivi.cv@gmail.com",       birth_date: "1994-02-28", gender: "F", tags: [],                source: "web" },
  { name: "German Mora Quirós",       phone: "+50685012345", email: "german.mq@gmail.com",     birth_date: "1972-07-04", gender: "M", tags: [],                source: "walkin" },
  { name: "Natalia Vindas Montoya",   phone: "+50685123456", email: "nati.vm@gmail.com",       birth_date: "1997-12-19", gender: "F", tags: ["nuevo"],         source: "instagram" },
  { name: "Alexis Picado Solano",     phone: "+50685234567", email: null,                       birth_date: "1986-05-11", gender: "M", tags: [],                source: "walkin" },
  { name: "Melissa Badilla Fonseca",  phone: "+50685345678", email: "meli.bf@gmail.com",       birth_date: "1991-10-08", gender: "F", tags: ["vip"],           source: "referido" },
  { name: "Esteban Acosta Ugalde",    phone: "+50685456789", email: "esteban.au@gmail.com",    birth_date: "1984-03-17", gender: "M", tags: [],                source: "web" },
  { name: "Fabiola Camacho Torres",   phone: "+50685567890", email: "fabi.ct@gmail.com",       birth_date: "1979-08-24", gender: "F", tags: [],                source: "instagram" },
  { name: "Randall Espinoza Mora",    phone: "+50685678901", email: null,                       birth_date: "1988-01-13", gender: "M", tags: [],                source: "walkin" },
  { name: "Daniela Ulate Campos",     phone: "+50685789012", email: "dani.uc@gmail.com",       birth_date: "1996-06-07", gender: "F", tags: ["nuevo"],         source: "whatsapp" },
  { name: "Oscar Vega Jimenez",       phone: "+50685890123", email: "oscar.vj@gmail.com",      birth_date: "1970-11-29", gender: "M", tags: [],                source: "referido" },
  { name: "Rebeca Salazar Nunez",     phone: "+50685901234", email: "rebe.sn@gmail.com",       birth_date: "1993-04-02", gender: "F", tags: ["vip"],           source: "referido" },
  { name: "Ivan Solano Brenes",       phone: "+50686012345", email: null,                       birth_date: "1976-09-16", gender: "M", tags: [],                source: "walkin" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Genera un slot de cita a partir de una fecha base y hora de inicio */
function makeAppointment(
  clinicId: string,
  patientId: string,
  professionalId: string,
  serviceId: string,
  duration: number,
  date: Date,
  hour: number,
  minute: number,
  status: string
) {
  const start = setMinutes(setHours(date, hour), minute)
  const end = addMinutes(start, duration)
  return {
    clinic_id: clinicId,
    patient_id: patientId,
    professional_id: professionalId,
    service_id: serviceId,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    status,
    created_by: "seed",
    confirmation_sent: status === "confirmed",
    reminder_sent: false,
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding Estetica Bella Vista...\n")

  // 1. Crear usuario owner en auth
  console.log("1. Creando usuario demo...")
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: OWNER.email,
    password: OWNER.password,
    email_confirm: true,
  })
  if (authErr && !authErr.message.includes("already been registered")) {
    console.error("Error creando auth user:", authErr.message)
    process.exit(1)
  }
  const authUserId = authData?.user?.id ?? (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === OWNER.email)?.id
  if (!authUserId) { console.error("No se pudo obtener auth user ID"); process.exit(1) }
  console.log("   Auth user:", authUserId)

  // 2. Crear clinica
  console.log("2. Creando clinica...")
  const { data: existingClinic } = await supabase.from("clinics").select("id").eq("slug", CLINIC.slug).single()
  let clinicId: string
  if (existingClinic) {
    clinicId = existingClinic.id
    console.log("   Ya existe, usando:", clinicId)
  } else {
    const { data: clinic, error: clinicErr } = await supabase.from("clinics").insert(CLINIC).select("id").single()
    if (clinicErr) { console.error("Error clinica:", clinicErr.message); process.exit(1) }
    clinicId = clinic!.id
    console.log("   Creada:", clinicId)
  }

  // 3. Crear usuario owner profile
  console.log("3. Creando perfil owner...")
  await supabase.from("users").upsert({
    id: authUserId,
    clinic_id: clinicId,
    name: OWNER.name,
    email: OWNER.email,
    role: OWNER.role,
  }, { onConflict: "id" })

  // 4. Crear profesionales
  console.log("4. Creando profesionales...")
  const professionalIds: string[] = []
  for (const prof of PROFESSIONALS) {
    const { data: existing } = await supabase.from("professionals").select("id").eq("clinic_id", clinicId).eq("name", prof.name).single()
    if (existing) {
      professionalIds.push(existing.id)
      console.log(`   Ya existe: ${prof.name}`)
    } else {
      const { data, error } = await supabase.from("professionals").insert({ ...prof, clinic_id: clinicId }).select("id").single()
      if (error) { console.error("Error profesional:", error.message); continue }
      professionalIds.push(data!.id)
      console.log(`   Creado: ${prof.name}`)
    }
  }

  // 5. Crear servicios
  console.log("5. Creando servicios...")
  const serviceIds: string[] = []
  for (const svc of SERVICES) {
    const { prof, ...svcData } = svc
    const { data: existing } = await supabase.from("services").select("id").eq("clinic_id", clinicId).eq("name", svcData.name).single()
    let serviceId: string
    if (existing) {
      serviceId = existing.id
    } else {
      const { data, error } = await supabase.from("services").insert({ ...svcData, clinic_id: clinicId }).select("id").single()
      if (error) { console.error("Error servicio:", error.message); serviceIds.push(""); continue }
      serviceId = data!.id
    }
    serviceIds.push(serviceId)

    // Vincular servicio con profesional
    const profId = professionalIds[svc.prof]
    if (profId) {
      await supabase.from("service_professionals").upsert(
        { service_id: serviceId, professional_id: profId },
        { onConflict: "service_id,professional_id" }
      )
    }
  }
  console.log(`   ${serviceIds.filter(Boolean).length} servicios creados`)

  // 6. Crear pacientes
  console.log("6. Creando 30 pacientes...")
  const patientIds: string[] = []
  for (const patient of PATIENTS) {
    const { data: existing } = await supabase.from("patients").select("id").eq("clinic_id", clinicId).eq("phone", patient.phone).single()
    if (existing) {
      patientIds.push(existing.id)
    } else {
      const { data, error } = await supabase.from("patients").insert({ ...patient, clinic_id: clinicId }).select("id").single()
      if (error) { console.error("Error paciente:", error.message); patientIds.push(""); continue }
      patientIds.push(data!.id)
    }
  }
  console.log(`   ${patientIds.filter(Boolean).length} pacientes creados`)

  // 7. Crear citas (2 semanas: semana pasada + esta semana)
  console.log("7. Creando citas...")
  const appointments = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Slots disponibles por profesional (hora inicio, duracion)
  const slots = [8, 9, 10, 11, 13, 14, 15, 16, 17]

  for (let dayOffset = -7; dayOffset <= 7; dayOffset++) {
    const day = addDays(today, dayOffset)
    const dayOfWeek = day.getDay() // 0=sun, 6=sat
    if (dayOfWeek === 0) continue // no sunday

    for (let profIdx = 0; profIdx < 3; profIdx++) {
      const profId = professionalIds[profIdx]
      if (!profId) continue

      // Prof 0 (Ana): no trabaja sabado
      if (profIdx === 0 && dayOfWeek === 6) continue

      const availableSlots = dayOfWeek === 6 ? [8, 9, 10, 11] : slots

      for (const hour of availableSlots) {
        // ~70% ocupacion
        if (Math.random() > 0.7) continue

        // Servicios de este profesional
        const profServiceIndices = SERVICES
          .map((s, i) => s.prof === profIdx ? i : -1)
          .filter(i => i >= 0)
        const svcIdx = randomFrom(profServiceIndices)
        const svcId = serviceIds[svcIdx]
        if (!svcId) continue

        const patientId = randomFrom(patientIds.filter(Boolean))
        if (!patientId) continue

        const duration = SERVICES[svcIdx].duration_minutes

        let status: string
        if (dayOffset < -1) {
          status = Math.random() < 0.08 ? "no_show" : "completed"
        } else if (dayOffset === -1 || dayOffset === 0) {
          status = Math.random() < 0.05 ? "no_show" : Math.random() < 0.7 ? "confirmed" : "completed"
        } else {
          status = Math.random() < 0.6 ? "confirmed" : "pending"
        }

        appointments.push(makeAppointment(clinicId, patientId, profId, svcId, duration, day, hour, 0, status))
      }
    }
  }

  // Insertar en batches de 50
  let inserted = 0
  for (let i = 0; i < appointments.length; i += 50) {
    const batch = appointments.slice(i, i + 50)
    const { error } = await supabase.from("appointments").insert(batch)
    if (error) console.error("  Error batch citas:", error.message)
    else inserted += batch.length
  }
  console.log(`   ${inserted} citas creadas`)

  // 8. FAQs demo
  console.log("8. Creando FAQs...")
  const faqs = [
    { clinic_id: clinicId, question: "Cual es la direccion?", answer: "Barrio Escalante, San Jose, Costa Rica. A 100m del Parque Francia.", sort_order: 1 },
    { clinic_id: clinicId, question: "Aceptan tarjeta?", answer: "Si, aceptamos todas las tarjetas de credito y debito, SINPE Movil y efectivo.", sort_order: 2 },
    { clinic_id: clinicId, question: "Tienen parqueo?", answer: "Contamos con parqueo privado gratuito para nuestros pacientes.", sort_order: 3 },
    { clinic_id: clinicId, question: "Cuales son los horarios?", answer: "Lunes a viernes de 8:00 a 18:00, sabados de 8:00 a 13:00.", sort_order: 4 },
    { clinic_id: clinicId, question: "Necesito cita previa?", answer: "Si, todas las consultas y tratamientos son con cita previa. Puedes agendar por WhatsApp o llamando.", sort_order: 5 },
  ]
  await supabase.from("faqs").upsert(faqs, { onConflict: "id" })

  console.log("\nSeed completado!")
  console.log("==========================================")
  console.log("Clinica:     Estetica Bella Vista")
  console.log("Login demo:  demo@bellavista.cr")
  console.log("Password:    Demo1234!")
  console.log("==========================================")
}

seed().catch(console.error)
