"use client"

import { useTransition } from "react"
import Link from "next/link"
import { login } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Iniciar sesion</CardTitle>
        <CardDescription>Ingresa con tu email y contrasena</CardDescription>
      </CardHeader>

      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contrasena</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Olvide mi contrasena
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={isPending}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ingresando..." : "Iniciar sesion"}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            No tenes cuenta?{" "}
            <Link href="/registro" className="text-primary font-medium hover:underline">
              Crea una gratis
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
