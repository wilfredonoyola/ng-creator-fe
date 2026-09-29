import type { Metadata } from "next";
import Link from "next/link";
import {
  AudioLines,
  Captions,
  Check,
  Crop,
  Download,
  LayoutPanelTop,
  ListChecks,
  Mic,
  Send,
  Smartphone,
  Sparkles,
  Type,
  Users,
  type LucideIcon,
} from "lucide-react";
import { LogoNG } from "@/components/LogoNG";
import { MaquetaProducto } from "@/components/landing/MaquetaProducto";
import { RedirigirSiHaySesion } from "@/components/landing/RedirigirSiHaySesion";

export const metadata: Metadata = {
  title: "NG Creator — De tu podcast a clips listos para publicar",
  description:
    "Subí el episodio completo. La IA encuentra los mejores momentos, tu equipo los edita en vertical con subtítulos y los publica. Create. Share. Grow.",
};

/**
 * A dónde lleva "Empezar". Hoy al ingreso (las cuentas se crean por
 * invitación); cuando exista el cobro, al checkout. Un solo lugar para cambiarlo.
 */
const ENLACE_EMPEZAR = "/login";

const PASOS: { icono: LucideIcon; titulo: string; texto: string }[] = [
  {
    icono: Mic,
    titulo: "Subí el episodio",
    texto: "El video completo, de una o dos horas. Se sube por partes: si se corta internet, sigue desde donde quedó.",
  },
  {
    icono: Sparkles,
    titulo: "La IA encuentra los momentos",
    texto: "Transcribe palabra por palabra y propone los clips que se entienden solos, con un puntaje y el porqué.",
  },
  {
    icono: Crop,
    titulo: "Editá en minutos",
    texto: "Vertical, dividido, subtítulos con la palabra resaltada, textos con diseño. Lo que ves es lo que sale.",
  },
  {
    icono: Users,
    titulo: "Tu equipo revisa y publica",
    texto: "Cada uno trabaja su clip sin pisar al otro, y lo que sale ya pasó por una persona.",
  },
];

const FUNCIONES: { icono: LucideIcon; titulo: string; texto: string; pronto?: boolean }[] = [
  { icono: AudioLines, titulo: "Transcripción con tiempos", texto: "Cada palabra en su segundo exacto, en episodios de horas." },
  { icono: Sparkles, titulo: "Momentos con IA", texto: "Hasta 15 clips por episodio, ordenados por potencial viral." },
  { icono: Crop, titulo: "Recorte arrastrable", texto: "Mové y agrandá el encuadre sobre el cuadro entero, y cambialo a mitad del clip." },
  { icono: LayoutPanelTop, titulo: "Diseño dividido", texto: "Dos recuadros apilados para que entren los cuatro de la mesa." },
  { icono: Captions, titulo: "Subtítulos que se leen", texto: "Grandes, con la palabra que se dice resaltada. Corregí una palabra sin tocar tiempos." },
  { icono: Type, titulo: "Textos con diseño", texto: "Hasta cuatro por clip, con contorno, sombra o caja, y palabras destacadas." },
  { icono: Download, titulo: "MP4 listo para redes", texto: "1080×1920 en H.264, procesado en la nube. Descargalo o publicalo." },
  { icono: Smartphone, titulo: "App para iPhone", texto: "Revisá episodios y clips desde el teléfono." },
  { icono: ListChecks, titulo: "Revisión en equipo", texto: "Asignar, editar, enviar a revisión y aprobar.", pronto: true },
  { icono: Send, titulo: "Publicar en todas las redes", texto: "TikTok, Instagram, YouTube y Facebook, programado.", pronto: true },
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
      "Editor completo y app para iPhone",
    ],
    destacado: false,
  },
  {
    nombre: "Equipo",
    precio: "49.99",
    para: "Para el podcast con productor, editores y redes.",
    incluye: [
      "Hasta 5 personas, con roles",
      "Hasta 3 marcas",
      "Hasta 30 episodios al mes",
      "Episodios de hasta 3 horas",
      "Clips y exportaciones ilimitados",
      "Revisión y aprobación en equipo (pronto)",
    ],
    destacado: true,
  },
];

const PREGUNTAS = [
  {
    p: "¿Tengo que descargar el episodio para editar?",
    r: "No. El original queda en la nube; la edición y el render pasan en nuestros servidores. Solo bajás el MP4 terminado, si querés.",
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

export default function Producto() {
  return (
    <div className="min-h-screen bg-ng-hondo text-ng-texto">
      <RedirigirSiHaySesion />

      {/* ---- Cabecera ---- */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ng-hondo/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" aria-label="NG Creator, inicio">
            <LogoNG tamano={30} />
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <a href="#como" className="hidden text-ng-secundario hover:text-white sm:inline">Cómo funciona</a>
            <a href="#precios" className="hidden text-ng-secundario hover:text-white sm:inline">Precios</a>
            <Link href="/login" className="text-ng-secundario hover:text-white">Entrar</Link>
            <Link href={ENLACE_EMPEZAR} className="rounded-ng-md bg-marca px-4 py-2 font-semibold text-white brillo-marca hover:brightness-110">
              Empezar
            </Link>
          </nav>
        </div>
      </header>

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
              <Sparkles size={13} className="text-ng-celeste" aria-hidden /> Para podcasts en video
            </p>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
              Del episodio completo a <span className="texto-marca">clips que se comparten</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ng-secundario">
              Subís el podcast una vez. La IA encuentra los mejores momentos, tu equipo los edita en vertical con
              subtítulos, y salen listos para TikTok, Reels y Shorts. Sin descargar nada.
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

      {/* ---- Cómo funciona ---- */}
      <section id="como" className="border-t border-white/5 bg-ng-fondo">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Un episodio. Diez clips. Una tarde.</h2>
          <p className="mt-3 max-w-2xl text-ng-secundario">
            Lo que antes era bajar el video, buscar el momento, cortar en otro programa y exportar a mano, acá es un
            solo lugar.
          </p>
          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="rounded-ng-xl border border-white/10 bg-ng-tarjeta p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ng-azul/15 text-ng-celeste">
                    <p.icono size={18} aria-hidden />
                  </span>
                  <span className="text-xs text-ng-tenue">Paso {i + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold">{p.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ng-secundario">{p.texto}</p>
              </li>
            ))}
          </ol>
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

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-ng-tenue">
          <LogoNG tamano={22} />
          <div className="flex gap-5">
            <Link href="/privacidad" className="hover:text-white">Privacidad</Link>
            <Link href="/terminos" className="hover:text-white">Términos</Link>
            <Link href="/login" className="hover:text-white">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
