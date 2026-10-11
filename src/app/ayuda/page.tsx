import type { Metadata } from "next";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { ANCHO, CONDENSADA, CabeceraPublica, ETIQUETA, FOCO, PiePublico } from "@/components/landing/Publica";
import { VARIABLES_FUENTES } from "@/components/landing/fuentes";
import { BuscadorAyuda } from "@/components/ayuda/BuscadorAyuda";
import { ContactoAyuda } from "@/components/ayuda/Contacto";
import { textoPlano } from "@/components/ayuda/Markdown";
import { CATEGORIAS_AYUDA, ENLACE_AYUDA, articulosAyuda, porCategoria } from "@/lib/ayuda";
import { URL_SITIO } from "@/lib/sitio";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ayuda");
  const locale = await getLocale();
  const titulo = t("meta.titulo");
  const descripcion = t("meta.descripcion");
  const url = `${URL_SITIO}${ENLACE_AYUDA}`;
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "Clipfine",
      locale: locale === "es" ? "es_419" : "en_US",
      url,
      title: `${titulo} — Clipfine`,
      description: descripcion,
    },
  };
}

/** La wiki de ayuda: el buscador y los artículos por categoría. */
export default function PaginaAyuda() {
  const t = useTranslations("ayuda");
  const locale = useLocale();
  const entradas = articulosAyuda(locale).map(({ slug, titulo, descripcion, categoria, cuerpo }) => ({
    slug,
    titulo,
    descripcion,
    categoria,
    texto: textoPlano(cuerpo),
  }));

  return (
    <div className={`${VARIABLES_FUENTES} min-h-screen overflow-x-clip bg-white font-[family-name:var(--font-archivo)] text-[#0A0A0A]`}>
      <CabeceraPublica actual="ayuda" />

      <main>
        <section className="bg-[#0A0A0A] text-white">
          <div className={`${ANCHO} flex flex-col gap-7 py-14 lg:py-20`}>
            <p className={`${ETIQUETA} text-sm font-bold uppercase tracking-[.12em] text-[#FFD400]`}>{t("etiqueta")}</p>
            <h1 className={`${CONDENSADA} max-w-[14ch] break-words text-[44px] leading-[.93] sm:text-[84px]`}>{t("titulo")}</h1>
            <p className="max-w-[640px] text-lg leading-relaxed text-[#D9D8D2] sm:text-[19px]">{t("texto")}</p>
            <BuscadorAyuda entradas={entradas} />
          </div>
        </section>

        <section aria-label={t("meta.titulo")} className="bg-[#F4F3EE]">
          <div className={`${ANCHO} flex flex-col gap-12 py-14 lg:py-20`}>
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORIAS_AYUDA.map((c) => {
                const articulos = porCategoria(locale, c);
                if (!articulos.length) return null;
                return (
                  <li key={c} id={c} className="flex scroll-mt-24 flex-col gap-4 rounded-xl bg-white p-6">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="text-xl font-extrabold leading-tight">{t(`categorias.${c}`)}</h2>
                      <span className={`${ETIQUETA} shrink-0 text-xs font-medium text-[#8A8983]`}>{t("articulos", { n: articulos.length })}</span>
                    </div>
                    <ul className="flex flex-col">
                      {articulos.map((a) => (
                        <li key={a.slug} className="border-t border-[#E9E8E4] first:border-t-0">
                          <Link
                            href={`${ENLACE_AYUDA}/${a.slug}`}
                            className={`group flex items-center justify-between gap-3 py-2.5 text-[15px] hover:underline hover:underline-offset-4 ${FOCO} focus-visible:outline-[#0A0A0A]`}
                          >
                            {a.titulo}
                            <ArrowRight size={15} aria-hidden className="shrink-0 text-[#8A8983] group-hover:text-[#0A0A0A]" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ol>
            <ContactoAyuda />
          </div>
        </section>
      </main>

      <PiePublico />
    </div>
  );
}
