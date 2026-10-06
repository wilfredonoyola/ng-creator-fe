import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import {
  BellRing,
  Bell,
  Blend,
  Building2,
  CalendarDays,
  Captions,
  Columns2,
  Crop,
  Download,
  Eraser,
  Film,
  Gauge,
  Hand,
  Hash,
  Image as IconoImagen,
  ImagePlus,
  Images,
  Languages,
  ListChecks,
  Mail,
  Megaphone,
  MessageSquareText,
  Move,
  Palette,
  Pencil,
  Pipette,
  Radio,
  Ratio,
  RotateCcw,
  ScanFace,
  Scissors,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  SpellCheck,
  Stamp,
  Sticker,
  TextCursorInput,
  Timer,
  Type,
  Upload,
  UserCheck,
  VolumeX,
  WandSparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
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
  Seccion,
  enlaceDemo,
} from "@/components/landing/Publica";
import { VARIABLES_FUENTES } from "@/components/landing/fuentes";

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

/**
 * Todas las funciones de Clipfine, por sección. Solo lo que ya funciona en la
 * web o en la app (verificado contra el código el 6/10): si algo se apaga o
 * cambia, se saca de acá. Cada item es una clave de `landingFunciones.items`.
 */
const SECCIONES = [
  {
    id: "ia",
    items: [
      { clave: "momentos", icono: Sparkles },
      { clave: "puntaje", icono: Gauge },
      { clave: "sugeridos", icono: Zap },
      { clave: "aMano", icono: MessageSquareText },
    ],
  },
  {
    id: "edicion",
    items: [
      { clave: "tramo", icono: Crop },
      { clave: "cortes", icono: Scissors },
      { clave: "silencios", icono: VolumeX },
      { clave: "autoEncuadre", icono: ScanFace },
      { clave: "encuadreManual", icono: Move },
      { clave: "formatos", icono: Ratio },
      { clave: "disenos", icono: Columns2 },
      { clave: "fondo", icono: Blend },
    ],
  },
  {
    id: "textos",
    items: [
      { clave: "subtitulos", icono: Captions },
      { clave: "corregir", icono: SpellCheck },
      { clave: "estilos", icono: Palette },
      { clave: "textosDiseno", icono: Type },
      { clave: "gancho", icono: Zap },
      { clave: "cta", icono: Megaphone },
    ],
  },
  {
    id: "imagenes",
    items: [
      { clave: "hastaTres", icono: ImagePlus },
      { clave: "quitarFondo", icono: Eraser },
      { clave: "contorno", icono: Sticker },
    ],
  },
  {
    id: "marca",
    items: [
      { clave: "logo", icono: Stamp },
      { clave: "colores", icono: Pipette },
      { clave: "estiloMarca", icono: Type },
      { clave: "aplicaSolo", icono: WandSparkles },
    ],
  },
  {
    id: "calidad",
    items: [
      { clave: "render", icono: Film },
      { clave: "indicador", icono: Gauge },
      { clave: "vistaPrevia", icono: Smartphone },
      { clave: "versionFacebook", icono: Timer },
      { clave: "descargar", icono: Download },
    ],
  },
  {
    id: "importar",
    items: [
      { clave: "subir", icono: Upload },
      { clave: "restream", icono: Radio },
    ],
  },
  {
    id: "publicar",
    items: [
      { clave: "cuatroRedes", icono: Send },
      { clave: "porDefecto", icono: Hash },
      { clave: "portada", icono: IconoImagen },
      { clave: "comoSale", icono: TextCursorInput },
      { clave: "calendario", icono: CalendarDays },
      { clave: "editarAgendada", icono: Pencil },
      { clave: "reintentar", icono: RotateCcw },
    ],
  },
  {
    id: "equipo",
    items: [
      { clave: "marcas", icono: Building2 },
      { clave: "roles", icono: ShieldCheck },
      { clave: "invitaciones", icono: Mail },
      { clave: "tomar", icono: Hand },
      { clave: "listos", icono: ListChecks },
      { clave: "autoria", icono: UserCheck },
      { clave: "avisos", icono: Bell },
    ],
  },
  {
    id: "app",
    items: [
      { clave: "app", icono: Smartphone },
      { clave: "push", icono: BellRing },
      { clave: "fotos", icono: Images },
      { clave: "idiomas", icono: Languages },
    ],
  },
] as const satisfies readonly { id: string; items: readonly { clave: string; icono: LucideIcon }[] }[];

/** Dos dígitos, como los pasos de la landing: 01, 02… */
const numero = (i: number) => String(i + 1).padStart(2, "0");

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
                <a href={enlaceDemo(tl("demoAsunto"))} className={`text-[17px] ${LINK_SUBRAYADO}`}>{tl("nav.demo")}</a>
              </div>
              <p className={`${ETIQUETA} text-sm font-medium text-[#A3A29C]`}>{tl("portada.letraChica")}</p>
            </div>
          </div>
        </section>

        {/* ---- Índice ---- */}
        <nav aria-labelledby="indice" className="border-b border-[#E9E8E4]">
          <div className={`${ANCHO} flex flex-col gap-6 py-12 lg:py-16`}>
            <Seccion>
              <span id="indice">{t("indice")}</span>
            </Seccion>
            <ol className="grid grid-cols-1 border-t-2 border-[#0A0A0A] min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              {SECCIONES.map((s, i) => (
                <li key={s.id} className="border-b border-[#D9D8D2]">
                  <a
                    href={`#${s.id}`}
                    className={`group flex items-baseline gap-3 py-4 pr-4 text-[17px] font-bold leading-tight hover:underline hover:underline-offset-[5px] ${FOCO} focus-visible:outline-[#0A0A0A]`}
                  >
                    <span className={`${MONO} text-xs font-medium text-[#6B6A64]`}>{numero(i)}</span>
                    {t(`secciones.${s.id}.titulo`)}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        {/* ---- Secciones ---- */}
        {SECCIONES.map((s, i) => {
          const beige = i % 2 === 0;
          return (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titulo`} className={`scroll-mt-[76px] ${beige ? "bg-[#F4F3EE]" : "bg-white"}`}>
              <div className={`${ANCHO} flex flex-col gap-10 py-16 lg:py-24`}>
                <div className="grid items-end gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20">
                  <div className="flex flex-col gap-5">
                    <Seccion>{numero(i)}</Seccion>
                    <h2 id={`${s.id}-titulo`} className={`${CONDENSADA} break-words text-[40px] leading-[.95] sm:text-[60px]`}>
                      {t(`secciones.${s.id}.titulo`)}
                    </h2>
                  </div>
                  <p className="text-lg leading-relaxed text-[#3A3935] sm:text-[19px]">{t(`secciones.${s.id}.texto`)}</p>
                </div>
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {s.items.map(({ clave, icono: Icono }) => (
                    <li key={clave} className={`flex flex-col gap-4 rounded-xl p-6 sm:p-7 ${beige ? "bg-white" : "bg-[#F4F3EE]"}`}>
                      <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0A0A0A]">
                        <Icono size={22} strokeWidth={2} color="#FFD400" />
                      </span>
                      <h3 className="text-[22px] font-extrabold leading-[1.15]">{t(`items.${clave}.titulo`)}</h3>
                      <p className="leading-normal text-[#3A3935]">{t(`items.${clave}.texto`)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}

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
                <a href={enlaceDemo(tl("demoAsunto"))} className={`text-[17px] ${LINK_SUBRAYADO}`}>{tl("nav.demo")}</a>
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
