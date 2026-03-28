import type { WizardService } from "./types"

let counter = 0
function tid() { return `tpl-${++counter}` }

export const SERVICE_TEMPLATES: Record<string, Omit<WizardService, "professionalTempIds">[]> = {
  dermatologia: [
    { tempId: tid(), name: "Limpieza facial profunda",  category: "facial",      duration_minutes: 60,  price: 35000,  selected: true },
    { tempId: tid(), name: "Peeling quimico",           category: "facial",      duration_minutes: 45,  price: 45000,  selected: true },
    { tempId: tid(), name: "Microdermoabrasion",        category: "facial",      duration_minutes: 45,  price: 40000,  selected: false },
    { tempId: tid(), name: "Tratamiento anti-acne",     category: "facial",      duration_minutes: 60,  price: 45000,  selected: false },
    { tempId: tid(), name: "Botox por zona",            category: "inyectables", duration_minutes: 30,  price: 85000,  selected: true },
    { tempId: tid(), name: "Relleno acido hialuronico", category: "inyectables", duration_minutes: 45,  price: 120000, selected: true },
    { tempId: tid(), name: "Mesoterapia facial",        category: "facial",      duration_minutes: 45,  price: 55000,  selected: false },
    { tempId: tid(), name: "PRP facial",                category: "facial",      duration_minutes: 60,  price: 75000,  selected: false },
  ],
  odontologia: [
    { tempId: tid(), name: "Limpieza dental",           category: "dental",      duration_minutes: 45,  price: 25000,  selected: true },
    { tempId: tid(), name: "Blanqueamiento dental",     category: "dental",      duration_minutes: 90,  price: 95000,  selected: true },
    { tempId: tid(), name: "Carillas por unidad",       category: "dental",      duration_minutes: 60,  price: 150000, selected: false },
    { tempId: tid(), name: "Ortodoncia consulta",       category: "dental",      duration_minutes: 45,  price: 35000,  selected: false },
    { tempId: tid(), name: "Diseno de sonrisa",         category: "dental",      duration_minutes: 120, price: 350000, selected: false },
    { tempId: tid(), name: "Implantes consulta",        category: "dental",      duration_minutes: 60,  price: 50000,  selected: false },
  ],
  cosmetologia: [
    { tempId: tid(), name: "Depilacion laser piernas",  category: "laser",       duration_minutes: 60,  price: 45000,  selected: true },
    { tempId: tid(), name: "Depilacion laser axilas",   category: "laser",       duration_minutes: 30,  price: 25000,  selected: true },
    { tempId: tid(), name: "Microblading cejas",        category: "capilar",     duration_minutes: 120, price: 85000,  selected: false },
    { tempId: tid(), name: "Micropigmentacion",         category: "capilar",     duration_minutes: 120, price: 95000,  selected: false },
    { tempId: tid(), name: "Tratamiento corporal reductor", category: "corporal", duration_minutes: 60, price: 40000,  selected: false },
    { tempId: tid(), name: "Drenaje linfatico",         category: "corporal",    duration_minutes: 60,  price: 35000,  selected: false },
    { tempId: tid(), name: "Radiofrecuencia facial",    category: "facial",      duration_minutes: 45,  price: 50000,  selected: false },
  ],
  cirugia_plastica: [
    { tempId: tid(), name: "Consulta de valoracion",    category: "consulta",    duration_minutes: 60,  price: 50000,  selected: true },
    { tempId: tid(), name: "Control post-operatorio",   category: "consulta",    duration_minutes: 30,  price: 25000,  selected: true },
    { tempId: tid(), name: "Retiro de puntos",          category: "consulta",    duration_minutes: 20,  price: 15000,  selected: true },
  ],
}

export function getTemplatesForSpecialties(specialties: string[]): Omit<WizardService, "professionalTempIds">[] {
  const seen = new Set<string>()
  const result: Omit<WizardService, "professionalTempIds">[] = []
  for (const sp of specialties) {
    const templates = SERVICE_TEMPLATES[sp] ?? []
    for (const t of templates) {
      if (!seen.has(t.name)) {
        seen.add(t.name)
        result.push({ ...t, tempId: `tpl-${sp}-${t.tempId}` })
      }
    }
  }
  return result
}
