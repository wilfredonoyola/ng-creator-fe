import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Cabecera, Pie } from "@/components/landing/Marco";

/**
 * Contenedor de las páginas legales.
 *
 * Deliberadamente NO usa DashboardLayout: estas páginas tienen que ser públicas.
 * Meta exige poder leer la política de privacidad y los términos sin iniciar
 * sesión, tanto en la revisión de la app como con su crawler.
 *
 * Tampoco es un componente cliente, así que se prerenderiza a HTML estático y se
 * lee sin ejecutar JavaScript.
 */
export function LegalLayout({
  titulo,
  actualizado,
  children,
}: {
  titulo: string;
  /** AAAA-MM-DD. */
  actualizado: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("legal");
  const formato = useFormatter();
  // Al mediodía UTC para que ningún huso horario la corra un día.
  const fecha = formato.dateTime(new Date(`${actualizado}T12:00:00Z`), { dateStyle: "long", timeZone: "UTC" });
  return (
    <div className="min-h-screen bg-ng-hondo text-white/80">
      <Cabecera />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-white">{titulo}</h1>
        <p className="mt-2 text-sm text-white/40">{t("ultimaActualizacion", { fecha })}</p>

        <div className="mt-10 space-y-10 leading-relaxed">{children}</div>

        <footer className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-sm">
          <Link href="/privacidad" className="text-white/50 hover:text-ng-celeste">
            {t("politicaPrivacidad")}
          </Link>
          <Link href="/terminos" className="text-white/50 hover:text-ng-celeste">
            {t("terminosServicio")}
          </Link>
        </footer>
      </main>
      <Pie />
    </div>
  );
}

/** Sección con encabezado, para no repetir clases en cada bloque. */
export function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold text-white">{titulo}</h2>
      <div className="space-y-3 text-[15px]">{children}</div>
    </section>
  );
}
