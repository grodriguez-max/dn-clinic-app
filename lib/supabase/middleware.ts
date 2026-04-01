import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  // Refresh session — do not write logic between createServerClient and getUser()
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes
  const protectedPaths = ["/dashboard", "/agenda", "/pacientes", "/equipo", "/servicios", "/marketing", "/facturacion", "/configuracion", "/billing", "/metricas", "/agente"]
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // /admin — only accessible with admin role (checked in page, not middleware to keep it fast)
  // Subscription enforcement is handled at the page/API level to avoid DB calls in every middleware

  // Redirect logged-in users away from auth pages
  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/registro")) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
