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
      `https://places.googleapis.com/v1/places/${placeId}?languageCode=es`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "displayName,rating,userRatingCount,reviews",
        },
        next: { revalidate: 3600 },
      }
    )
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.error?.message ?? "Places API error" }, { status: 400 })

    return NextResponse.json({
      name: data.displayName?.text,
      rating: data.rating,
      total: data.userRatingCount,
      reviews: (data.reviews ?? []).slice(0, 5).map((r: Record<string, unknown>) => ({
        author_name: (r.authorAttribution as Record<string, unknown>)?.displayName,
        profile_photo_url: (r.authorAttribution as Record<string, unknown>)?.photoUri,
        rating: r.rating,
        text: (r.text as Record<string, unknown>)?.text,
        time: r.publishTime,
      })),
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}
