import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";
import { Providers } from "./providers";
import { RegistrarSW } from "@/components/RegistrarSW";
import { URL_SITIO } from "@/lib/sitio";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  const locale = await getLocale();
  return {
    metadataBase: new URL(URL_SITIO),
    title: { default: t("titulo"), template: t("plantillaTitulo") },
    description: t("descripcion"),
    keywords: t("palabrasClave").split(", "),
    openGraph: { type: "website", locale: locale === "es" ? "es_419" : "en_US", siteName: "Clipfine", url: "/" },
    twitter: { card: "summary_large_image" },
    manifest: "/manifest.webmanifest",
    icons: {
      icon: "/favicon.png",
      apple: "/icons/apple-touch-icon.png",
    },
    appleWebApp: {
      capable: true,
      title: "Clipfine",
      // La barra de estado transparente deja que el fondo oscuro de la app llegue
      // hasta arriba en iOS, en vez de cortarse con una franja blanca.
      statusBarStyle: "black-translucent",
    },
  };
}

/** La letra de la marca. Servida por next/font: sin pedidos a Google en el navegador. */
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  // `viewportFit: cover` es lo que permite pintar bajo el notch; el padding
  // seguro lo pone el layout con env(safe-area-inset-*).
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  // Sin tope de zoom: limitarlo rompe la accesibilidad para quien necesita
  // agrandar, y el layout ya aguanta el pellizco.
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // El idioma del pedido (i18n/request.ts): el elegido en Perfil o el del navegador.
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={inter.variable}>
      <body className="font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
        <RegistrarSW />
      </body>
    </html>
  );
}
