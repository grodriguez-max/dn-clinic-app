"use client"

import { useTransition, useState } from "react"
import Link from "next/link"
import { forgotPassword } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await forgotPassword(formData)
      if (result?.error) setError(result.error)
      if (result?.success) setSuccess(result.success)
    })
  }

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Recuperar contrasena</CardTitle>
        <CardDescription>
          Te enviamos un link para que puedas crear una nueva contrasena
        </CardDescription>
      </CardHeader>

      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email de tu cuenta</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@clinica.com"
              required
              autoComplete="email"
              disabled={isPending || !!success}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending || !!success}>
            {isPending ? "Enviando..." : "Enviar link de recuperacion"}
          </Button>
          <Link
            href="/login"
            className="text-sm text-center text-muted-foreground hover:text-primary transition-colors"
          >
            Volver al inicio de sesion
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}
