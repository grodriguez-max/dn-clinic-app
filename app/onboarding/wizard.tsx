"use client"

import { useState } from "react"
import type { WizardData } from "./types"
import { DEFAULT_BUSINESS_HOURS } from "./types"
import {
  saveClinicData,
  saveProfessionals,
  saveServices,
  saveAgentConfig,
  completeOnboarding,
} from "./actions"

import { Step1Welcome } from "./steps/step-1-welcome"
import { Step2Clinic } from "./steps/step-2-clinic"
import { Step3Team } from "./steps/step-3-team"
import { Step4Services } from "./steps/step-4-services"
import { Step5Patients } from "./steps/step-5-patients"
import { Step6WhatsApp } from "./steps/step-6-whatsapp"
import { Step7Agent } from "./steps/step-7-agent"
import { Step8Summary } from "./steps/step-8-summary"

const STEP_TITLES = [
  "Bienvenido",
  "Tu clínica",
  "Tu equipo",
  "Servicios",
  "Pacientes",
  "WhatsApp",
  "Recepcionista IA",
  "Resumen",
]

interface Props {
  clinicId: string
  initialClinicName: string
}

export function OnboardingWizard({ clinicId, initialClinicName }: Props) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [data, setData] = useState<WizardData>({
    clinicName: initialClinicName,
    address: "",
    phone: "",
    email: "",
    timezone: "America/Costa_Rica",
    businessHours: DEFAULT_BUSINESS_HOURS,
    professionals: [],
    services: [],
    agentName: "",
    agentTone: "semi_formal",
    welcomeMessage: "",
    faqs: [],
    agentCanBook: true,
    autoReminders: true,
  })

  function next() {
    setStep((s) => Math.min(s + 1, 8))
  }

  function back() {
    setStep((s) => Math.max(s - 1, 1))
  }

  // Step 2 → save clinic data then advance
  async function handleStep2(
    clinicData: Pick<WizardData, "clinicName" | "address" | "phone" | "email" | "timezone" | "businessHours">
  ) {
    setLoading(true)
    try {
      await saveClinicData(clinicId, clinicData)
      setData((d) => ({ ...d, ...clinicData }))
      next()
    } finally {
      setLoading(false)
    }
  }

  // Step 3 → save professionals, attach savedIds, then advance
  async function handleStep3(professionals: WizardData["professionals"]) {
    setLoading(true)
    try {
      const result = await saveProfessionals(clinicId, professionals)
      if ("error" in result) return // stay on step if error

      const savedIds: string[] = result.savedIds ?? []
      const profsWithSavedIds = professionals.map((p, i) => ({
        ...p,
        savedId: savedIds[i] ?? undefined,
      }))
      setData((d) => ({ ...d, professionals: profsWithSavedIds }))
      next()
    } finally {
      setLoading(false)
    }
  }

  // Step 4 → save services (professionals in state already have savedIds)
  async function handleStep4(services: WizardData["services"]) {
    setLoading(true)
    try {
      await saveServices(clinicId, services, data.professionals)
      setData((d) => ({ ...d, services }))
      next()
    } finally {
      setLoading(false)
    }
  }

  // Step 7 → save agent config then advance
  async function handleStep7(
    agentData: Pick<WizardData, "agentName" | "agentTone" | "welcomeMessage" | "faqs" | "agentCanBook" | "autoReminders">
  ) {
    setLoading(true)
    try {
      await saveAgentConfig(clinicId, agentData, agentData.faqs)
      setData((d) => ({ ...d, ...agentData }))
      next()
    } finally {
      setLoading(false)
    }
  }

  // Step 8 → activate clinic (redirects to /dashboard)
  async function handleActivate() {
    setLoading(true)
    await completeOnboarding(clinicId)
    // completeOnboarding does redirect(), so we never reach here
  }

  const totalSteps = 8
  const progress = ((step - 1) / (totalSteps - 1)) * 100

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-slate-50 to-teal-50/30 pt-8 pb-16 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        {step > 1 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Paso {step - 1} de {totalSteps - 1}
              </span>
              <span className="text-xs font-medium text-primary">
                {STEP_TITLES[step - 1]}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm border border-white shadow-xl shadow-black/5 rounded-2xl p-6">
          {step > 1 && (
            <h2 className="text-base font-semibold mb-4">{STEP_TITLES[step - 1]}</h2>
          )}

          {step === 1 && (
            <Step1Welcome clinicName={data.clinicName} onNext={next} />
          )}

          {step === 2 && (
            <Step2Clinic
              data={{
                clinicName: data.clinicName,
                address: data.address,
                phone: data.phone,
                email: data.email,
                timezone: data.timezone,
                businessHours: data.businessHours,
              }}
              onNext={handleStep2}
              onBack={back}
              loading={loading}
            />
          )}

          {step === 3 && (
            <Step3Team
              professionals={data.professionals}
              onNext={handleStep3}
              onBack={back}
              loading={loading}
            />
          )}

          {step === 4 && (
            <Step4Services
              services={data.services}
              professionals={data.professionals}
              onNext={handleStep4}
              onBack={back}
              loading={loading}
            />
          )}

          {step === 5 && (
            <Step5Patients
              onNext={next}
              onBack={back}
            />
          )}

          {step === 6 && (
            <Step6WhatsApp
              connected={false}
              onConnect={() => {}}
              onSkip={next}
              onBack={back}
            />
          )}

          {step === 7 && (
            <Step7Agent
              data={{
                agentName: data.agentName,
                agentTone: data.agentTone,
                welcomeMessage: data.welcomeMessage,
                faqs: data.faqs,
                agentCanBook: data.agentCanBook,
                autoReminders: data.autoReminders,
              }}
              clinicName={data.clinicName}
              onNext={handleStep7}
              onBack={back}
              loading={loading}
            />
          )}

          {step === 8 && (
            <Step8Summary
              data={data}
              onActivate={handleActivate}
              onBack={back}
              loading={loading}
            />
          )}
        </div>

        {/* Branding */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          DN Clínicas · Configuración segura
        </p>
      </div>
    </div>
  )
}
