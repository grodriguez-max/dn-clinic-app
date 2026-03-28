import { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://app.tuclinica.com"

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/precios`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/demo`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/registro`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.7 },
  ]
}
