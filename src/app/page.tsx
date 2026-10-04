import type { Metadata } from "next";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import {
  AudioLines,
  CalendarClock,
  X,
  Captions,
  Check,
  Crop,
  Download,
  LayoutPanelTop,
  ListChecks,
  Mic,
  Radio,
  Send,
  Smartphone,
  Sparkles,
  Type,
  Upload,
  Users,
  Video,
  Clapperboard,
  type LucideIcon,
} from "lucide-react";
import { LogoNG } from "@/components/LogoNG";
import { Cabecera, ENLACE_EMPEZAR, Pie } from "@/components/landing/Marco";
import { MaquetaTelefono } from "@/components/landing/MaquetaTelefono";
import { MaquetaProducto } from "@/components/landing/MaquetaProducto";
import { MaquetaAutoEncuadre } from "@/components/landing/MaquetaAutoEncuadre";
import { MaquetaLives } from "@/components/landing/MaquetaLives";
import { RedirigirSiHaySesion } from "@/components/landing/RedirigirSiHaySesion";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return {
    title: { absolute: t("meta.titulo") },
    description: t("meta.descripcion"),
    alternates: { canonical: "/" },
  };
}

/** El camino completo, del archivo a las redes: es lo que se vende. */
const PASOS = [
  { clave: "subir", icono: Upload },
  { clave: "transcribir", icono: AudioLines },
  { clave: "momentos", icono: Sparkles },
  { clave: "editar", icono: Crop },
  { clave: "equipo", icono: Users },
  { clave: "publicar", icono: Send },
] as const satisfies readonly { clave: string; icono: LucideIcon }[];

/** Dónde se publica. `hoy` es lo que ya funciona; el resto está en camino (#64). */
const REDES: { nombre: string; hoy: boolean }[] = [
  { nombre: "Facebook", hoy: true },
  { nombre: "Instagram", hoy: false },
  { nombre: "TikTok", hoy: false },
  { nombre: "YouTube", hoy: false },
];

/** Lo que hace el auto-encuadre (#105), dicho para quien edita a mano. */
const AUTO_ENCUADRE = ["quienHabla", "divide", "reacciones", "ultimaPalabra", "webYApp"] as const;

/**
 * Lo que viene para quien transmite desde la computadora: con OBS o
 * Streamlabs, NG Creator como un destino mas, que graba el live mientras sale
 * al aire (todavia no existe: la seccion va como "Proximamente"). TikTok LIVE
 * Studio no manda a un segundo destino, pero graba el lienzo en un archivo
 * (MP4, MOV o MKV) de mejor calidad que la repeticion de TikTok: ese archivo
 * ya se puede subir hoy.
 */
const LIVES = ["transmitis", "llega", "terminas"] as const;

/**
 * Para quien es. Lo nuestro son los podcasts de mesa (#121); el resto es lo
 * mismo con otra entrada: cualquier video largo donde la gente habla.
 */
const PARA_QUIEN = [
  { clave: "podcasts", icono: Mic, principal: true },
  { clave: "lives", icono: Radio, principal: false },
  { clave: "streams", icono: Video, principal: false },
  { clave: "entrevistas", icono: Clapperboard, principal: false },
] as const satisfies readonly { clave: string; icono: LucideIcon; principal: boolean }[];

/** De donde llega el video. `pronto` es lo que todavia no existe. */
const ENTRADAS = [
  { clave: "archivo", pronto: false },
  { clave: "restream", pronto: false },
  { clave: "liveStudio", pronto: false },
  { clave: "obs", pronto: true },
] as const;

/** Lo que hoy hace falta para lo mismo, sin NG Creator. */
const ANTES = ["drive", "verEntero", "cortar", "subtitulos", "whatsapp", "descargar"] as const;

const FUNCIONES = [
  { clave: "transcripcion", icono: AudioLines, pronto: false },
  { clave: "momentos", icono: Sparkles, pronto: false },
  { clave: "autoEncuadre", icono: Mic, pronto: false },
  { clave: "recorte", icono: Crop, pronto: false },
  { clave: "dividido", icono: LayoutPanelTop, pronto: false },
  { clave: "subtitulos", icono: Captions, pronto: false },
  { clave: "textos", icono: Type, pronto: false },
  { clave: "mp4", icono: Download, pronto: false },
  { clave: "app", icono: Smartphone, pronto: false },
  { clave: "lives", icono: Radio, pronto: true },
  { clave: "revision", icono: ListChecks, pronto: true },
  { clave: "publicar", icono: CalendarClock, pronto: false },
] as const satisfies readonly { clave: string; icono: LucideIcon; pronto: boolean }[];

const PLANES = [
  {
    clave: "creador",
    precio: "19.99",
    incluye: ["unaPersona", "unaMarca", "doceEpisodios", "tresHoras", "ilimitados", "editorYApp"],
    destacado: false,
  },
  {
    clave: "equipo",
    precio: "49.99",
    incluye: ["cincoPersonas", "unaMarca", "dieciseisEpisodios", "tresHoras", "ilimitados", "revision"],
    destacado: true,
  },
] as const;

const EQUIPO_PUNTOS = ["roles", "variasMarcas", "mismaCuenta"] as const;

const EQUIPO_EJEMPLO = [
  { ini: "A", nombre: "Ana", clave: "ana", tono: "text-ng-celeste" },
  { ini: "L", nombre: "Luis", clave: "luis", tono: "text-ng-teal" },
  { ini: "C", nombre: "Carla", clave: "carla", tono: "text-ng-lila" },
] as const;

const PREGUNTAS = [
  "convertir",
  "tiempo",
  "descargar",
  "sigue",
  "lives",
  "subtitulos",
  "app",
  "idioma",
  "flojo",
  "episodio",
] as const;

export default function Producto() {
  const t = useTranslations("landing");
  const locale = useLocale();

  /** Para Google: qué es, en qué corre y cuánto cuesta, y las preguntas como FAQ. */
  const datosEstructurados = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "NG Creator",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web, iOS, Android",
      inLanguage: locale,
      description: t("datos.descripcion"),
      offers: PLANES.map((p) => ({
        "@type": "Offer",
        name: t(`precios.planes.${p.clave}.nombre`),
        price: p.precio,
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
    <div className="min-h-screen bg-ng-hondo text-ng-texto">
      <RedirigirSiHaySesion />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados) }} />

      <Cabecera />

      {/* ---- Portada ---- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 opacity-60 blur-3xl"
          style={{ background: "transparent" }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ng-secundario">
              <Sparkles size={13} className="text-ng-celeste" aria-hidden /> {t("portada.etiqueta")}
            </p>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
              {t.rich("portada.titulo", { marca: (c) => <span className="texto-marca">{c}</span> })}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ng-secundario">{t("portada.texto")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={ENLACE_EMPEZAR} className="rounded-ng-md bg-marca px-6 py-3 text-base font-semibold text-ng-tinta brillo-marca hover:brightness-110">
                {t("empezar")}
              </Link>
              <a href="#como" className="rounded-ng-md border border-white/15 bg-white/5 px-6 py-3 text-base font-semibold hover:bg-white/10">
                {t("portada.verComoFunciona")}
              </a>
            </div>
            <p className="mt-6 text-xs uppercase tracking-[0.22em] text-ng-tenue">Create · Share · Grow</p>
          </div>
          <MaquetaProducto />
        </div>
      </section>

      {/* ---- El flujo completo ---- */}
      <section id="como" className="border-t border-white/5 bg-ng-fondo">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="text-xs uppercase tracking-[0.22em] text-ng-celeste">{t("flujo.etiqueta")}</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{t("flujo.titulo")}</h2>
          <ol className="relative mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PASOS.map((p, i) => {
              const ultimo = i === PASOS.length - 1;
              return (
                <li
                  key={p.clave}
                  className={`relative rounded-ng-xl border p-5 ${ultimo ? "border-ng-azul/50 bg-ng-tarjeta brillo-marca" : "border-white/10 bg-ng-tarjeta"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-marca text-sm font-bold text-ng-tinta">{i + 1}</span>
                    <p.icono size={18} className="text-ng-celeste" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{t(`pasos.${p.clave}.titulo`)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ng-secundario">{t(`pasos.${p.clave}.texto`)}</p>
                  {ultimo && (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {REDES.map((r) => (
                        <li
                          key={r.nombre}
                          className={`rounded-full border px-2.5 py-1 text-xs ${r.hoy ? "border-ng-teal/40 bg-ng-teal/10 text-ng-teal" : "border-white/10 text-ng-secundario"}`}
                        >
                          {r.nombre}
                          {!r.hoy && <span className="ml-1 text-ng-lila">{t("pronto")}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ---- Para quien ---- */}
      <section id="para-quien" className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="text-xs uppercase tracking-[0.22em] text-ng-celeste">{t("paraQuien.etiqueta")}</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{t("paraQuien.titulo")}</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PARA_QUIEN.map((c) => (
              <div
                key={c.clave}
                className={`rounded-ng-lg border p-5 ${c.principal ? "border-ng-azul/50 bg-ng-tarjeta brillo-marca" : "border-white/10 bg-ng-superficie/50"}`}
              >
                <div className="flex items-center justify-between">
                  <c.icono size={20} className="text-ng-celeste" aria-hidden />
                  {c.principal && (
                    <span className="rounded-full bg-marca px-2 py-0.5 text-[11px] font-semibold text-ng-tinta">{t("paraQuien.loNuestro")}</span>
                  )}
                </div>
                <h3 className="mt-3 font-semibold">{t(`paraQuien.casos.${c.clave}.titulo`)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ng-secundario">{t(`paraQuien.casos.${c.clave}.texto`)}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-sm font-semibold">{t("paraQuien.traeTuVideo")}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {ENTRADAS.map((e) => (
              <li
                key={e.clave}
                className={`rounded-full border px-3 py-1.5 text-xs ${e.pronto ? "border-white/10 text-ng-secundario" : "border-ng-teal/40 bg-ng-teal/10 text-ng-texto"}`}
              >
                <span className="font-semibold">{t(`paraQuien.entradas.${e.clave}.titulo`)}</span>{" "}
                <span className="text-ng-secundario">· {t(`paraQuien.entradas.${e.clave}.texto`)}</span>
                {e.pronto && <span className="ml-1 text-ng-lila">{t("pronto")}</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Auto-encuadre ---- */}
      <section id="auto-encuadre" className="border-t border-white/5 bg-ng-fondo">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-ng-celeste">{t("autoEncuadre.etiqueta")}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{t("autoEncuadre.titulo")}</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-ng-secundario">{t("autoEncuadre.texto")}</p>
            <ul className="mt-6 space-y-3 text-sm">
              {AUTO_ENCUADRE.map((clave) => (
                <li key={clave} className="flex items-start gap-2.5">
                  <Check size={16} className="mt-0.5 shrink-0 text-ng-teal" aria-hidden />
                  <span>
                    <span className="font-semibold">{t(`autoEncuadre.puntos.${clave}.titulo`)}.</span>{" "}
                    <span className="text-ng-secundario">{t(`autoEncuadre.puntos.${clave}.texto`)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <MaquetaAutoEncuadre />
        </div>
      </section>

      {/* ---- Lives (proximamente) ---- */}
      <section id="lives" className="border-t border-white/5">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-[1fr_1fr]">
          <div className="lg:order-2">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-ng-celeste">
              {t("lives.etiqueta")}
              <span className="rounded-full bg-ng-violeta/15 px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-ng-lila">
                {t("lives.proximamente")}
              </span>
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{t("lives.titulo")}</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-ng-secundario">{t("lives.texto")}</p>
            <ol className="mt-6 space-y-4">
              {LIVES.map((clave, i) => (
                <li key={clave} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marca text-xs font-bold text-ng-tinta">{i + 1}</span>
                  <span className="text-sm">
                    <span className="font-semibold">{t(`lives.pasos.${clave}.titulo`)}.</span>{" "}
                    <span className="text-ng-secundario">{t(`lives.pasos.${clave}.texto`)}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-ng-tenue">{t("lives.pie")}</p>
          </div>
          <div className="lg:order-1">
            <MaquetaLives />
          </div>
        </div>
      </section>

      {/* ---- Antes y ahora ---- */}
      <section className="border-t border-white/5">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-20 lg:grid-cols-2">
          <div className="rounded-ng-xl border border-white/10 bg-ng-superficie/40 p-7">
            <p className="text-sm font-semibold text-ng-tenue">{t("antes.etiqueta")}</p>
            <p className="mt-1 text-2xl font-bold">{t("antes.titulo")}</p>
            <ul className="mt-6 space-y-3 text-sm text-ng-secundario">
              {ANTES.map((clave) => (
                <li key={clave} className="flex items-start gap-2.5">
                  <X size={16} className="mt-0.5 shrink-0 text-red-400/80" aria-hidden /> {t(`antes.items.${clave}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-ng-xl border border-ng-azul/50 bg-ng-tarjeta p-7 brillo-marca">
            <p className="text-sm font-semibold text-ng-celeste">{t("ahora.etiqueta")}</p>
            <p className="mt-1 text-2xl font-bold">{t("ahora.titulo")}</p>
            <ul className="mt-6 space-y-3 text-sm">
              {PASOS.map((p) => (
                <li key={p.clave} className="flex items-start gap-2.5">
                  <Check size={16} className="mt-0.5 shrink-0 text-ng-teal" aria-hidden /> {t(`pasos.${p.clave}.titulo`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---- Qué hace ---- */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("funciones.titulo")}</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FUNCIONES.map((f) => (
              <div key={f.clave} className="rounded-ng-lg border border-white/10 bg-ng-superficie/50 p-5">
                <div className="flex items-center justify-between">
                  <f.icono size={20} className="text-ng-celeste" aria-hidden />
                  {f.pronto && (
                    <span className="rounded-full bg-ng-violeta/15 px-2 py-0.5 text-[11px] font-medium text-ng-lila">{t("prontoEtiqueta")}</span>
                  )}
                </div>
                <h3 className="mt-3 font-semibold">{t(`funciones.items.${f.clave}.titulo`)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ng-secundario">{t(`funciones.items.${f.clave}.texto`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Equipo ---- */}
      <section className="border-t border-white/5 bg-ng-fondo">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("equipo.titulo")}</h2>
            <p className="mt-4 leading-relaxed text-ng-secundario">{t("equipo.texto")}</p>
            <ul className="mt-6 space-y-2 text-sm">
              {EQUIPO_PUNTOS.map((clave) => (
                <li key={clave} className="flex items-center gap-2">
                  <Check size={16} className="text-ng-teal" aria-hidden /> {t(`equipo.puntos.${clave}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-ng-xl border border-white/10 bg-ng-tarjeta p-5">
            {EQUIPO_EJEMPLO.map(({ ini, nombre, clave, tono }) => (
              <div key={nombre} className="flex items-center gap-3 border-b border-white/5 py-3 last:border-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-ng-elevada text-sm font-semibold">
                  {ini}
                </span>
                <span className="flex-1 text-sm font-medium">{nombre}</span>
                <span className={`text-xs ${tono}`}>{t(`equipo.ejemplo.${clave}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- La app ---- */}
      <section className="border-t border-white/5">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-ng-celeste">{t("app.etiqueta")}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{t("app.titulo")}</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-ng-secundario">{t("app.texto")}</p>
            <Link href="/app" className="mt-6 inline-block rounded-ng-md border border-white/15 bg-white/5 px-5 py-2.5 font-semibold hover:bg-white/10">
              {t("app.verLaApp")}
            </Link>
          </div>
          <MaquetaTelefono />
        </div>
      </section>

      {/* ---- Precios ---- */}
      <section id="precios" className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">{t("precios.titulo")}</h2>
          <p className="mt-3 text-center text-ng-secundario">{t("precios.subtitulo")}</p>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {PLANES.map((plan) => {
              const nombre = t(`precios.planes.${plan.clave}.nombre`);
              return (
                <div
                  key={plan.clave}
                  className={`relative rounded-ng-xl border p-7 ${
                    plan.destacado ? "border-ng-azul/60 bg-ng-tarjeta brillo-marca" : "border-white/10 bg-ng-superficie/60"
                  }`}
                >
                  {plan.destacado && (
                    <span className="absolute -top-3 left-7 rounded-full bg-marca px-3 py-1 text-xs font-semibold text-ng-tinta">
                      {t("precios.paraEquipos")}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold">{nombre}</h3>
                  <p className="mt-1 text-sm text-ng-secundario">{t(`precios.planes.${plan.clave}.para`)}</p>
                  <p className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-bold tracking-tight">${plan.precio}</span>
                    <span className="text-ng-tenue">{t("precios.porMes")}</span>
                  </p>
                  <ul className="mt-6 space-y-2.5 text-sm">
                    {plan.incluye.map((i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check size={16} className="mt-0.5 shrink-0 text-ng-teal" aria-hidden /> {t(`precios.incluye.${i}`)}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={ENLACE_EMPEZAR}
                    className={`mt-8 block rounded-ng-md py-3 text-center font-semibold ${
                      plan.destacado ? "bg-marca text-ng-tinta hover:brightness-110" : "border border-white/15 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {t("precios.empezarCon", { plan: nombre })}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- Preguntas ---- */}
      <section className="border-t border-white/5 bg-ng-fondo">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <h2 className="text-3xl font-bold tracking-tight">{t("preguntas.titulo")}</h2>
          <div className="mt-8 divide-y divide-white/10 rounded-ng-xl border border-white/10 bg-ng-tarjeta">
            {PREGUNTAS.map((q) => (
              <details key={q} className="group p-5">
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {t(`preguntas.items.${q}.p`)}
                    <span className="text-ng-tenue transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ng-secundario">{t(`preguntas.items.${q}.r`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Cierre ---- */}
      <section className="relative overflow-hidden border-t border-white/5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{ background: "transparent" }}
        />
        <div className="relative mx-auto max-w-3xl px-5 py-24 text-center">
          <LogoNG tamano={56} soloIcono />
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-5xl">{t("cierre")}</h2>
          <Link href={ENLACE_EMPEZAR} className="mt-8 inline-block rounded-ng-md bg-marca px-8 py-3.5 font-semibold text-ng-tinta brillo-marca hover:brightness-110">
            {t("empezar")}
          </Link>
        </div>
      </section>

      <Pie />
    </div>
  );
}
