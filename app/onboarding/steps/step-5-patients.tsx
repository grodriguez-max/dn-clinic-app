"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, SkipForward } from "lucide-react"

interface Props {
  onNext: () => void
  onBack: () => void
}

export function Step5Patients({ onNext, onBack }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Si tenes una lista de pacientes, podes importarla ahora. Es opcional — podes agregarlos manualmente despues.
      </p>

      <div className="grid grid-cols-1 gap-3">
        {/* Upload option */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-4 p-5 bg-white border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Subir Excel o CSV</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Columnas: nombre, telefono, email (opcional)
            </p>
          </div>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={() => {
            // CSV parsing is handled in Fase 2 step 7
            // For now, just advance
            onNext()
          }}
        />

        {/* Skip option */}
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-4 p-5 bg-white border border-border rounded-xl hover:bg-muted/30 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <SkipForward className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Prefiero agregarlos manualmente despues</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Podes importar pacientes en cualquier momento desde el menu
            </p>
          </div>
        </button>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">Anterior</Button>
      </div>
    </div>
  )
}
