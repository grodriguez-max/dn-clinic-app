import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "DN Clínicas — Digital Nomads",
  description: "Sistema de gestión completo para clínicas estéticas, dentales y de belleza",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
