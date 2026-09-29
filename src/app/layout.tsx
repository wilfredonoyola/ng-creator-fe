import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { RegistrarSW } from "@/components/RegistrarSW";

export const metadata: Metadata = {
  title: "NG Creator",
  description: "Create. Share. Grow. — Los clips de tus episodios, listos para publicar.",
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

/** La letra de la marca. Servida por next/font: sin pedidos a Google en el navegador. */
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const viewport: Viewport = {
  themeColor: "#0B0F1A",
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
    <html lang="es" className={inter.variable}>
      <body className="font-sans">
        <Providers>{children}</Providers>
        <RegistrarSW />
      </body>
    </html>
  );
}
