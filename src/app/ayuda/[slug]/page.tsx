import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ANCHO, CONDENSADA, CabeceraPublica, ENLACE_FUNCIONES, ETIQUETA, FOCO, PiePublico } from "@/components/landing/Publica";
import { VARIABLES_FUENTES } from "@/components/landing/fuentes";
import { ContactoAyuda } from "@/components/ayuda/Contacto";
import { Markdown } from "@/components/ayuda/Markdown";
import { ENLACE_AYUDA, articuloAyuda, articulosAyuda, porCategoria } from "@/lib/ayuda";
import { URL_SITIO } from "@/lib/sitio";

type Props = { params: { slug: string } };

// Dinámica, como /features/[seccion]: el idioma sale de cada visita.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await getLocale();
  const a = articuloAyuda(locale, params.slug);
  if (!a) return {};
  const url = `${URL_SITIO}${ENLACE_AYUDA}/${a.slug}`;
  return {
    title: a.titulo,
    description: a.descripcion,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: "Clipfine",
      locale: locale === "es" ? "es_419" : "en_US",
      url,
      title: `${a.titulo} — Clipfine`,
      description: a.descripcion,
    },
  };
}

/** Un artículo de la wiki: el texto, los demás de su categoría y el camino al anterior y al siguiente. */
export default function PaginaArticulo({ params }: Props) {
  const locale = useLocale();
  const a = articuloAyuda(locale, params.slug);
  if (!a) notFound();
  return <Articulo slug={a.slug} />;
}

function Articulo({ slug }: { slug: string }) {
  const t = useTranslations("ayuda");
  const tf = useTranslations("landingFunciones");
  const locale = useLocale();
  const todos = articulosAyuda(locale);
  const i = todos.findIndex((x) => x.slug === slug);
  const a = todos[i];
  const anterior = todos[i - 1];
  const siguiente = todos[i + 1];
  const hermanos = porCategoria(locale, a.categoria);

  return (
    <div className={`${VARIABLES_FUENTES} min-h-screen overflow-x-clip bg-white font-[family-name:var(--font-archivo)] text-[#0A0A0A]`}>
      <CabeceraPublica actual="ayuda" />

      <main>
        <section className="bg-[#0A0A0A] text-white">
          <div className={`${ANCHO} flex flex-col gap-6 py-12 lg:py-16`}>
            <nav aria-label={t("migas")} className={`${ETIQUETA} flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-[.12em]`}>
              <Link href={ENLACE_AYUDA} className={`text-[#FFD400] hover:underline hover:underline-offset-4 ${FOCO} focus-visible:outline-white`}>
                {t("etiqueta")}
              </Link>
              <span aria-hidden className="text-[#6B6A64]">/</span>
              <Link
                href={`${ENLACE_AYUDA}#${a.categoria}`}
                className={`text-[#A3A29C] hover:text-white hover:underline hover:underline-offset-4 ${FOCO} focus-visible:outline-white`}
              >
                {t(`categorias.${a.categoria}`)}
              </Link>
            </nav>
            <h1 className={`${CONDENSADA} max-w-[20ch] break-words text-[40px] leading-[.95] sm:text-[64px]`}>{a.titulo}</h1>
            <p className="max-w-[640px] text-lg leading-relaxed text-[#D9D8D2]">{a.descripcion}</p>
            {/* La función que explica, en /features: el otro lado de la misma fuente. */}
            {a.funciones.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className={`${ETIQUETA} text-xs font-bold uppercase tracking-[.12em] text-[#A3A29C]`}>{t("funcion")}</span>
                {a.funciones.map((f) => (
                  <Link
                    key={f}
                    href={`${ENLACE_FUNCIONES}/${f}`}
                    className={`rounded-full border border-[#3A3935] px-3 py-1 text-sm font-semibold text-white hover:border-[#FFD400] hover:text-[#FFD400] ${FOCO} focus-visible:outline-white`}
                  >
                    {tf(`secciones.${f}.titulo`)} →
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className={`${ANCHO} grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16 lg:py-16`}>
          <article className="min-w-0">
            <Markdown texto={a.cuerpo} />
          </article>
          <aside className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
            <h2 className={`${ETIQUETA} text-xs font-bold uppercase tracking-[.12em] text-[#6B6A64]`}>{t("enEstaCategoria")}</h2>
            <ul className="flex flex-col border-l-2 border-[#E9E8E4]">
              {hermanos.map((h) => (
                <li key={h.slug}>
                  <Link
                    href={`${ENLACE_AYUDA}/${h.slug}`}
                    aria-current={h.slug === a.slug ? "page" : undefined}
                    className={`-ml-0.5 block border-l-2 border-transparent py-1.5 pl-4 text-[15px] text-[#3A3935] hover:text-[#0A0A0A] aria-[current=page]:border-[#0A0A0A] aria-[current=page]:font-bold aria-[current=page]:text-[#0A0A0A] ${FOCO} focus-visible:outline-[#0A0A0A]`}
                  >
                    {h.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <nav aria-label={t("volver")} className="border-t border-[#E9E8E4]">
          <div className={`${ANCHO} grid gap-4 py-10 sm:grid-cols-2`}>
            {anterior ? (
              <Link
                href={`${ENLACE_AYUDA}/${anterior.slug}`}
                className={`flex flex-col gap-2 rounded-xl border-2 border-[#0A0A0A] p-5 hover:bg-[#F4F3EE] ${FOCO} focus-visible:outline-[#0A0A0A]`}
              >
                <span className={`${ETIQUETA} flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[#6B6A64]`}>
                  <ArrowLeft size={14} aria-hidden /> {t("anterior")}
                </span>
                <span className="text-lg font-extrabold">{anterior.titulo}</span>
              </Link>
            ) : (
              <span className="max-sm:hidden" />
            )}
            {siguiente ? (
              <Link
                href={`${ENLACE_AYUDA}/${siguiente.slug}`}
                className={`flex flex-col items-end gap-2 rounded-xl border-2 border-[#0A0A0A] p-5 text-right hover:bg-[#F4F3EE] ${FOCO} focus-visible:outline-[#0A0A0A]`}
              >
                <span className={`${ETIQUETA} flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[#6B6A64]`}>
                  {t("siguiente")} <ArrowRight size={14} aria-hidden />
                </span>
                <span className="text-lg font-extrabold">{siguiente.titulo}</span>
              </Link>
            ) : (
              <span className="max-sm:hidden" />
            )}
          </div>
        </nav>

        <section className="bg-[#F4F3EE]">
          <div className={`${ANCHO} py-12 lg:py-16`}>
            <ContactoAyuda />
          </div>
        </section>
      </main>

      <PiePublico />
    </div>
  );
}
