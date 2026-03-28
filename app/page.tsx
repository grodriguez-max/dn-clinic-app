import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LandingNav } from "@/components/landing/nav"
import { LandingFooter } from "@/components/landing/footer"
import { Hero } from "@/components/landing/hero"
import { Problem } from "@/components/landing/problem"
import { Solution } from "@/components/landing/solution"
import { Stats } from "@/components/landing/stats"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Features } from "@/components/landing/features"
import { Pricing } from "@/components/landing/pricing"
import { Testimonials } from "@/components/landing/testimonials"
import { FAQ } from "@/components/landing/faq"
import { CTAFinal } from "@/components/landing/cta"

export const metadata: Metadata = {
  title: "DN Clínicas — Tu clínica funcionando sola con IA",
  description:
    "Recepcionista virtual 24/7 por WhatsApp, marketing automatizado, agenda, CRM y factura electrónica CR. 14 días gratis. Sin tarjeta.",
  keywords: ["clínica estética", "gestión de citas", "recepcionista virtual", "WhatsApp IA", "Costa Rica", "factura electrónica"],
  openGraph: {
    title: "DN Clínicas — Tu clínica funcionando sola con IA",
    description:
      "Recepcionista virtual 24/7, marketing automatizado, agenda y factura electrónica CR.",
    type: "website",
    locale: "es_CR",
    siteName: "DN Clínicas",
  },
  twitter: {
    card: "summary_large_image",
    title: "DN Clínicas — Tu clínica funcionando sola con IA",
    description: "Recepcionista virtual 24/7, marketing automatizado, agenda y factura electrónica CR.",
  },
}

export default async function LandingPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="bg-white min-h-screen">
      <LandingNav />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Stats />
        <HowItWorks />
        <Features />
        <Pricing />
        <Testimonials />
        <FAQ />
        <CTAFinal />
      </main>
      <LandingFooter />
    </div>
  )
}
