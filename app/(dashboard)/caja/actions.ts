"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function openCashRegister(clinicId: string, openingBalance: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const service = createServiceClient()
  // Check no open register already
  const { data: existing } = await service
    .from("cash_register")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("status", "open")
    .maybeSingle()
  if (existing) return { error: "Ya hay una caja abierta" }

  const { data, error } = await service
    .from("cash_register")
    .insert({
      clinic_id: clinicId,
      opening_balance: openingBalance,
      status: "open",
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath("/caja")
  return { ok: true, id: data.id }
}

export async function closeCashRegister(
  registerId: string,
  closingBalance: number,
  notes?: string
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const service = createServiceClient()

  // Calculate expected balance: opening + income - expense
  const { data: register } = await service
    .from("cash_register")
    .select("opening_balance")
    .eq("id", registerId)
    .single()

  const { data: movements } = await service
    .from("cash_movements")
    .select("type, amount, payment_method")
    .eq("register_id", registerId)

  const cashIncome = (movements ?? [])
    .filter((m) => m.type === "income" && m.payment_method === "cash")
    .reduce((s, m) => s + Number(m.amount), 0)
  const cashExpense = (movements ?? [])
    .filter((m) => m.type === "expense" && m.payment_method === "cash")
    .reduce((s, m) => s + Number(m.amount), 0)

  const expectedBalance = Number(register?.opening_balance ?? 0) + cashIncome - cashExpense
  const difference = closingBalance - expectedBalance

  const { error } = await service
    .from("cash_register")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
      closing_balance: closingBalance,
      expected_balance: expectedBalance,
      difference,
      closed_by: user.id,
      notes: notes || null,
    })
    .eq("id", registerId)

  if (error) return { error: error.message }
  revalidatePath("/caja")
  revalidatePath("/metricas")
  return { ok: true, expectedBalance, difference }
}

export async function addCashMovement(
  clinicId: string,
  registerId: string,
  input: {
    type: "income" | "expense" | "adjustment"
    category: string
    amount: number
    payment_method: "cash" | "card" | "sinpe" | "transfer" | "online"
    description?: string
    appointment_id?: string
    invoice_id?: string
  }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const service = createServiceClient()
  const { data, error } = await service
    .from("cash_movements")
    .insert({
      clinic_id: clinicId,
      register_id: registerId,
      ...input,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath("/caja")
  return { ok: true, id: data.id }
}

export async function getCurrentRegister(clinicId: string) {
  const service = createServiceClient()
  const { data } = await service
    .from("cash_register")
    .select("id, opened_at, opening_balance, status")
    .eq("clinic_id", clinicId)
    .eq("status", "open")
    .maybeSingle()
  return data
}

export async function getRegisterMovements(registerId: string) {
  const service = createServiceClient()
  const { data } = await service
    .from("cash_movements")
    .select("id, type, category, amount, payment_method, description, created_at, appointment_id, invoice_id")
    .eq("register_id", registerId)
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function getRegisterHistory(clinicId: string) {
  const service = createServiceClient()
  const { data } = await service
    .from("cash_register")
    .select("id, opened_at, closed_at, opening_balance, closing_balance, expected_balance, difference, status, notes")
    .eq("clinic_id", clinicId)
    .eq("status", "closed")
    .order("closed_at", { ascending: false })
    .limit(30)
  return data ?? []
}
