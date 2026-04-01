import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CajaClient } from "./caja-client"
import { getCurrentRegister, getRegisterMovements, getRegisterHistory } from "./actions"

export default async function CajaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("clinic_id, role").eq("id", user.id).single()
  if (!profile?.clinic_id) redirect("/login")

  const clinicId = profile.clinic_id

  const [register, history] = await Promise.all([
    getCurrentRegister(clinicId),
    getRegisterHistory(clinicId),
  ])

  const movements = register ? await getRegisterMovements(register.id) : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Caja</h1>
        <p className="text-sm text-muted-foreground mt-1">Control de ingresos y egresos del día con cierre de caja</p>
      </div>
      <CajaClient
        clinicId={clinicId}
        currentRegister={register as any}
        initialMovements={movements as any[]}
        history={history as any[]}
      />
    </div>
  )
}
