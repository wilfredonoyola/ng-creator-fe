import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LogoNG } from "@/components/LogoNG";
import { SelectorIdiomaCompacto } from "@/components/SelectorIdiomaCompacto";
import { ENLACE_EMPEZAR, ENLACE_ENTRAR } from "@/components/landing/Marco";

/**
 * El sistema de las páginas públicas para agencias (la landing y /features):
 * las clases que se repiten, la etiqueta de sección, la cabecera y el pie.
 * Diseño: branding/Clipfine Logo Directions (6)/Clipfine Landing.dc.html.
 */

/** "Agendá una demo" abre un correo hasta que haya agenda. */
const CORREO_DEMO = "soporte@ngstudios.co";

export function enlaceDemo(asunto: string): string {
  return `mailto:${CORREO_DEMO}?subject=${encodeURIComponent(asunto)}`;
}

/** Todas las funciones, en su propia página. */
export const ENLACE_FUNCIONES = "/features";

export const ANCHO = "mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-16";
export const ETIQUETA = "font-[family-name:var(--font-grotesk)]";
export const MONO = "font-[family-name:var(--font-mono)]";
export const CONDENSADA = "font-black uppercase [font-stretch:75%] [text-wrap:balance]";
export const H2 = `${CONDENSADA} text-[44px] leading-[.95] sm:text-[76px]`;
export const RAYADO = "bg-[repeating-linear-gradient(135deg,#262624_0_1px,#1F1F1D_1px_10px)]";
export const FOCO = "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px]";
export const BOTON_CORAL = `flex items-center rounded-md bg-[#FF4D3D] font-bold text-[#0A0A0A] hover:bg-[#E8392A] active:translate-y-px active:bg-[#D63323] ${FOCO}`;
export const LINK_SUBRAYADO = "font-semibold underline decoration-[1.5px] underline-offset-[6px] hover:decoration-[3px]";

/** La etiqueta de sección con el corte de la marca. `titulo` cuando es el h2 de la sección. */
export function Seccion({ children, titulo = false }: { children: React.ReactNode; titulo?: boolean }) {
  const Etiqueta = titulo ? "h2" : "p";
  return (
    <Etiqueta className={`${ETIQUETA} flex items-center gap-3 text-[13px] font-bold uppercase tracking-[.12em]`}>
      <span aria-hidden className="flex flex-col gap-0.5">
        <span className="ml-[3px] h-[5px] w-3.5 bg-[#0A0A0A]" />
        <span className="h-[5px] w-3.5 bg-[#0A0A0A]" />
      </span>
      {children}
    </Etiqueta>
  );
}

/**
 * La barra de arriba. En la landing las secciones son anclas de la misma
 * página; desde /features vuelven a la landing. "Funciones" va siempre a
 * /features, la lista completa.
 */
export function CabeceraPublica({ enLanding = false, actual }: { enLanding?: boolean; actual?: "funciones" }) {
  const t = useTranslations("landing");
  const base = enLanding ? "" : "/";
  const items = [
    { clave: "funciones", href: ENLACE_FUNCIONES },
    { clave: "como", href: `${base}#como` },
    { clave: "precios", href: `${base}#precios` },
    { clave: "preguntas", href: `${base}#preguntas` },
  ] as const;
  return (
    <header className="sticky top-0 z-30 border-b border-[#E9E8E4] bg-white">
      <div className={`${ANCHO} flex h-[76px] items-center justify-between gap-4`}>
        <div className="flex items-center gap-14">
          <Link href="/" aria-label={t("nav.inicio")} className="flex shrink-0">
            <Image src="/brand/clipfine-wordmark-ink.svg" alt="Clipfine" width={130} height={23} priority unoptimized />
          </Link>
          <nav className="hidden gap-8 text-[15px] font-medium lg:flex">
            {items.map((i) => (
              <Link
                key={i.clave}
                href={i.href}
                aria-current={actual === i.clave ? "page" : undefined}
                className="underline-offset-[6px] hover:underline aria-[current=page]:underline aria-[current=page]:decoration-2"
              >
                {t(`nav.${i.clave}`)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <SelectorIdiomaCompacto claro className="hidden sm:flex" />
          <Link href={ENLACE_ENTRAR} className="text-[15px] font-medium underline-offset-[6px] hover:underline">{t("nav.entrar")}</Link>
          <a href={enlaceDemo(t("demoAsunto"))} className={`hidden text-[15px] md:inline ${LINK_SUBRAYADO} underline-offset-[5px]`}>{t("nav.demo")}</a>
          <Link href={ENLACE_EMPEZAR} className={`${BOTON_CORAL} h-11 shrink-0 px-4 text-[15px] sm:px-[22px] focus-visible:outline-[#0A0A0A]`}>
            {t("nav.empezar")}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PiePublico() {
  const t = useTranslations("landing");
  return (
    <footer className="bg-[#0A0A0A] text-white">
      <div className={`${ANCHO} flex flex-col gap-12 pb-12 pt-16`}>
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="flex flex-col gap-[18px]">
            <LogoNG tamano={56} />
            <p className="text-[#D9D8D2]">{t("pie.lema")}</p>
          </div>
          <nav className="flex flex-col gap-3.5">
            <Link href={ENLACE_FUNCIONES} className="underline-offset-[5px] hover:underline">{t("pie.funciones")}</Link>
            <Link href="/app" className="underline-offset-[5px] hover:underline">{t("pie.app")}</Link>
            <Link href="/privacidad" className="underline-offset-[5px] hover:underline">{t("pie.privacidad")}</Link>
            <Link href="/terminos" className="underline-offset-[5px] hover:underline">{t("pie.terminos")}</Link>
            <Link href={ENLACE_ENTRAR} className="underline-offset-[5px] hover:underline">{t("nav.entrar")}</Link>
          </nav>
        </div>
        <div className={`${MONO} flex flex-wrap items-center justify-between gap-4 border-t border-[#2E2E2B] pt-6 text-sm text-[#D9D8D2]`}>
          <span>
            {t.rich("pie.productoDe", {
              link: (c) => (
                <a href="https://ngstudios.co" className="font-semibold text-white hover:underline">
                  {c}
                </a>
              ),
            })}
          </span>
          <SelectorIdiomaCompacto />
        </div>
      </div>
    </footer>
  );
}
