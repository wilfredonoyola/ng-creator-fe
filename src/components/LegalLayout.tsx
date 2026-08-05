import Link from "next/link";

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
  actualizado: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white/80">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0FED9D] text-sm font-bold text-black">
            NG
          </span>
          <div>
            <p className="text-sm font-bold tracking-wide text-white">
              NG VIDEO CREATOR
            </p>
            <p className="text-xs text-white/40">Creator Studio</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-white">{titulo}</h1>
        <p className="mt-2 text-sm text-white/40">
          Última actualización: {actualizado}
        </p>

        <div className="mt-10 space-y-10 leading-relaxed">{children}</div>

        <footer className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-sm">
          <Link href="/privacidad" className="text-white/50 hover:text-[#0FED9D]">
            Política de privacidad
          </Link>
          <Link href="/terminos" className="text-white/50 hover:text-[#0FED9D]">
            Términos del servicio
          </Link>
        </footer>
      </main>
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
