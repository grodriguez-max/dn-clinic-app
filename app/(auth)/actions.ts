"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/utils"

export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Completá todos los campos." }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Email o contrasena incorrectos." }
    }
    return { error: "Error al iniciar sesion. Intenta de nuevo." }
  }

  redirect("/dashboard")
}

export async function register(formData: FormData) {
  const name = (formData.get("name") as string)?.trim()
  const email = (formData.get("email") as string)?.trim()
  const password = formData.get("password") as string
  const clinicName = (formData.get("clinic_name") as string)?.trim()

  if (!name || !email || !password || !clinicName) {
    return { error: "Completá todos los campos." }
  }

  if (password.length < 8) {
    return { error: "La contrasena debe tener al menos 8 caracteres." }
  }

  const supabase = createClient()
  const serviceClient = createServiceClient()

  // 1. Crear usuario en auth.users
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback` },
  })

  if (authError) {
    if (authError.message.includes("already registered")) {
      return { error: "Este email ya tiene una cuenta. Ingresa con tu contrasena." }
    }
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: "Error al crear la cuenta. Intenta de nuevo." }
  }

  // 2. Crear la clinica (service role bypasa RLS)
  const slug = slugify(clinicName)
  const { data: clinic, error: clinicError } = await serviceClient
    .from("clinics")
    .insert({
      name: clinicName,
      slug: `${slug}-${authData.user.id.slice(0, 8)}`,
      timezone: "America/Costa_Rica",
      onboarding_completed: false,
    })
    .select("id")
    .single()

  if (clinicError) {
    return { error: "Error al crear la clinica. Intenta de nuevo." }
  }

  // 3. Crear el perfil del usuario con rol owner
  const { error: userError } = await serviceClient.from("users").insert({
    id: authData.user.id,
    clinic_id: clinic.id,
    name,
    email,
    role: "owner",
  })

  if (userError) {
    return { error: "Error al configurar tu cuenta. Contacta soporte." }
  }

  redirect("/onboarding")
}

export async function forgotPassword(formData: FormData) {
  const email = (formData.get("email") as string)?.trim()

  if (!email) {
    return { error: "Ingresa tu email." }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { error: "Error al enviar el email. Intenta de nuevo." }
  }

  return { success: "Te enviamos un link para resetear tu contrasena. Revisa tu email." }
}

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
