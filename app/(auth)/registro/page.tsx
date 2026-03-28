"use client"

import { useTransition, useState } from "react"
import Link from "next/link"
import { register } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegistroPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await register(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Crear cuenta</CardTitle>
        <CardDescription>
          Configura tu clinica en menos de 15 minutos
        </CardDescription>
      </CardHeader>

      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="clinic_name">Nombre de tu clinica</Label>
            <Input
              id="clinic_name"
              name="clinic_name"
              placeholder="Ej: Estetica Bella Vista"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Tu nombre</Label>
            <Input
              id="name"
              name="name"
              placeholder="Dra. Ana Mora"
              required
              autoComplete="name"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@clinica.com"
              required
              autoComplete="email"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contrasena</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Minimo 8 caracteres"
              required
              autoComplete="new-password"
              disabled={isPending}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creando tu clinica..." : "Crear cuenta gratis"}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Ya tenes cuenta?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Inicia sesion
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
