import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { SECCIONES, esSeccion, numero } from "@/components/landing/funciones";
import { URL_SITIO } from "@/lib/sitio";

type Props = { params: { seccion: string } };

// Sin generateStaticParams a propósito: el idioma sale de cada visita (como en
// /features), y una página prerenderizada quedaría en el del build. Lo que no
// es una sección da 404.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!esSeccion(params.seccion)) return {};
  const t = await getTranslations("landingFunciones");
  const locale = await getLocale();
  const seccion = SECCIONES.find((s) => s.id === params.seccion)!;
  const titulo = t(`secciones.${seccion.id}.titulo`);
  // El texto de la sección y lo que trae: "… Por revisar, Aprobar con un toque, …".
  const descripcion = `${t(`secciones.${seccion.id}.texto`)} ${seccion.items.map((i) => t(`items.${i.clave}.titulo`)).join(" · ")}.`;
  const url = `${URL_SITIO}${ENLACE_FUNCIONES}/${seccion.id}`;
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
    twitter: { card: "summary_large_image", title: `${titulo} — Clipfine`, description: descripcion },
  };
}

/** Una sección de /features en su propia página: la maqueta, sus funciones y el camino a las demás. */
export default function PaginaSeccion({ params }: Props) {
  if (!esSeccion(params.seccion)) notFound();
  return <Seccion id={params.seccion} />;
}

function Seccion({ id }: { id: string }) {
  const t = useTranslations("landingFunciones");
  const tl = useTranslations("landing");
  const i = SECCIONES.findIndex((s) => s.id === id);
  const s = SECCIONES[i];
  const Maqueta = MAQUETAS[s.id];
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
              <span className={`${MONO} text-[#A3A29C]`}>{numero(i)}</span>
            </nav>
            <h1 className={`${CONDENSADA} max-w-[16ch] break-words text-[44px] leading-[.93] tracking-[-0.005em] sm:text-[84px] lg:text-[104px]`}>
              {t(`secciones.${s.id}.titulo`)}
            </h1>
            <p className="max-w-[640px] text-lg leading-relaxed text-[#D9D8D2] sm:text-[19px]">{t(`secciones.${s.id}.texto`)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-7">
              <Link href={ENLACE_EMPEZAR} className={`${BOTON_CORAL} h-14 px-[30px] text-[17px] focus-visible:outline-white`}>
                {t("portada.cta")}
              </Link>
              <a {...LINK_DEMO} className={`text-[17px] ${LINK_SUBRAYADO}`}>{tl("nav.demo")}</a>
            </div>
          </div>
        </section>

        {/* ---- La maqueta y las funciones ---- */}
        <section aria-label={t(`secciones.${s.id}.titulo`)} className="bg-[#F4F3EE]">
          <div className={`${ANCHO} grid items-start gap-8 py-16 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-14 lg:py-24`}>
            <div className="min-w-0 lg:sticky lg:top-24">
              <Maqueta />
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {s.items.map(({ clave, icono: Icono }) => (
                <li key={clave} className="flex flex-col gap-3 rounded-xl bg-white p-5 sm:p-6">
                  <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0A0A0A]">
                    <Icono size={20} strokeWidth={2} color="#FFD400" />
                  </span>
                  <h2 className="text-xl font-extrabold leading-[1.15]">{t(`items.${clave}.titulo`)}</h2>
                  <p className="leading-normal text-[#3A3935]">{t(`items.${clave}.texto`)}</p>
                </li>
              ))}
            </ul>
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
