import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://app.tuclinica.com"
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/precios", "/demo", "/registro"],
        disallow: ["/dashboard", "/agenda", "/pacientes", "/equipo", "/servicios", "/api/", "/admin"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
