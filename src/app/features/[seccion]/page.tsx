import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
import { MAQUETAS } from "@/components/landing/mockups";
import { RELACIONADAS, SECCIONES, esSeccion, namespaceDe, numero, type IdSeccion } from "@/components/landing/funciones";
import { VISTAS } from "@/components/landing/vistas";
import { ENLACE_AYUDA, guiasDeFuncion } from "@/lib/ayuda";
import { URL_SITIO } from "@/lib/sitio";

type Props = { params: { seccion: string } };

// Sin generateStaticParams a propósito: el idioma sale de cada visita (como en
// /features), y una página prerenderizada quedaría en el del build. Lo que no
// es una sección da 404.

/** Lo de la sección para una agencia, sin tipos: cada sección tiene su namespace con las mismas claves. */
type Texto = (clave: string) => string;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!esSeccion(params.seccion)) return {};
  const locale = await getLocale();
  const seccion = SECCIONES.find((s) => s.id === params.seccion)!;
  const ta = (await getTranslations(namespaceDe(seccion.id) as never)) as unknown as Texto;
  // Escritos a mano para lo que busca una agencia, con la marca ya adentro.
  const titulo = ta("seo.titulo");
  const descripcion = ta("seo.descripcion");
  const url = `${URL_SITIO}${ENLACE_FUNCIONES}/${seccion.id}`;
  return {
    title: { absolute: titulo },
    description: descripcion,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "Clipfine",
      locale: locale === "es" ? "es_419" : "en_US",
      url,
      title: titulo,
      description: descripcion,
    },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion },
  };
}

/** Una sección de /features en su propia página: la maqueta, sus funciones y el camino a las demás. */
export default function PaginaSeccion({ params }: Props) {
  if (!esSeccion(params.seccion)) notFound();
  return <Seccion id={params.seccion} />;
}

function Seccion({ id }: { id: IdSeccion }) {
  const t = useTranslations("landingFunciones");
  const tl = useTranslations("landing");
  const locale = useLocale();
  const ta = useTranslations(namespaceDe(id) as never) as unknown as Texto;
  const mensajes = useMessages() as Record<string, { preguntas?: Record<string, unknown>; datos?: Record<string, unknown> }>;
  const preguntas = Object.keys(mensajes[namespaceDe(id)]?.preguntas ?? {});
  const datos = Object.keys(mensajes[namespaceDe(id)]?.datos ?? {});
  const vistas = VISTAS[id] ?? {};
  const i = SECCIONES.findIndex((s) => s.id === id);
  const s = SECCIONES[i];
  const Maqueta = MAQUETAS[s.id];
  const guias = guiasDeFuncion(locale, id);
  const anterior = SECCIONES[i - 1];
  const siguiente = SECCIONES[i + 1];

  return (
    <div className={`${VARIABLES_FUENTES} min-h-screen overflow-x-clip bg-white font-[family-name:var(--font-archivo)] text-[#0A0A0A]`}>
      <CabeceraPublica actual="funciones" />

      <main>
        {/* ---- Portada ---- */}
        <section className="bg-[#0A0A0A] text-white">
          <div className={`${ANCHO} flex flex-col gap-7 py-14 lg:pb-20 lg:pt-20`}>
            <nav aria-label={t("migas")} className={`${ETIQUETA} flex items-center gap-2 text-sm font-bold uppercase tracking-[.12em]`}>
              <Link href={ENLACE_FUNCIONES} className={`text-[#FFD400] hover:underline hover:underline-offset-4 ${FOCO} focus-visible:outline-white`}>
                {t("portada.etiqueta")}
              </Link>
              <span aria-hidden className="text-[#6B6A64]">/</span>
              <span className={`${MONO} text-[#A3A29C]`}>
                {numero(i)} · {t(`secciones.${s.id}.titulo`)}
              </span>
            </nav>
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
              <div className="flex min-w-0 flex-col gap-7">
                <h1 className={`${CONDENSADA} break-words text-[44px] leading-[.93] tracking-[-0.005em] sm:text-[76px] lg:text-[88px]`}>
                  {ta("titulo")} <span className="text-[#FFD400]">{ta("destacado")}</span>
                </h1>
                <p className="max-w-[640px] text-lg leading-relaxed text-[#D9D8D2] sm:text-[19px]">{ta("bajada")}</p>
                <div className="mt-1 flex flex-wrap items-center gap-7">
                  <Link href={ENLACE_EMPEZAR} className={`${BOTON_CORAL} h-14 px-[30px] text-[17px] focus-visible:outline-white`}>
                    {t("portada.cta")}
                  </Link>
                  <a {...LINK_DEMO} className={`text-[17px] ${LINK_SUBRAYADO}`}>{tl("nav.demo")}</a>
                </div>
              </div>
              <div className="min-w-0">
                <Maqueta />
              </div>
            </div>
            {/* Hechos del producto, no promesas: nada de "ahorrás 80 %" sin números de clientes. */}
            <dl aria-label={t("agencia.datos")} className="mt-2 grid gap-px overflow-hidden rounded-xl border border-[#2E2E2B] bg-[#2E2E2B] sm:grid-cols-3">
              {datos.map((d) => (
                <div key={d} className="flex flex-col gap-1 bg-[#0A0A0A] px-5 py-4">
                  <dt className={`${CONDENSADA} text-[40px] leading-none text-[#FFD400] sm:text-[46px]`}>{ta(`datos.${d}.cifra`)}</dt>
                  <dd className="text-[15px] text-[#D9D8D2]">{ta(`datos.${d}.que`)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---- Las funciones: la vista previa, qué hace y qué gana la agencia ---- */}
        <section aria-labelledby="funciones-titulo" className="bg-[#F4F3EE]">
          <div className={`${ANCHO} flex flex-col gap-8 py-16 lg:py-24`}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="funciones-titulo" className={`${CONDENSADA} text-[34px] leading-[.95] sm:text-[52px]`}>
                {t("agencia.funciones")}
              </h2>
              <p className="max-w-[46ch] text-[#3A3935]">{t("agencia.funcionesTexto")}</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {s.items.map(({ clave, icono: Icono }) => {
                const Vista = vistas[clave];
                return (
                  <li key={clave} className="flex min-w-0 flex-col overflow-hidden rounded-[14px] bg-white transition hover:-translate-y-[3px] hover:shadow-[0_14px_30px_-18px_rgba(10,10,10,.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                    {Vista ? (
                      <Vista />
                    ) : (
                      <span aria-hidden className="flex h-[178px] items-center justify-center bg-[#1C1C1A]">
                        <Icono size={40} strokeWidth={1.75} color="#FFD400" />
                      </span>
                    )}
                    <div className="flex flex-1 flex-col gap-2.5 p-5 sm:p-6">
                      <h3 className="flex items-center gap-2.5 text-xl font-extrabold leading-[1.15]">
                        <Icono aria-hidden size={18} strokeWidth={2.25} className="shrink-0" />
                        {t(`items.${clave}.titulo`)}
                      </h3>
                      <p className="leading-normal text-[#3A3935]">{t(`items.${clave}.texto`)}</p>
                      <p className="mt-auto flex items-baseline gap-2.5 border-t border-dashed border-[#DAD9D3] pt-3 text-[15px] font-semibold">
                        <span className={`${MONO} shrink-0 rounded-[3px] bg-[#0A0A0A] px-1.5 py-0.5 text-[10px] uppercase tracking-[.08em] text-[#FFD400]`}>
                          {t("agencia.etiqueta")}
                        </span>
                        <span>{ta(`agencia.${clave}`)}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ---- Preguntas de agencias (también como FAQ para buscadores) y relacionadas ---- */}
        <section aria-labelledby="preguntas-titulo" className="bg-white">
          <div className={`${ANCHO} grid gap-8 py-16 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-14 lg:py-24`}>
            <h2 id="preguntas-titulo" className={`${CONDENSADA} text-[34px] leading-[.95] sm:text-[52px]`}>
              {t("agencia.preguntas")}
            </h2>
            <div className="flex min-w-0 flex-col">
              {preguntas.map((p, n) => (
                <details key={p} open={n === 0} className="group border-b border-[#E6E5DF] py-4">
                  <summary className={`flex cursor-pointer list-none items-start justify-between gap-4 text-lg font-extrabold ${FOCO} focus-visible:outline-[#0A0A0A] [&::-webkit-details-marker]:hidden`}>
                    {ta(`preguntas.${p}.p`)}
                    <span aria-hidden className={`${MONO} text-[#6B6A64] group-open:hidden`}>+</span>
                    <span aria-hidden className={`${MONO} hidden text-[#6B6A64] group-open:inline`}>–</span>
                  </summary>
                  <p className="mt-2.5 max-w-[62ch] leading-relaxed text-[#3A3935]">{ta(`preguntas.${p}.r`)}</p>
                </details>
              ))}
              <script
                type="application/ld+json"
                // Solo texto nuestro: las preguntas de la sección.
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    mainEntity: preguntas.map((p) => ({
                      "@type": "Question",
                      name: ta(`preguntas.${p}.p`),
                      acceptedAnswer: { "@type": "Answer", text: ta(`preguntas.${p}.r`) },
                    })),
                  }).replace(/</g, "\\u003c"),
                }}
              />
              {/* Las guías de la wiki que explican esta sección (su `funciones:`): la misma fuente que el chat y el MCP. */}
              {guias.length > 0 && (
                <div className="mt-8 flex flex-col gap-3">
                  <span className={`${ETIQUETA} text-xs font-bold uppercase tracking-[.12em] text-[#6B6A64]`}>{t("agencia.guias")}</span>
                  <ul className="flex flex-col">
                    {guias.map((g) => (
                      <li key={g.slug} className="border-b border-[#E6E5DF]">
                        <Link
                          href={`${ENLACE_AYUDA}/${g.slug}`}
                          className={`group flex items-center justify-between gap-3 py-3 text-[17px] font-semibold hover:underline hover:underline-offset-4 ${FOCO} focus-visible:outline-[#0A0A0A]`}
                        >
                          {g.titulo}
                          <ArrowRight aria-hidden size={16} className="shrink-0 text-[#6B6A64] group-hover:text-[#0A0A0A]" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-8 flex flex-col gap-3">
                <span className={`${ETIQUETA} text-xs font-bold uppercase tracking-[.12em] text-[#6B6A64]`}>{t("agencia.relacionadas")}</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {RELACIONADAS[id].map((r) => (
                    <Link
                      key={r}
                      href={`${ENLACE_FUNCIONES}/${r}`}
                      className={`flex items-center justify-between gap-3 rounded-xl border-2 border-[#0A0A0A] p-4 text-lg font-extrabold hover:bg-[#F4F3EE] ${FOCO} focus-visible:outline-[#0A0A0A]`}
                    >
                      {t(`secciones.${r}.titulo`)}
                      <ArrowRight aria-hidden size={18} className="shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Anterior, siguiente y todas ---- */}
        <nav aria-label={t("otras")} className="border-b border-[#E9E8E4]">
          <div className={`${ANCHO} grid gap-4 py-12 sm:grid-cols-2 lg:py-16`}>
            {anterior ? (
              <Link
                href={`${ENLACE_FUNCIONES}/${anterior.id}`}
                className={`group flex flex-col gap-2 rounded-xl border-2 border-[#0A0A0A] p-5 hover:bg-[#F4F3EE] ${FOCO} focus-visible:outline-[#0A0A0A]`}
              >
                <span className={`${ETIQUETA} flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[#6B6A64]`}>
                  <ArrowLeft size={14} /> {t("anterior")}
                </span>
                <span className="text-xl font-extrabold">{t(`secciones.${anterior.id}.titulo`)}</span>
              </Link>
            ) : (
              <span className="max-sm:hidden" />
            )}
            {siguiente ? (
              <Link
                href={`${ENLACE_FUNCIONES}/${siguiente.id}`}
                className={`group flex flex-col items-end gap-2 rounded-xl border-2 border-[#0A0A0A] p-5 text-right hover:bg-[#F4F3EE] ${FOCO} focus-visible:outline-[#0A0A0A]`}
              >
                <span className={`${ETIQUETA} flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[#6B6A64]`}>
                  {t("siguiente")} <ArrowRight size={14} />
                </span>
                <span className="text-xl font-extrabold">{t(`secciones.${siguiente.id}.titulo`)}</span>
              </Link>
            ) : (
              <span className="max-sm:hidden" />
            )}
            <Link href={ENLACE_FUNCIONES} className={`justify-self-start text-[17px] sm:col-span-2 ${LINK_SUBRAYADO} ${FOCO} focus-visible:outline-[#0A0A0A]`}>
              {t("verTodas")} →
            </Link>
          </div>
        </nav>

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
