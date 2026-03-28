"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Calendar, Users, UserCheck, Scissors,
  Bot, Megaphone, Receipt, Settings, Menu, X, LogOut, ChevronRight, BarChart3, CreditCard,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { logout } from "@/app/(auth)/actions"
import { getInitials } from "@/lib/utils"

const navItems = [
  { label: "Dashboard",    href: "/dashboard",     icon: LayoutDashboard },
  { label: "Agenda",       href: "/agenda",         icon: Calendar },
  { label: "Pacientes",    href: "/pacientes",      icon: Users },
  { label: "Equipo",       href: "/equipo",         icon: UserCheck },
  { label: "Servicios",    href: "/servicios",      icon: Scissors },
  { label: "Agente IA",    href: "/agente",         icon: Bot },
  { label: "Métricas",     href: "/metricas",       icon: BarChart3 },
  { label: "Marketing",    href: "/marketing",      icon: Megaphone },
  { label: "Facturacion",  href: "/facturacion",    icon: Receipt },
  { label: "Suscripción",  href: "/billing",        icon: CreditCard },
  { label: "Configuracion",href: "/configuracion",  icon: Settings },
]

interface AppShellProps {
  children: React.ReactNode
  user: { name: string; email: string; role: string; avatar_url?: string | null }
  clinicName: string
}

export function AppShell({ children, user, clinicName }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — dark premium */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 w-60 flex flex-col transition-transform duration-200 ease-out",
          "bg-slate-950",
          "lg:translate-x-0 lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo / Clinic name */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-white/[0.06]">
          <div className="w-7 h-7 rounded-lg gradient-teal flex items-center justify-center shrink-0 shadow-lg shadow-teal-900/40">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="font-semibold text-sm text-white truncate">{clinicName}</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-teal-500/15 text-teal-400"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                )}
              >
                <item.icon className={cn(
                  "w-4 h-4 shrink-0 transition-transform duration-150",
                  "group-hover:scale-110",
                  active ? "text-teal-400" : ""
                )} />
                {item.label}
                {active && (
                  <ChevronRight className="w-3 h-3 ml-auto text-teal-500/60" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors group">
            <Avatar className="w-7 h-7 shrink-0 ring-1 ring-white/10">
              {user.avatar_url && <AvatarImage src={user.avatar_url} />}
              <AvatarFallback className="text-xs bg-teal-500/20 text-teal-400 font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user.name}</p>
              <p className="text-[11px] text-slate-500 capitalize truncate">{user.role}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                title="Cerrar sesion"
                className="text-slate-600 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        {/* Header — glassmorphism */}
        <header className="sticky top-0 z-30 h-14 glass-surface flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <PageTitle pathname={pathname} />
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

function PageTitle({ pathname }: { pathname: string }) {
  const titles: Record<string, string> = {
    "/dashboard":     "Dashboard",
    "/agenda":        "Agenda",
    "/pacientes":     "Pacientes",
    "/equipo":        "Equipo",
    "/servicios":     "Servicios",
    "/agente":        "Agente IA",
    "/metricas":      "Métricas",
    "/marketing":     "Marketing",
    "/facturacion":   "Facturación",
    "/billing":       "Suscripción",
    "/configuracion": "Configuración",
  }
  const base = "/" + pathname.split("/")[1]
  return (
    <h1 className="text-sm font-semibold text-foreground tracking-tight">
      {titles[base] ?? "Dashboard"}
    </h1>
  )
}
