import type { Metadata } from "next";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ENLACE_EMPEZAR } from "@/components/landing/Marco";
import {
  ANCHO,
  BOTON_CORAL,
  CONDENSADA,
  CabeceraPublica,
  ENLACE_FUNCIONES,
  ETIQUETA,
  FOCO,
  H2,
  LINK_SUBRAYADO,
  MONO,
  PiePublico,
  RAYADO,
  Seccion,
  LINK_DEMO,
} from "@/components/landing/Publica";
import { Precios } from "@/components/landing/Precios";
import { PLANES } from "@/components/landing/planes";
import { RedirigirSiHaySesion } from "@/components/landing/RedirigirSiHaySesion";
import { VARIABLES_FUENTES } from "@/components/landing/fuentes";
import { MaquetaMetricas } from "@/components/landing/MaquetaMetricas";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return {
    title: { absolute: t("meta.titulo") },
    description: t("meta.descripcion"),
    alternates: { canonical: "/" },
  };
}

/**
 * La landing para agencias, a partir del diseño de
 * branding/Clipfine Logo Directions (6)/Clipfine Landing.dc.html. Solo muestra
 * lo que ya funciona; lo que falta va con "Pronto".
 */

/** Dónde se publica desde el calendario. `hoy` es lo que ya funciona (#64). */
const REDES = [
  { nombre: "Facebook", hoy: true },
  { nombre: "Instagram", hoy: true },
  { nombre: "TikTok", hoy: true },
  { nombre: "YouTube", hoy: true },
] as const;

const TIPOS_AGENCIA = ["clips", "podcast", "b2b", "redes"] as const;
const USOS = ["podcast", "lives"] as const;
const PASOS = ["subir", "clips", "publicar"] as const;
/** Lo que hace la analítica (#119), en el orden en que importa a una agencia. */
const PUNTOS_METRICAS = ["porClip", "retencion", "ia", "programa", "reporte", "solo"] as const;
const PREGUNTAS = ["gratis", "horas", "custom", "redes", "metricas", "clientes", "opus", "sigue", "idioma", "app"] as const;

const CLIPS = ["c1", "c2", "c3", "c4"] as const;
const CLIENTES = [
  { letra: "A", punto: "#FFD400" },
  { letra: "B", punto: "#FF4D3D" },
  { letra: "C", punto: "#D9D8D2" },
  { letra: "D", punto: "#8A8983" },
] as const;

type Dia = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";
type Red = "FB" | "IG" | "TT" | "YT";
const CALENDARIO: { dia: Dia; posts: [Red, string][] }[] = [
  { dia: "lun", posts: [["TT", "09:00"], ["IG", "12:30"]] },
  { dia: "mar", posts: [["YT", "10:00"]] },
  { dia: "mie", posts: [["FB", "08:30"], ["TT", "18:00"]] },
  { dia: "jue", posts: [["IG", "11:00"]] },
  { dia: "vie", posts: [["YT", "09:30"], ["FB", "16:00"]] },
  { dia: "sab", posts: [["TT", "12:00"]] },
  { dia: "dom", posts: [] },
];

const ONDA = [7, 12, 9, 15, 11, 6, 14, 18, 10, 8, 13, 17, 12, 9, 6, 11, 16, 19, 14, 10, 7, 12, 15, 9, 13, 18, 11, 8, 10, 14, 17, 12, 9, 6, 11, 15, 10, 13, 8, 7];
const BARRAS = [42, 58, 35, 71, 49, 88, 40, 62, 54, 77, 45, 66, 38, 52, 60];

function IconoRed({ red }: { red: (typeof REDES)[number]["nombre"] }) {
  switch (red) {
    case "TikTok":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden>
          <path d="M14 2h3.2c.3 2.4 1.8 4 4.3 4.2v3.3c-1.6 0-3-.5-4.3-1.3v7.1A6.3 6.3 0 1 1 10.9 9v3.4a3 3 0 1 0 3.1 3z" />
        </svg>
      );
    case "Instagram":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="1" fill="#FFFFFF" stroke="none" />
        </svg>
      );
    case "YouTube":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <rect x="1.5" y="5" width="21" height="14" rx="4.5" fill="#FFFFFF" />
          <path d="M10 9v6l5.2-3z" fill="#1C1C1A" />
        </svg>
      );
    case "Facebook":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden>
          <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8z" />
        </svg>
      );
  }
}

/** La red en el calendario de las maquetas. */
function EtiquetaRed({ red }: { red: Red }) {
  return <span className={`${ETIQUETA} rounded-sm bg-[#FFD400] px-[3px] text-[9px] font-bold text-[#0A0A0A]`}>{red}</span>;
}

/** El producto en la portada: clientes, un episodio hecho clips y la semana. */
function MaquetaPortada() {
  const t = useTranslations("landing");
  const m = (k: "alt" | "sumarCliente" | "cuadro" | "listos" | "formato" | "transcripcion" | "momentos" | "encuadre" | "hecho" | "mas" | "calendario" | "redes") =>
    t(`portada.maqueta.${k}`);
  return (
    <div role="img" aria-label={m("alt")} className="flex min-w-0 flex-col gap-3.5 rounded-xl border border-[#2E2E2B] bg-[#1C1C1A] p-4 sm:p-[18px]">
      <div className="flex items-center gap-1.5 overflow-hidden border-b border-[#2E2E2B] pb-3.5">
        {CLIENTES.map((c, i) => (
          <div
            key={c.letra}
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-[7px] text-[13px] font-semibold ${
              i === 0 ? "bg-white text-[#0A0A0A]" : "text-[#D9D8D2] shadow-[inset_0_0_0_1px_#33332F] max-sm:hidden"
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: c.punto }} />
            {t("portada.maqueta.cliente", { letra: c.letra })}
          </div>
        ))}
        <div className={`${MONO} ml-auto shrink-0 text-xs text-[#8A8983]`}>{m("sumarCliente")}</div>
      </div>
      <div className={`${MONO} flex justify-between gap-3 text-xs text-[#A3A29C]`}>
        <span className="truncate">{t("portada.maqueta.cliente", { letra: "A" })} / EP-142_full.mp4</span>
        <span>01:12:08</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <div className={`${MONO} ${RAYADO} flex aspect-video items-center justify-center rounded-md border border-[#33332F] text-[11px] text-[#8A8983]`}>
          {m("cuadro")}
        </div>
        <div className={`${MONO} flex flex-col justify-between gap-3 py-0.5 text-xs text-[#A3A29C]`}>
          <div className="flex flex-col gap-1">
            <span className="font-[family-name:var(--font-archivo)] text-2xl font-extrabold text-white">{m("listos")}</span>
            <span>{m("formato")}</span>
          </div>
          <div className="flex flex-col gap-[7px]">
            {(["transcripcion", "momentos", "encuadre"] as const).map((k) => (
              <div key={k} className="flex justify-between">
                <span>{m(k)}</span>
                <span className="text-[#FFD400]">{m("hecho")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {CLIPS.map((c, i) => (
          <div key={c} className={`${RAYADO} relative aspect-[9/16] overflow-hidden rounded-md border border-[#33332F] ${i === 3 ? "max-sm:hidden" : ""}`}>
            <div className={`${MONO} absolute left-2 top-2 text-[10px] text-[#8A8983]`}>0{i + 1}</div>
            <div className={`${CONDENSADA} absolute left-2 right-2 top-[54%] text-center text-[13px] leading-[1.04] text-white sm:text-[17px]`}>
              {t(`portada.maqueta.clips.${c}.antes`)} <span className="bg-[#FFD400] px-[3px] text-[#0A0A0A]">{t(`portada.maqueta.clips.${c}.marca`)}</span>{" "}
              {t(`portada.maqueta.clips.${c}.despues`)}
            </div>
          </div>
        ))}
        <div className="flex aspect-[9/16] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[#4A4A45] max-sm:hidden">
          <span className="text-[30px] font-black text-white [font-stretch:75%]">+11</span>
          <span className={`${MONO} text-[10px] text-[#A3A29C]`}>{m("mas")}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 rounded-lg border border-[#2E2E2B] bg-[#0A0A0A] p-3">
        <div className={`${MONO} flex justify-between text-[11px] text-[#A3A29C]`}>
          <span className="text-white">{m("calendario")}</span>
          <span>{m("redes")}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {CALENDARIO.slice(0, 5).map((d, i) => (
            <div key={d.dia} className={`flex flex-col gap-1.5 ${i > 2 ? "max-sm:hidden" : ""}`}>
              <div className={`${MONO} text-[10px] text-[#8A8983]`}>{t(`dias.${d.dia}`)}</div>
              {d.posts.map(([red, hora]) => (
                <div key={red + hora} className={`${MONO} flex items-center gap-1.5 rounded bg-[#1C1C1A] px-1.5 py-[5px] text-[10px] text-[#D9D8D2]`}>
                  <span className="h-3.5 w-2 shrink-0 rounded-[1px] bg-[#3A3A36]" />
                  <EtiquetaRed red={red} />
                  <span>{hora}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Una tarjeta de función: la viñeta de interfaz arriba y el texto abajo. */
function Funcion({
  clave,
  alt,
  children,
}: {
  clave: "clientes" | "momentos" | "calendario" | "analisis";
  alt: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("landing.funciones");
  return (
    <div className="flex min-w-0 flex-col gap-7 rounded-xl bg-white px-4 pb-9 pt-4 sm:px-5 sm:pt-5">
      <div role="img" aria-label={alt} className={`${MONO} flex h-[280px] flex-col overflow-hidden rounded-md bg-[#0A0A0A] p-[18px] text-[11px] text-[#A3A29C]`}>
        {children}
      </div>
      <div className="flex flex-col gap-3 px-2">
        <h3 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.01em]">{t(`${clave}.titulo`)}</h3>
        <p className="leading-relaxed text-[#3A3935]">{t(`${clave}.texto`)}</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const t = useTranslations("landing");
  const locale = useLocale();

  /** Para Google: qué es y cuánto cuesta, y las preguntas como FAQ. */
  const datosEstructurados = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Clipfine",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web, iOS, Android",
      inLanguage: locale,
      description: t("datos.descripcion"),
      offers: PLANES.map((p) => ({
        "@type": "Offer",
        name: t(`precios.planes.${p.clave}.nombre`),
        price: String(p.mensual),
        priceCurrency: "USD",
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: PREGUNTAS.map((q) => ({
        "@type": "Question",
        name: t(`preguntas.items.${q}.p`),
        acceptedAnswer: { "@type": "Answer", text: t(`preguntas.items.${q}.r`) },
      })),
    },
  ];

  return (
    <div className={`${VARIABLES_FUENTES} min-h-screen bg-white font-[family-name:var(--font-archivo)] text-[#0A0A0A]`}>
      <RedirigirSiHaySesion />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados) }} />

      <CabeceraPublica enLanding />

      {/* ---- Portada ---- */}
      <section className="bg-[#0A0A0A] text-white">
        <div className={`${ANCHO} grid items-center gap-12 py-16 lg:grid-cols-[minmax(0,540px)_minmax(0,1fr)] lg:gap-16 lg:pb-24 lg:pt-[88px]`}>
          <div className="flex flex-col gap-7">
            <p className={`${ETIQUETA} text-sm font-bold uppercase tracking-[.12em] text-[#FFD400]`}>{t("portada.etiqueta")}</p>
            <h1 className={`${CONDENSADA} text-[52px] leading-[.93] tracking-[-0.005em] sm:text-[84px]`}>{t("portada.titulo")}</h1>
            <p className="text-lg leading-relaxed text-[#D9D8D2] sm:text-[19px]">{t("portada.texto")}</p>
            <div className="mt-1 flex flex-col gap-3.5">
              <div className="flex flex-wrap items-center gap-7">
                <Link href={ENLACE_EMPEZAR} data-track="start-free" className={`${BOTON_CORAL} h-14 px-[30px] text-[17px] focus-visible:outline-white`}>
                  {t("nav.empezar")}
                </Link>
                <a {...LINK_DEMO} className={`text-[17px] ${LINK_SUBRAYADO}`}>{t("nav.demo")}</a>
              </div>
              <p className={`${ETIQUETA} text-sm font-medium text-[#A3A29C]`}>{t("portada.letraChica")}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-3.5 border-t border-[#2E2E2B] pt-[18px]">
                <span className={`${ETIQUETA} text-sm font-medium text-[#D9D8D2]`}>{t("portada.publicaEn")}</span>
                <ul className="flex gap-2">
                  {REDES.map((r) => (
                    <li
                      key={r.nombre}
                      title={r.hoy ? r.nombre : `${r.nombre} · ${t("pronto")}`}
                      className={`flex h-8 w-8 items-center justify-center rounded-[7px] border border-[#2E2E2B] bg-[#1C1C1A] ${r.hoy ? "" : "opacity-45"}`}
                    >
                      <IconoRed red={r.nombre} />
                      <span className="sr-only">{r.hoy ? r.nombre : `${r.nombre}, ${t("pronto")}`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <MaquetaPortada />
        </div>
      </section>

      {/* ---- El problema ---- */}
      <section className={`${ANCHO} grid items-end gap-8 py-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20 lg:py-32`}>
        <h2 className={H2}>{t("problema.titulo")}</h2>
        <p className="text-lg leading-relaxed text-[#3A3935] sm:text-xl">{t("problema.texto")}</p>
      </section>

      {/* ---- Funciones ---- */}
      <section id="funciones" className="scroll-mt-20 bg-[#F4F3EE]">
        <div className={`${ANCHO} flex flex-col gap-12 py-20 lg:py-28`}>
          <Seccion titulo>{t("funciones.etiqueta")}</Seccion>
          <div className="grid gap-6 lg:grid-cols-2">
            <Funcion clave="clientes" alt={t("funciones.clientes.alt")}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap border-b border-[#2E2E2B] pb-2.5">
                  {(["episodios", "clips", "calendario", "analisis", "brandKit"] as const).map((k, i) => (
                    <span key={k} className={i === 0 ? "text-white" : ""}>{t(`funciones.clientes.pestanas.${k}`)}</span>
                  ))}
                </div>
                {(["listo", "programado", "procesando", "publicado"] as const).map((estado, i) => (
                  <div key={estado} className="flex justify-between rounded bg-[#1C1C1A] px-3 py-2.5 text-xs">
                    <span className="text-white">{t("portada.maqueta.cliente", { letra: CLIENTES[i].letra })}</span>
                    <span className={i === 0 ? "text-[#FFD400]" : ""}>{t(`funciones.clientes.estados.${estado}`)}</span>
                  </div>
                ))}
              </div>
            </Funcion>

            <Funcion clave="momentos" alt={t("funciones.momentos.alt")}>
              <div className="flex h-full flex-col gap-3.5">
                <div className="flex justify-between">
                  <span className="text-white">{t("funciones.momentos.encabezado")}</span>
                  <span>{t("funciones.momentos.editor")}</span>
                </div>
                <div className="grid flex-1 grid-cols-6 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`rounded ${RAYADO} ${i === 0 ? "shadow-[inset_0_0_0_2px_#FFD400]" : ""}`} />
                  ))}
                </div>
                <div className="relative flex h-10 items-center gap-[3px] overflow-hidden rounded bg-[#1C1C1A] px-2">
                  {ONDA.map((h, i) => (
                    <span key={i} className="flex-1 rounded-[1px] bg-[#3A3A36]" style={{ height: h }} />
                  ))}
                  <div className="absolute inset-y-0 left-[34%] w-[28%] rounded-[3px] bg-[#FFD400]/10 shadow-[inset_0_0_0_2px_#FFD400]" />
                  <div className="absolute inset-y-1.5 left-[calc(34%-4px)] w-2 rounded-sm bg-[#FFD400]" />
                  <div className="absolute inset-y-1.5 left-[calc(62%-4px)] w-2 rounded-sm bg-[#FFD400]" />
                </div>
                <div className="flex justify-between">
                  <span>00:22:31</span>
                  <span className="text-white">0:38</span>
                  <span>00:23:09</span>
                </div>
              </div>
            </Funcion>

            <Funcion clave="calendario" alt={t("funciones.calendario.alt")}>
              <div className="flex h-full flex-col gap-3">
                <div className="flex justify-between gap-3">
                  <span className="text-white">{t("funciones.calendario.encabezado")}</span>
                  <span className="truncate">{REDES.map((r) => r.nombre).join(" · ")}</span>
                </div>
                <div className="grid flex-1 grid-cols-4 gap-1.5 sm:grid-cols-7">
                  {CALENDARIO.map((d, i) => (
                    <div key={d.dia} className={`flex flex-col gap-1.5 rounded bg-[#141413] p-1.5 ${i > 3 ? "max-sm:hidden" : ""}`}>
                      <div className="text-[10px] text-[#8A8983]">{t(`dias.${d.dia}`)}</div>
                      {d.posts.map(([red, hora]) => (
                        <div key={red + hora} className="flex flex-col gap-1 rounded-[3px] bg-[#262624] p-[5px]">
                          <div className="h-[30px] rounded-sm bg-[repeating-linear-gradient(135deg,#33332F_0_1px,#2A2A27_1px_6px)]" />
                          <div className="flex items-center justify-between">
                            <EtiquetaRed red={red} />
                            <span className="text-[9px]">{hora}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </Funcion>

            <Funcion clave="analisis" alt={t("funciones.analisis.alt")}>
              <div className="flex h-full flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-white">{t("funciones.analisis.encabezado")}</span>
                  <span className="rounded-full border border-dashed border-[#6B6A64] px-2 py-0.5 text-[10px]">{t("funciones.analisis.ejemplo")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["vistas", "interacciones", "seguidores", "mejorHora"] as const).map((k, i) => (
                    <div key={k} className={`flex flex-col gap-1 rounded bg-[#1C1C1A] p-2.5 ${i > 1 ? "max-sm:hidden" : ""}`}>
                      <span className="truncate text-[10px]">{t(`funciones.analisis.${k}.nombre`)}</span>
                      <span className="font-[family-name:var(--font-archivo)] text-[22px] font-extrabold text-white">{t(`funciones.analisis.${k}.valor`)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-1 items-end gap-1.5 border-b border-[#2E2E2B] px-0.5">
                  {BARRAS.map((h, i) => (
                    <span key={i} className={`flex-1 rounded-t-sm ${i === 5 ? "bg-[#FFD400]" : "bg-[#3A3A36]"}`} style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="text-center text-[10px]">{t("funciones.analisis.porHora")}</div>
              </div>
            </Funcion>
          </div>
          <Link href={ENLACE_FUNCIONES} className={`self-start text-[17px] ${LINK_SUBRAYADO} ${FOCO} focus-visible:outline-[#0A0A0A]`}>
            {t("funciones.verTodas")} →
          </Link>
        </div>
      </section>

      {/* ---- Métricas ---- */}
      <section id="metricas" aria-labelledby="metricas-titulo" className="scroll-mt-20 bg-[#0A0A0A] text-white">
        <div className={`${ANCHO} grid items-center gap-12 py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-28`}>
          <div className="flex flex-col gap-7">
            <p className={`${ETIQUETA} text-sm font-bold uppercase tracking-[.12em] text-[#FFD400]`}>{t("metricas.etiqueta")}</p>
            <h2 id="metricas-titulo" className={`${CONDENSADA} text-[44px] leading-[.95] sm:text-[68px]`}>{t("metricas.titulo")}</h2>
            <p className="text-lg leading-relaxed text-[#D9D8D2] sm:text-[19px]">{t("metricas.texto")}</p>
            <ul className="flex flex-col gap-4 border-t border-[#2E2E2B] pt-6">
              {PUNTOS_METRICAS.map((k) => (
                <li key={k} className="flex gap-3">
                  <span aria-hidden className="mt-[9px] h-2 w-2 shrink-0 bg-[#FFD400]" />
                  <p className="leading-relaxed text-[#D9D8D2]">
                    <strong className="font-bold text-white">{t(`metricas.puntos.${k}.titulo`)}</strong> {t(`metricas.puntos.${k}.texto`)}
                  </p>
                </li>
              ))}
            </ul>
            <Link href={ENLACE_EMPEZAR} className={`${BOTON_CORAL} h-14 self-start px-[30px] text-[17px] focus-visible:outline-white`}>
              {t("nav.empezar")}
            </Link>
          </div>
          <MaquetaMetricas />
        </div>
      </section>

      {/* ---- Para quién ---- */}
      <section className={`${ANCHO} flex flex-col gap-12 py-20 lg:py-28`}>
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20">
          <div className="flex flex-col gap-5">
            <Seccion>{t("paraQuien.etiqueta")}</Seccion>
            <h2 className={H2}>{t("paraQuien.titulo")}</h2>
          </div>
          <p className="text-lg leading-relaxed text-[#3A3935] sm:text-[19px]">{t("paraQuien.texto")}</p>
        </div>
        <div className="flex flex-col gap-4">
          <p className={`${ETIQUETA} text-xs font-bold uppercase tracking-[.12em] text-[#6B6A64]`}>{t("paraQuien.porTipo")}</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {TIPOS_AGENCIA.map((k) => (
              <div key={k} className="flex flex-col gap-3 rounded-xl bg-[#F4F3EE] p-7 sm:min-h-[200px]">
                <h3 className="text-2xl font-extrabold leading-[1.12]">{t(`paraQuien.tipos.${k}.titulo`)}</h3>
                <p className="leading-normal text-[#3A3935]">{t(`paraQuien.tipos.${k}.texto`)}</p>
              </div>
            ))}
          </div>
          <p className={`${ETIQUETA} mt-4 text-xs font-bold uppercase tracking-[.12em] text-[#6B6A64]`}>{t("paraQuien.porUso")}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {USOS.map((k) => (
              <div key={k} className="flex flex-col gap-2.5 rounded-xl bg-[#F4F3EE] p-7">
                <h3 className="text-2xl font-extrabold leading-[1.12]">{t(`paraQuien.usos.${k}.titulo`)}</h3>
                <p className="leading-normal text-[#3A3935]">{t(`paraQuien.usos.${k}.texto`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Cómo funciona ---- */}
      <section id="como" className="scroll-mt-20 bg-[#F4F3EE]">
        <div className={`${ANCHO} flex flex-col gap-14 py-20 lg:py-28`}>
          <Seccion titulo>{t("como.etiqueta")}</Seccion>
          <ol className="grid border-t-2 border-[#0A0A0A] md:grid-cols-3">
            {PASOS.map((k, i) => (
              <li
                key={k}
                className={`flex flex-col gap-4 pt-8 md:px-10 ${i === 0 ? "md:pl-0" : "max-md:mt-8 max-md:border-t max-md:border-[#D9D8D2] md:border-l md:border-[#D9D8D2]"} ${i === PASOS.length - 1 ? "md:pr-0" : ""}`}
              >
                <div className="text-[72px] font-black leading-[.9] [font-stretch:75%] sm:text-[88px]">0{i + 1}</div>
                <h3 className="text-[28px] font-extrabold leading-[1.1]">{t(`como.pasos.${k}.titulo`)}</h3>
                <p className="text-[17px] leading-relaxed text-[#3A3935]">{t(`como.pasos.${k}.texto`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Precios />

      {/* ---- Preguntas ---- */}
      <section id="preguntas" className="scroll-mt-20 border-t border-[#E9E8E4]">
        <div className={`${ANCHO} grid gap-10 py-20 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16 lg:py-28`}>
          <h2 className={H2}>{t("preguntas.titulo")}</h2>
          <div className="flex flex-col border-t-2 border-[#0A0A0A]">
            {PREGUNTAS.map((q, i) => (
              <details key={q} open={i === 0} className="group border-b border-[#D9D8D2]">
                <summary className={`flex cursor-pointer list-none items-center justify-between gap-6 py-[26px] text-lg font-bold leading-tight hover:text-[#3A3935] sm:text-[22px] [&::-webkit-details-marker]:hidden ${FOCO} focus-visible:outline-[#0A0A0A]`}>
                  {t(`preguntas.items.${q}.p`)}
                  <span
                    aria-hidden
                    className={`${MONO} flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#0A0A0A] text-lg group-open:bg-[#0A0A0A] group-open:text-white`}
                  >
                    <span className="group-open:hidden">+</span>
                    <span className="hidden group-open:inline">–</span>
                  </span>
                </summary>
                <p className="pb-7 pr-12 text-base leading-relaxed text-[#3A3935] sm:pr-20 sm:text-lg">{t(`preguntas.items.${q}.r`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Cierre ---- */}
      <section className="bg-[#FFD400]">
        <div className={`${ANCHO} grid items-end gap-10 py-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 lg:py-28`}>
          <h2 className={`${CONDENSADA} text-[52px] leading-[.92] sm:text-[96px]`}>{t("cierre.titulo")}</h2>
          <div className="flex flex-col gap-7">
            <p className="text-lg leading-normal sm:text-xl">{t("cierre.texto")}</p>
            <div className="flex flex-wrap items-center gap-7">
              <Link href={ENLACE_EMPEZAR} data-track="start-free" className={`${BOTON_CORAL} h-14 px-[30px] text-[17px] shadow-[inset_0_0_0_1.5px_#0A0A0A] focus-visible:outline-[#0A0A0A]`}>
                {t("nav.empezar")}
              </Link>
              <a {...LINK_DEMO} className={`text-[17px] ${LINK_SUBRAYADO}`}>{t("nav.demo")}</a>
            </div>
          </div>
        </div>
      </section>

      <PiePublico />
    </div>
  );
}
