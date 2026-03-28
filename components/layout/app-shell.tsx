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
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 w-60 bg-white border-r border-border flex flex-col transition-transform duration-200 ease-out",
          "lg:translate-x-0 lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo / Clinic name */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="font-semibold text-sm text-foreground truncate">{clinicName}</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
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
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
                {active && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <Avatar className="w-7 h-7 shrink-0">
              {user.avatar_url && <AvatarImage src={user.avatar_url} />}
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user.name}</p>
              <p className="text-[11px] text-muted-foreground capitalize truncate">{user.role}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                title="Cerrar sesion"
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        {/* Header */}
        <header className="sticky top-0 z-30 h-14 bg-white/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
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
    <h1 className="text-sm font-semibold text-foreground">
      {titles[base] ?? "Dashboard"}
    </h1>
  )
}
