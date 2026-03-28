"use client"

import { Button } from "@/components/ui/button"
import { MessageCircle, SkipForward, CheckCircle2 } from "lucide-react"

interface Props {
  connected: boolean
  onConnect: () => void
  onSkip: () => void
  onBack: () => void
}

export function Step6WhatsApp({ connected, onConnect, onSkip, onBack }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Conecta tu WhatsApp para que la recepcionista virtual pueda responder mensajes automaticamente.
      </p>

      {connected ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="text-center">
            <p className="font-medium">WhatsApp conectado</p>
            <p className="text-sm text-muted-foreground">Tu recepcionista ya puede responder mensajes.</p>
          </div>
          <Button onClick={onSkip} className="w-full">Siguiente →</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* QR placeholder */}
          <div className="flex flex-col items-center gap-4 p-8 bg-white border border-border rounded-xl">
            <div className="w-40 h-40 bg-muted rounded-xl flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">QR disponible despues de activar</p>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground max-w-xs">
              La conexion de WhatsApp requiere el servidor de mensajeria activo.
              Podes configurarlo despues de activar tu clinica.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button variant="outline" onClick={onSkip} className="w-full">
              <SkipForward className="w-4 h-4 mr-2" />
              Configurar WhatsApp despues
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">Anterior</Button>
      </div>
    </div>
  )
}
