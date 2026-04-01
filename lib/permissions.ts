/**
 * Role-based permissions for DN Clínicas
 *
 * Roles:
 *   owner        — Master. Acceso total.
 *   admin        — Administración. Acceso operativo, sin billing, sin eliminar, sin docs privados.
 *   receptionist — Solo agenda y pacientes básicos.
 *   professional — Solo su propia agenda y sus pacientes.
 */

export type UserRole = "owner" | "admin" | "receptionist" | "professional"

/** Returns true if the role is allowed to do the action. */
export function can(role: UserRole | string, action: Permission): boolean {
  const r = role as UserRole
  return PERMISSIONS[action]?.includes(r) ?? false
}

export type Permission =
  // Billing & platform costs
  | "view_billing"
  | "change_plan"
  // Financial metrics
  | "view_financial_metrics"
  // Patients
  | "delete_patient"
  | "view_patient_full"   // full history, notes, docs
  // Services
  | "delete_service"
  | "create_service"
  | "edit_service"
  // Professionals
  | "delete_professional"
  | "view_professional_docs"  // curriculum, certificates (private)
  | "create_professional"
  // Appointments
  | "create_appointment"
  | "edit_appointment"
  | "cancel_appointment"
  // Configuration
  | "edit_clinic_settings"
  | "edit_agent_settings"
  // Users
  | "manage_users"
  // Marketing
  | "view_marketing"
  | "approve_campaigns"

const PERMISSIONS: Record<Permission, UserRole[]> = {
  // Billing — owner only
  view_billing:           ["owner"],
  change_plan:            ["owner"],
  view_financial_metrics: ["owner"],

  // Patients
  delete_patient:   ["owner"],
  view_patient_full: ["owner", "admin"],

  // Services
  delete_service:   ["owner"],
  create_service:   ["owner", "admin"],
  edit_service:     ["owner", "admin"],

  // Professionals
  delete_professional:      ["owner"],
  view_professional_docs:   ["owner"],
  create_professional:      ["owner", "admin"],

  // Appointments — all operational roles
  create_appointment: ["owner", "admin", "receptionist"],
  edit_appointment:   ["owner", "admin", "receptionist"],
  cancel_appointment: ["owner", "admin", "receptionist"],

  // Config — only owner
  edit_clinic_settings: ["owner"],
  edit_agent_settings:  ["owner"],
  manage_users:         ["owner"],

  // Marketing — owner and admin can view and approve
  view_marketing:    ["owner", "admin"],
  approve_campaigns: ["owner", "admin"],
}

/** Filtered nav items based on role */
export function allowedNavItems(role: UserRole | string) {
  const isOwner = role === "owner"
  return {
    showBilling:    isOwner,
    showFacturacion: isOwner || role === "admin",
    showMarketing:  isOwner || role === "admin",
    showSettings:   true, // visible to all, but content is filtered inside
    showMetrics:    true,
  }
}
