import Link from "next/link";
import { LogoNG } from "@/components/LogoNG";

/**
 * A dónde lleva "Empezar". Hoy al ingreso (las cuentas se crean por
 * invitación); cuando exista el registro (#88), a `/registro`. Un solo lugar para cambiarlo.
 */
export const ENLACE_EMPEZAR = "/login";

/** Cabecera y pie de las páginas públicas (la landing y /app). */
export function Cabecera() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ng-hondo/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" aria-label="NG Creator, inicio">
          <LogoNG tamano={30} />
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/#como" className="hidden text-ng-secundario hover:text-white sm:inline">Cómo funciona</Link>
          <Link href="/app" className="hidden text-ng-secundario hover:text-white sm:inline">App</Link>
          <Link href="/#precios" className="hidden text-ng-secundario hover:text-white sm:inline">Precios</Link>
          <Link href="/login" className="text-ng-secundario hover:text-white">Entrar</Link>
          <Link href={ENLACE_EMPEZAR} className="rounded-ng-md bg-marca px-4 py-2 font-semibold text-white brillo-marca hover:brightness-110">
            Empezar
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Pie() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-ng-tenue">
        <LogoNG tamano={22} />
        <div className="flex gap-5">
          <Link href="/app" className="hover:text-white">App</Link>
          <Link href="/privacidad" className="hover:text-white">Privacidad</Link>
          <Link href="/terminos" className="hover:text-white">Términos</Link>
          <Link href="/login" className="hover:text-white">Entrar</Link>
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-5 pb-8 text-xs text-ng-tenue">
        Un producto de{" "}
        <a href="https://ngstudios.co" className="font-semibold text-white/80 hover:text-white">
          NG Studios
        </a>
      </p>
    </footer>
  );
}
