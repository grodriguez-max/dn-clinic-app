"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

export function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">DN</span>
            </div>
            <span className="font-semibold text-gray-900 hidden sm:block">DN Clínicas</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#solucion" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
              Producto
            </Link>
            <Link href="/precios" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
              Precios
            </Link>
            <Link href="/demo" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
              Demo
            </Link>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="text-sm bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              Empezar gratis
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            onClick={() => setOpen(!open)}
            aria-label="Menú"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-b border-gray-100 px-4 pb-4">
          <nav className="flex flex-col gap-1 mb-4">
            <Link
              href="/#solucion"
              onClick={() => setOpen(false)}
              className="py-2 text-sm text-gray-700 hover:text-teal-600"
            >
              Producto
            </Link>
            <Link
              href="/precios"
              onClick={() => setOpen(false)}
              className="py-2 text-sm text-gray-700 hover:text-teal-600"
            >
              Precios
            </Link>
            <Link
              href="/demo"
              onClick={() => setOpen(false)}
              className="py-2 text-sm text-gray-700 hover:text-teal-600"
            >
              Demo
            </Link>
          </nav>
          <div className="flex flex-col gap-2">
            <Link
              href="/login"
              className="text-center py-2 text-sm border border-gray-200 rounded-lg text-gray-700"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="text-center py-2 text-sm bg-teal-600 text-white rounded-lg font-medium"
            >
              Empezar gratis — 14 días
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
