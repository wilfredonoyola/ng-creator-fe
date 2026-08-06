import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { RegistrarSW } from "@/components/RegistrarSW";

export const metadata: Metadata = {
  title: "NG Creator Studio",
  description: "Crear, revisar y reciclar el contenido de tus fan pages",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "NG Creator",
    // La barra de estado transparente deja que el fondo oscuro de la app llegue
    // hasta arriba en iOS, en vez de cortarse con una franja blanca.
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  // `viewportFit: cover` es lo que permite pintar bajo el notch; el padding
  // seguro lo pone el layout con env(safe-area-inset-*).
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  // Sin tope de zoom: limitarlo rompe la accesibilidad para quien necesita
  // agrandar, y el layout ya aguanta el pellizco.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
        <RegistrarSW />
      </body>
    </html>
  );
}
