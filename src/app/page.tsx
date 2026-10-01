import type { Metadata } from "next";
import Link from "next/link";
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
  Send,
  Smartphone,
  Sparkles,
  Type,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { LogoNG } from "@/components/LogoNG";
import { Cabecera, ENLACE_EMPEZAR, Pie } from "@/components/landing/Marco";
import { MaquetaTelefono } from "@/components/landing/MaquetaTelefono";
import { MaquetaProducto } from "@/components/landing/MaquetaProducto";
import { RedirigirSiHaySesion } from "@/components/landing/RedirigirSiHaySesion";

export const metadata: Metadata = {
  title: { absolute: "NG Creator — De tu podcast a clips publicados en TikTok, Reels, Shorts y Facebook" },
  description:
    "El flujo completo en un solo lugar: subí el episodio, se transcribe solo, la IA encuentra los mejores momentos, tu equipo los edita con subtítulos y los aprueba, y los publicás en todas tus redes. Web y app para iPhone y Android.",
  alternates: { canonical: "/" },
};

/** El camino completo, del archivo a las redes: es lo que se vende. */
const PASOS: { icono: LucideIcon; titulo: string; texto: string }[] = [
  {
    icono: Upload,
    titulo: "Subís el episodio",
    texto: "El video completo, de una o tres horas, directo desde el navegador. Si se corta internet, sigue donde quedó.",
  },
  {
    icono: AudioLines,
    titulo: "Se transcribe solo",
    texto: "Cada palabra con su segundo exacto. Es la base de los cortes y de los subtítulos.",
  },
  {
    icono: Sparkles,
    titulo: "La IA encuentra los momentos",
    texto: "Propone los clips que se entienden solos, con su potencial viral y el porqué.",
  },
  {
    icono: Crop,
    titulo: "Editás en minutos",
    texto: "Vertical, dividido, subtítulos con la palabra resaltada y textos con diseño. Lo que ves es lo que sale.",
  },
  {
    icono: Users,
    titulo: "Tu equipo revisa y aprueba",
    texto: "Cada uno trabaja su clip y nada sale sin que una persona lo apruebe.",
  },
  {
    icono: Send,
    titulo: "Publicás en todas tus redes",
    texto: "Desde aquí mismo, a la hora que elijas. Sin descargar el video ni entrar red por red.",
  },
];

/** Dónde se publica. `hoy` es lo que ya funciona; el resto está en camino (#64). */
const REDES: { nombre: string; hoy: boolean }[] = [
  { nombre: "Facebook", hoy: true },
  { nombre: "Instagram", hoy: false },
  { nombre: "TikTok", hoy: false },
  { nombre: "YouTube", hoy: false },
];

/** Lo que hoy hace falta para lo mismo, sin NG Creator. */
const ANTES = [
  "Pasar el archivo de dos horas por Drive o WeTransfer",
  "Ver el episodio entero buscando los momentos",
  "Cortar en Premiere o CapCut",
  "Otra app para los subtítulos",
  "Mandar los clips a un grupo de WhatsApp para que los aprueben",
  "Descargar y subir red por red",
];

const FUNCIONES: { icono: LucideIcon; titulo: string; texto: string; pronto?: boolean }[] = [
  { icono: AudioLines, titulo: "Transcripción con tiempos", texto: "Cada palabra en su segundo exacto, en episodios de horas." },
  { icono: Sparkles, titulo: "Momentos con IA", texto: "Hasta 15 clips por episodio, ordenados por potencial viral." },
  { icono: Crop, titulo: "Recorte arrastrable", texto: "Mové y agrandá el encuadre sobre el cuadro entero, y cambialo a mitad del clip." },
  { icono: LayoutPanelTop, titulo: "Diseño dividido", texto: "Dos recuadros apilados para que entren los cuatro de la mesa." },
  { icono: Captions, titulo: "Subtítulos que se leen", texto: "Grandes, con la palabra que se dice resaltada. Corregí una palabra sin tocar tiempos." },
  { icono: Type, titulo: "Textos con diseño", texto: "Hasta cuatro por clip, con contorno, sombra o caja, y palabras destacadas." },
  { icono: Download, titulo: "MP4 listo para redes", texto: "1080×1920 en H.264, procesado en la nube. Descargalo o publicalo." },
  { icono: Smartphone, titulo: "App para iPhone y Android", texto: "Revisá los clips que encontró la IA desde el celular." },
  { icono: ListChecks, titulo: "Revisión en equipo", texto: "Asignar, editar, enviar a revisión y aprobar.", pronto: true },
  { icono: CalendarClock, titulo: "Publicar y programar", texto: "Facebook hoy; Instagram, TikTok y YouTube en camino, todo desde el mismo lugar." },
];

const PLANES = [
  {
    nombre: "Creador",
    precio: "19.99",
    para: "Para quien hace su podcast solo.",
    incluye: [
      "1 persona",
      "1 marca",
      "Hasta 12 episodios al mes (~3 por semana)",
      "Episodios de hasta 3 horas",
      "Clips y exportaciones ilimitados",
      "Editor completo y app para iPhone y Android",
    ],
    destacado: false,
  },
  {
    nombre: "Equipo",
    precio: "49.99",
    para: "Para el podcast con productor, editores y redes.",
    incluye: [
      "Hasta 5 personas, con roles",
      "1 marca",
      "Hasta 16 episodios al mes (~4 por semana)",
      "Episodios de hasta 3 horas",
      "Clips y exportaciones ilimitados",
      "Revisión y aprobación en equipo (pronto)",
    ],
    destacado: true,
  },
];

const PREGUNTAS = [
  {
    p: "¿Cómo convierto mi podcast en clips para TikTok, Reels y Shorts?",
    r: "Subís el video del episodio. NG Creator lo transcribe, la IA marca los momentos que se entienden solos y cada uno se abre en el editor ya en vertical 9:16, con subtítulos. Ajustás el encuadre y el texto, y bajás el MP4.",
  },
  {
    p: "¿Cuánto tardo en sacar clips de un episodio?",
    r: "La transcripción y los momentos de un episodio de dos horas están en unos minutos. Después, cada clip se ajusta en uno o dos minutos: el encuadre, los subtítulos y el gancho ya vienen armados.",
  },
  {
    p: "¿Tengo que descargar el episodio para editar?",
    r: "No. El original queda en la nube; la edición y el render pasan en nuestros servidores. Solo bajás el MP4 terminado, si querés.",
  },
  {
    p: "¿Pone subtítulos automáticos?",
    r: "Sí. Salen de la transcripción palabra por palabra, grandes y con la palabra que se está diciendo resaltada. Si alguna palabra quedó mal, la corregís sin tocar los tiempos.",
  },
  {
    p: "¿Hay app para el celular?",
    r: "Sí, para iPhone y Android, con la misma cuenta de la web. Hoy sirve para ver los episodios y revisar los clips que encontró la IA; la edición desde el teléfono viene en camino.",
  },
  {
    p: "¿En qué idioma funciona?",
    r: "Está pensado para podcasts en español: la transcripción, los momentos y los subtítulos.",
  },
  {
    p: "¿Qué pasa si la IA elige un momento flojo?",
    r: "Nada sale sin que una persona lo apruebe. La IA propone con un puntaje y el porqué; ustedes deciden, y también pueden armar clips a mano desde la transcripción.",
  },
  {
    p: "¿Qué cuenta como episodio?",
    r: "Cada video largo que subís. De un episodio salen todos los clips que quieras, sin límite.",
  },
];

/** Para Google: qué es, en qué corre y cuánto cuesta, y las preguntas como FAQ. */
const DATOS_ESTRUCTURADOS = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "NG Creator",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web, iOS, Android",
    inLanguage: "es",
    description: "Convertí episodios de podcast en clips verticales con subtítulos para TikTok, Reels y Shorts. La IA encuentra los mejores momentos y tu equipo los edita y publica.",
    offers: PLANES.map((p) => ({ "@type": "Offer", name: p.nombre, price: p.precio, priceCurrency: "USD" })),
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PREGUNTAS.map((q) => ({ "@type": "Question", name: q.p, acceptedAnswer: { "@type": "Answer", text: q.r } })),
  },
];

export default function Producto() {
  return (
    <div className="min-h-screen bg-ng-hondo text-ng-texto">
      <RedirigirSiHaySesion />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(DATOS_ESTRUCTURADOS) }} />

      <Cabecera />

      {/* ---- Portada ---- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 opacity-60 blur-3xl"
          style={{ background: "radial-gradient(ellipse at top, rgba(59,130,246,0.22), rgba(139,92,246,0.10) 40%, transparent 70%)" }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ng-secundario">
              <Sparkles size={13} className="text-ng-celeste" aria-hidden /> Del podcast a tus redes, en un solo lugar
            </p>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
              Subí el episodio. <span className="texto-marca">Publicá los clips.</span> Todo en un solo lugar.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ng-secundario">
              NG Creator hace el camino completo: transcribe tu podcast, la IA encuentra los mejores momentos, tu equipo
              los edita en vertical con subtítulos y los aprueba, y los publicás en tus redes desde aquí. Sin descargar nada y sin saltar entre cinco programas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={ENLACE_EMPEZAR} className="rounded-ng-md bg-marca px-6 py-3 text-base font-semibold text-white brillo-marca hover:brightness-110">
                Empezar
              </Link>
              <a href="#como" className="rounded-ng-md border border-white/15 bg-white/5 px-6 py-3 text-base font-semibold hover:bg-white/10">
                Ver cómo funciona
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
          <p className="text-xs uppercase tracking-[0.22em] text-ng-celeste">El flujo completo</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Del archivo de dos horas a los clips publicados, sin salir de aquí
          </h2>
          <ol className="relative mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PASOS.map((p, i) => {
              const ultimo = i === PASOS.length - 1;
              return (
                <li
                  key={p.titulo}
                  className={`relative rounded-ng-xl border p-5 ${ultimo ? "border-ng-azul/50 bg-ng-tarjeta brillo-marca" : "border-white/10 bg-ng-tarjeta"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-marca text-sm font-bold text-white">{i + 1}</span>
                    <p.icono size={18} className="text-ng-celeste" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{p.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ng-secundario">{p.texto}</p>
                  {ultimo && (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {REDES.map((r) => (
                        <li
                          key={r.nombre}
                          className={`rounded-full border px-2.5 py-1 text-xs ${r.hoy ? "border-ng-teal/40 bg-ng-teal/10 text-ng-teal" : "border-white/10 text-ng-secundario"}`}
                        >
                          {r.nombre}
                          {!r.hoy && <span className="ml-1 text-ng-lila">· pronto</span>}
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

      {/* ---- Antes y ahora ---- */}
      <section className="border-t border-white/5">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-20 lg:grid-cols-2">
          <div className="rounded-ng-xl border border-white/10 bg-ng-superficie/40 p-7">
            <p className="text-sm font-semibold text-ng-tenue">Hoy, sin NG Creator</p>
            <p className="mt-1 text-2xl font-bold">Seis herramientas y una tarde por episodio</p>
            <ul className="mt-6 space-y-3 text-sm text-ng-secundario">
              {ANTES.map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <X size={16} className="mt-0.5 shrink-0 text-red-400/80" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-ng-xl border border-ng-azul/50 bg-ng-tarjeta p-7 brillo-marca">
            <p className="text-sm font-semibold text-ng-celeste">Con NG Creator</p>
            <p className="mt-1 text-2xl font-bold">Una pestaña, de principio a fin</p>
            <ul className="mt-6 space-y-3 text-sm">
              {PASOS.map((p) => (
                <li key={p.titulo} className="flex items-start gap-2.5">
                  <Check size={16} className="mt-0.5 shrink-0 text-ng-teal" aria-hidden /> {p.titulo}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---- Qué hace ---- */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Todo lo que necesita un clip</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FUNCIONES.map((f) => (
              <div key={f.titulo} className="rounded-ng-lg border border-white/10 bg-ng-superficie/50 p-5">
                <div className="flex items-center justify-between">
                  <f.icono size={20} className="text-ng-celeste" aria-hidden />
                  {f.pronto && (
                    <span className="rounded-full bg-ng-violeta/15 px-2 py-0.5 text-[11px] font-medium text-ng-lila">Pronto</span>
                  )}
                </div>
                <h3 className="mt-3 font-semibold">{f.titulo}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ng-secundario">{f.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Equipo ---- */}
      <section className="border-t border-white/5 bg-ng-fondo">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Hecho para trabajar en equipo</h2>
            <p className="mt-4 leading-relaxed text-ng-secundario">
              El productor sube, los editores arman los clips, alguien los aprueba y salen. Cada persona entra con su
              cuenta y su rol, y cada marca tiene su espacio: nadie ve lo que no le toca.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {["Roles por marca: dueño, editor, lector", "Varias marcas en una misma cuenta", "Web y app con la misma cuenta"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check size={16} className="text-ng-teal" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-ng-xl border border-white/10 bg-ng-tarjeta p-5">
            {[
              ["A", "Ana", "Dueña · sube el episodio", "text-ng-celeste"],
              ["L", "Luis", "Editando el clip #4", "text-ng-teal"],
              ["C", "Carla", "Aprobó 3 clips", "text-ng-lila"],
            ].map(([ini, nombre, estado, tono]) => (
              <div key={nombre} className="flex items-center gap-3 border-b border-white/5 py-3 last:border-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-ng-elevada text-sm font-semibold">
                  {ini}
                </span>
                <span className="flex-1 text-sm font-medium">{nombre}</span>
                <span className={`text-xs ${tono}`}>{estado}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- La app ---- */}
      <section className="border-t border-white/5">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-ng-celeste">iPhone y Android</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Tus clips, también en el bolsillo</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-ng-secundario">
              La misma cuenta en la web y en el celular. Mirá cómo va cada episodio, revisá los clips que propuso la IA con
              su puntaje y lo que se dice en cada uno, y decidí cuáles salen desde donde estés.
            </p>
            <Link href="/app" className="mt-6 inline-block rounded-ng-md border border-white/15 bg-white/5 px-5 py-2.5 font-semibold hover:bg-white/10">
              Ver la app
            </Link>
          </div>
          <MaquetaTelefono />
        </div>
      </section>

      {/* ---- Precios ---- */}
      <section id="precios" className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Precios simples</h2>
          <p className="mt-3 text-center text-ng-secundario">En dólares, por mes. Cancelás cuando quieras.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {PLANES.map((plan) => (
              <div
                key={plan.nombre}
                className={`relative rounded-ng-xl border p-7 ${
                  plan.destacado ? "border-ng-azul/60 bg-ng-tarjeta brillo-marca" : "border-white/10 bg-ng-superficie/60"
                }`}
              >
                {plan.destacado && (
                  <span className="absolute -top-3 left-7 rounded-full bg-marca px-3 py-1 text-xs font-semibold text-white">
                    Para equipos
                  </span>
                )}
                <h3 className="text-lg font-semibold">{plan.nombre}</h3>
                <p className="mt-1 text-sm text-ng-secundario">{plan.para}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tight">${plan.precio}</span>
                  <span className="text-ng-tenue">/mes</span>
                </p>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {plan.incluye.map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 shrink-0 text-ng-teal" aria-hidden /> {i}
                    </li>
                  ))}
                </ul>
                <Link
                  href={ENLACE_EMPEZAR}
                  className={`mt-8 block rounded-ng-md py-3 text-center font-semibold ${
                    plan.destacado ? "bg-marca text-white hover:brightness-110" : "border border-white/15 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  Empezar con {plan.nombre}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Preguntas ---- */}
      <section className="border-t border-white/5 bg-ng-fondo">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <h2 className="text-3xl font-bold tracking-tight">Preguntas</h2>
          <div className="mt-8 divide-y divide-white/10 rounded-ng-xl border border-white/10 bg-ng-tarjeta">
            {PREGUNTAS.map((q) => (
              <details key={q.p} className="group p-5">
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {q.p}
                    <span className="text-ng-tenue transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ng-secundario">{q.r}</p>
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
          style={{ background: "radial-gradient(ellipse at center, rgba(59,130,246,0.18), transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-3xl px-5 py-24 text-center">
          <LogoNG tamano={56} soloIcono />
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-5xl">Subí un episodio. Salí con diez clips.</h2>
          <Link href={ENLACE_EMPEZAR} className="mt-8 inline-block rounded-ng-md bg-marca px-8 py-3.5 font-semibold text-white brillo-marca hover:brightness-110">
            Empezar
          </Link>
        </div>
      </section>

      <Pie />
    </div>
  );
}
