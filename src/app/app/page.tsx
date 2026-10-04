import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  Captions,
  Cloud,
  Crop,
  Film,
  KeyRound,
  ListChecks,
  MessageSquareText,
  Scissors,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Cabecera, ENLACE_EMPEZAR, Pie } from "@/components/landing/Marco";
import { MaquetaTelefono } from "@/components/landing/MaquetaTelefono";

export const metadata: Metadata = {
  title: { absolute: "App para editar clips de podcast desde el celular — NG Creator" },
  description:
    "La app de NG Creator para iPhone y Android: revisá los clips que la IA encontró en tu podcast, con su potencial viral y lo que se dice, y editalos rápido desde el teléfono.",
  alternates: { canonical: "/app" },
};

const HOY: { icono: LucideIcon; titulo: string; texto: string }[] = [
  { icono: Film, titulo: "Tus episodios y cómo van", texto: "Cada episodio con su estado: subiendo, transcribiendo o con los clips listos." },
  { icono: Sparkles, titulo: "Los clips que encontró la IA", texto: "Ordenados por potencial viral, con el motivo de cada uno: humor, emoción, polémica." },
  { icono: MessageSquareText, titulo: "Lo que se dice", texto: "La transcripción de cada clip debajo del video, para decidir sin darle play." },
  { icono: Captions, titulo: "El clip en vertical", texto: "Reproducilo tal como va a salir en TikTok, Reels y Shorts." },
  { icono: KeyRound, titulo: "Una sola cuenta", texto: "La misma de la web. Lo que editás en la compu se ve en el teléfono." },
];

const PRONTO: { icono: LucideIcon; titulo: string; texto: string }[] = [
  { icono: Scissors, titulo: "Recortar pegado a las palabras", texto: "El corte cae justo donde termina la frase, sin buscar el cuadro exacto." },
  { icono: Crop, titulo: "Formato, zoom y posición", texto: "9:16, 1:1 o 16:9, con el encuadre sobre quien está hablando." },
  { icono: Captions, titulo: "Subtítulos y gancho", texto: "Corregí una palabra o cambiá el texto de arriba con el dedo." },
  { icono: Cloud, titulo: "Render en la nube", texto: "El MP4 se arma en nuestros servidores: no gasta tu batería ni tus datos." },
  { icono: ListChecks, titulo: "Revisar y aprobar en equipo", texto: "Aprobá o pedí cambios en los clips de tus editores desde donde estés." },
  { icono: Bell, titulo: "Avisos", texto: "Te avisa cuando un episodio ya tiene sus clips o cuando alguien te pide revisar uno." },
];

const PREGUNTAS = [
  {
    p: "¿Se puede editar un podcast desde el celular?",
    r: "Sí: el trabajo pesado (transcribir, buscar los momentos y armar el MP4) pasa en la nube, así que el teléfono solo muestra y ajusta. Por eso anda fluido aunque el episodio dure dos horas.",
  },
  {
    p: "¿Es para iPhone o para Android?",
    r: "Para los dos, con la misma cuenta de la web.",
  },
  {
    p: "¿La app tiene otro precio?",
    r: "No. Viene incluida en los planes Creador y Equipo; el plan se maneja desde la web.",
  },
];

export default function PaginaApp() {
  return (
    <div className="min-h-screen bg-ng-hondo text-ng-texto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: PREGUNTAS.map((q) => ({ "@type": "Question", name: q.p, acceptedAnswer: { "@type": "Answer", text: q.r } })),
          }),
        }}
      />
      <Cabecera />

      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-16 lg:grid-cols-[1fr_auto] lg:pt-24">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-ng-celeste">App para iPhone y Android</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
              Editá los clips de tu podcast <span className="texto-marca">desde el celular</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ng-secundario">
              La IA ya encontró los mejores momentos del episodio. Revisalos en el teléfono, con su potencial viral y lo que
              se dice en cada uno, y decidí cuáles salen a TikTok, Reels y Shorts. Rápido, desde donde estés.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={ENLACE_EMPEZAR} className="rounded-ng-md bg-marca px-6 py-3 font-semibold text-ng-tinta brillo-marca hover:brightness-110">
                Empezar
              </Link>
              <span className="text-sm text-ng-tenue">Pronto en App Store y Google Play</span>
            </div>
          </div>
          <div className="flex justify-center gap-5">
            <MaquetaTelefono pantalla="episodios" className="hidden sm:block sm:translate-y-8" />
            <MaquetaTelefono pantalla="clip" />
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-ng-fondo">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Lo que ya hace</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HOY.map((f) => (
              <Tarjeta key={f.titulo} {...f} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Lo que viene</h2>
            <span className="rounded-full bg-ng-violeta/15 px-2.5 py-0.5 text-xs font-medium text-ng-lila">Pronto</span>
          </div>
          <p className="mt-3 max-w-2xl text-ng-secundario">El editor de la web, pensado para el dedo.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRONTO.map((f) => (
              <Tarjeta key={f.titulo} {...f} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-ng-fondo">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <h2 className="text-3xl font-bold tracking-tight">Por qué editar rápido importa</h2>
          <div className="mt-5 space-y-4 leading-relaxed text-ng-secundario">
            <p>
              Un episodio de podcast rinde en redes el día que sale, no una semana después. Buscar los momentos a mano en
              dos horas de video, recortarlos en otro programa, ponerles subtítulos y exportarlos se come una tarde entera
              por episodio.
            </p>
            <p>
              Con NG Creator esa parte ya está hecha cuando abrís la app: el episodio transcrito, los momentos marcados y
              cada clip armado en vertical. Lo que queda es lo que necesita a una persona: elegir, ajustar y aprobar.
            </p>
          </div>
          <div className="mt-12 divide-y divide-white/10 rounded-ng-xl border border-white/10 bg-ng-tarjeta">
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
          <div className="mt-12 text-center">
            <Link href="/#precios" className="rounded-ng-md bg-marca px-8 py-3.5 font-semibold text-ng-tinta brillo-marca hover:brightness-110">
              Ver planes
            </Link>
          </div>
        </div>
      </section>

      <Pie />
    </div>
  );
}

function Tarjeta({ icono: Icono, titulo, texto }: { icono: LucideIcon; titulo: string; texto: string }) {
  return (
    <div className="rounded-ng-lg border border-white/10 bg-ng-superficie/50 p-5">
      <Icono size={20} className="text-ng-celeste" aria-hidden />
      <h3 className="mt-3 font-semibold">{titulo}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ng-secundario">{texto}</p>
    </div>
  );
}
