import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landingApp");
  return {
    title: { absolute: t("meta.titulo") },
    description: t("meta.descripcion"),
    alternates: { canonical: "/app" },
  };
}

const HOY = [
  { clave: "episodios", icono: Film },
  { clave: "clips", icono: Sparkles },
  { clave: "loQueSeDice", icono: MessageSquareText },
  { clave: "vertical", icono: Captions },
  { clave: "cuenta", icono: KeyRound },
] as const satisfies readonly { clave: string; icono: LucideIcon }[];

const PRONTO = [
  { clave: "recortar", icono: Scissors },
  { clave: "formato", icono: Crop },
  { clave: "subtitulos", icono: Captions },
  { clave: "render", icono: Cloud },
  { clave: "revisar", icono: ListChecks },
  { clave: "avisos", icono: Bell },
] as const satisfies readonly { clave: string; icono: LucideIcon }[];

const PREGUNTAS = ["editar", "plataformas", "precio"] as const;

export default function PaginaApp() {
  const t = useTranslations("landingApp");
  return (
    <div className="min-h-screen bg-ng-hondo text-ng-texto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: PREGUNTAS.map((q) => ({
              "@type": "Question",
              name: t(`preguntas.${q}.p`),
              acceptedAnswer: { "@type": "Answer", text: t(`preguntas.${q}.r`) },
            })),
          }),
        }}
      />
      <Cabecera />

      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-16 lg:grid-cols-[1fr_auto] lg:pt-24">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-ng-celeste">{t("portada.etiqueta")}</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
              {t.rich("portada.titulo", { marca: (c) => <span className="texto-marca">{c}</span> })}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ng-secundario">{t("portada.texto")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={ENLACE_EMPEZAR} className="rounded-ng-md bg-marca px-6 py-3 font-semibold text-ng-tinta brillo-marca hover:brightness-110">
                {t("portada.empezar")}
              </Link>
              <span className="text-sm text-ng-tenue">{t("portada.tiendas")}</span>
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
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("loQueYaHace")}</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HOY.map((f) => (
              <Tarjeta key={f.clave} icono={f.icono} titulo={t(`hoy.${f.clave}.titulo`)} texto={t(`hoy.${f.clave}.texto`)} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("loQueViene")}</h2>
            <span className="rounded-full bg-ng-violeta/15 px-2.5 py-0.5 text-xs font-medium text-ng-lila">{t("prontoEtiqueta")}</span>
          </div>
          <p className="mt-3 max-w-2xl text-ng-secundario">{t("loQueVieneTexto")}</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRONTO.map((f) => (
              <Tarjeta key={f.clave} icono={f.icono} titulo={t(`pronto.${f.clave}.titulo`)} texto={t(`pronto.${f.clave}.texto`)} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-ng-fondo">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <h2 className="text-3xl font-bold tracking-tight">{t("porQue.titulo")}</h2>
          <div className="mt-5 space-y-4 leading-relaxed text-ng-secundario">
            <p>{t("porQue.p1")}</p>
            <p>{t("porQue.p2")}</p>
          </div>
          <div className="mt-12 divide-y divide-white/10 rounded-ng-xl border border-white/10 bg-ng-tarjeta">
            {PREGUNTAS.map((q) => (
              <details key={q} className="group p-5">
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {t(`preguntas.${q}.p`)}
                    <span className="text-ng-tenue transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ng-secundario">{t(`preguntas.${q}.r`)}</p>
              </details>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/#precios" className="rounded-ng-md bg-marca px-8 py-3.5 font-semibold text-ng-tinta brillo-marca hover:brightness-110">
              {t("verPlanes")}
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
