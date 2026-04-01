import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const clinicId = searchParams.get("clinicId")
  if (!clinicId) return NextResponse.json({ error: "Missing clinicId" }, { status: 400 })

  const supabase = createServiceClient()
  const { data: clinic } = await supabase.from("clinics").select("settings").eq("id", clinicId).single()
  const settings = (clinic?.settings ?? {}) as Record<string, unknown>
  const placeId = settings.google_place_id as string | undefined

  if (!placeId) return NextResponse.json({ error: "No Place ID configured" }, { status: 404 })

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Google Places API not configured" }, { status: 500 })

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews&key=${apiKey}&language=es`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    if (data.status !== "OK") return NextResponse.json({ error: data.status }, { status: 400 })

    return NextResponse.json({
      name: data.result.name,
      rating: data.result.rating,
      total: data.result.user_ratings_total,
      reviews: (data.result.reviews ?? []).slice(0, 5),
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}
