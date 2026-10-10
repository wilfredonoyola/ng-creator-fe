import Link from "next/link";
import { useTranslations } from "next-intl";
import { LogoNG } from "@/components/LogoNG";
import { SelectorIdiomaCompacto } from "@/components/SelectorIdiomaCompacto";
import { PREFIJO_APP } from "@/lib/sitio";

/**
 * A dónde lleva "Empezar": al registro, que da una prueba gratis. "Entrar"
 * va al login. Los dos viven en app.clipfine.io (ver src/middleware.ts).
 */
export const ENLACE_EMPEZAR = `${PREFIJO_APP}/registro`;
export const ENLACE_ENTRAR = `${PREFIJO_APP}/login`;

/** Cabecera y pie de las páginas públicas (la landing y /app). */
export function Cabecera() {
  const t = useTranslations("landingMarco");
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ng-hondo/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" aria-label={t("inicio")}>
          <LogoNG tamano={30} />
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/#como" className="hidden text-ng-secundario hover:text-white sm:inline">{t("comoFunciona")}</Link>
          <Link href="/features" className="hidden text-ng-secundario hover:text-white md:inline">{t("funciones")}</Link>
          <Link href="/app" className="hidden text-ng-secundario hover:text-white sm:inline">{t("app")}</Link>
          <Link href="/#precios" className="hidden text-ng-secundario hover:text-white sm:inline">{t("precios")}</Link>
          <SelectorIdiomaCompacto />
          <Link href={ENLACE_ENTRAR} className="text-ng-secundario hover:text-white">{t("entrar")}</Link>
          <Link href={ENLACE_EMPEZAR} className="rounded-ng-md bg-marca px-4 py-2 font-semibold text-ng-tinta brillo-marca hover:brightness-110">
            {t("empezar")}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Pie() {
  const t = useTranslations("landingMarco");
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-ng-tenue">
        <LogoNG tamano={22} />
        <div className="flex gap-5">
          <Link href="/features" className="hover:text-white">{t("funciones")}</Link>
          <Link href="/app" className="hover:text-white">{t("app")}</Link>
          <Link href="/privacidad" className="hover:text-white">{t("privacidad")}</Link>
          <Link href="/terminos" className="hover:text-white">{t("terminos")}</Link>
          <Link href={ENLACE_ENTRAR} className="hover:text-white">{t("entrar")}</Link>
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-5 pb-8 text-xs text-ng-tenue">
        {t.rich("productoDe", {
          link: (c) => (
            <a href="https://ngstudios.co" className="font-semibold text-white/80 hover:text-white">
              {c}
            </a>
          ),
        })}
      </p>
    </footer>
  );
}
