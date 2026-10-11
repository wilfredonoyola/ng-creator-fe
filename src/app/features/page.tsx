import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { ENLACE_EMPEZAR } from "@/components/landing/Marco";
import {
  ANCHO,
  BOTON_CORAL,
  CONDENSADA,
  CabeceraPublica,
  ENLACE_FUNCIONES,
  ETIQUETA,
  FOCO,
  LINK_SUBRAYADO,
  MONO,
  PiePublico,
  LINK_DEMO,
} from "@/components/landing/Publica";
import { VARIABLES_FUENTES } from "@/components/landing/fuentes";
import { SECCIONES, numero } from "@/components/landing/funciones";
import { HashAPagina } from "@/components/landing/HashAPagina";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landingFunciones");
  const locale = await getLocale();
  const titulo = t("meta.titulo");
  const descripcion = t("meta.descripcion");
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: ENLACE_FUNCIONES },
    openGraph: {
      type: "website",
      siteName: "Clipfine",
      locale: locale === "es" ? "es_419" : "en_US",
      url: ENLACE_FUNCIONES,
      title: `${titulo} — Clipfine`,
      description: descripcion,
    },
    twitter: { card: "summary_large_image", title: `${titulo} — Clipfine`, description: descripcion },
  };
}

export default function PaginaFunciones() {
  const t = useTranslations("landingFunciones");
  const tl = useTranslations("landing");

  return (
    <div className={`${VARIABLES_FUENTES} min-h-screen overflow-x-clip bg-white font-[family-name:var(--font-archivo)] text-[#0A0A0A]`}>
      <CabeceraPublica actual="funciones" />

      <main>
        {/* ---- Portada ---- */}
        <section className="bg-[#0A0A0A] text-white">
          <div className={`${ANCHO} flex flex-col gap-7 py-16 lg:pb-24 lg:pt-[88px]`}>
            <p className={`${ETIQUETA} text-sm font-bold uppercase tracking-[.12em] text-[#FFD400]`}>{t("portada.etiqueta")}</p>
            <h1 className={`${CONDENSADA} max-w-[14ch] break-words text-[44px] leading-[.93] tracking-[-0.005em] sm:text-[84px] lg:text-[104px]`}>
              {t("portada.titulo")}
            </h1>
            <p className="max-w-[640px] text-lg leading-relaxed text-[#D9D8D2] sm:text-[19px]">{t("portada.texto")}</p>
            <div className="mt-1 flex flex-col gap-3.5">
              <div className="flex flex-wrap items-center gap-7">
                <Link href={ENLACE_EMPEZAR} className={`${BOTON_CORAL} h-14 px-[30px] text-[17px] focus-visible:outline-white`}>
                  {t("portada.cta")}
                </Link>
                <a {...LINK_DEMO} className={`text-[17px] ${LINK_SUBRAYADO}`}>{tl("nav.demo")}</a>
              </div>
              <p className={`${ETIQUETA} text-sm font-medium text-[#A3A29C]`}>{tl("portada.letraChica")}</p>
            </div>
          </div>
        </section>

        {/* ---- Las secciones: cada una tiene su página ---- */}
        <section aria-label={t("indice")} className="bg-[#F4F3EE]">
          <HashAPagina ids={SECCIONES.map((s) => s.id)} />
          <ol className={`${ANCHO} grid gap-4 py-16 sm:grid-cols-2 lg:grid-cols-3 lg:py-24`}>
            {SECCIONES.map((s, i) => (
              <li key={s.id} className="flex">
                <Link
                  href={`${ENLACE_FUNCIONES}/${s.id}`}
                  className={`group flex w-full flex-col gap-4 rounded-xl bg-white p-6 transition hover:shadow-[inset_0_0_0_2px_#0A0A0A] ${FOCO} focus-visible:outline-[#0A0A0A]`}
                >
                  <span className={`${MONO} text-xs font-medium text-[#6B6A64]`}>{numero(i)}</span>
                  <h2 className={`${CONDENSADA} break-words text-[32px] leading-[.95] sm:text-[40px]`}>{t(`secciones.${s.id}.titulo`)}</h2>
                  <p className="leading-relaxed text-[#3A3935]">{t(`secciones.${s.id}.texto`)}</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {s.items.map(({ clave }) => (
                      <li key={clave} className="rounded-full bg-[#F4F3EE] px-2.5 py-1 text-[13px] text-[#3A3935]">
                        {t(`items.${clave}.titulo`)}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-auto flex items-center gap-2 pt-2 font-semibold underline decoration-[1.5px] underline-offset-[6px] group-hover:decoration-[3px]">
                    {t("ver")} <ArrowRight size={16} />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- Cierre ---- */}
        <section className="bg-[#FFD400]">
          <div className={`${ANCHO} grid items-end gap-10 py-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 lg:py-28`}>
            <h2 className={`${CONDENSADA} break-words text-[52px] leading-[.92] sm:text-[96px]`}>{t("cierre.titulo")}</h2>
            <div className="flex flex-col gap-7">
              <p className="text-lg leading-normal sm:text-xl">{t("cierre.texto")}</p>
              <div className="flex flex-wrap items-center gap-7">
                <Link
                  href={ENLACE_EMPEZAR}
                  className={`${BOTON_CORAL} h-14 px-[30px] text-[17px] shadow-[inset_0_0_0_1.5px_#0A0A0A] focus-visible:outline-[#0A0A0A]`}
                >
                  {t("cierre.cta")}
                </Link>
                <a {...LINK_DEMO} className={`text-[17px] ${LINK_SUBRAYADO}`}>{tl("nav.demo")}</a>
              </div>
              <p className={`${ETIQUETA} text-sm font-medium`}>{tl("portada.letraChica")}</p>
            </div>
          </div>
        </section>
      </main>

      <PiePublico />
    </div>
  );
}
