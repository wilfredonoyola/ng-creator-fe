"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { RESUMEN_METRICAS } from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { IconoRed, Poster } from "@/components/IconoRed";
import { BarrasGrupos } from "@/components/metricas/BarrasGrupos";
import { BarrasHora } from "@/components/metricas/BarrasHora";
import { ExportarMetricas } from "@/components/metricas/ExportarMetricas";
import { colorDeMarca, useMarcaActiva } from "@/lib/marca-activa";
import { esMotivo } from "@/lib/momentos";
import { etiquetaHora } from "@/lib/analitica";
import { REDES } from "@/lib/publicaciones";
import { tiempoRelativo } from "@/lib/time";
import {
  PERIODOS_METRICAS,
  PERIODO_INICIAL,
  RANGOS_PUNTUACION,
  cambioPorcentual,
  compacto,
  mejorGrupo,
  numero,
  porcentaje,
  zonaDelNavegador,
  type ClipConMetricas,
  type ResumenMetricas,
} from "@/lib/metricas";

type Rango = (typeof RANGOS_PUNTUACION)[number];
const esRango = (c: string): c is Rango => (RANGOS_PUNTUACION as readonly string[]).includes(c);

/**
 * Cómo le fue a lo que la marca publicó (ng-creator-be#119): el resumen del
 * período, cada red, los clips que más y menos rindieron, y lo que eso dice
 * de qué conviene sacar y cuándo.
 *
 * Es de lo que salió desde Clipfine, en todas las redes. El análisis de la
 * página de Facebook (/analisis) sigue aparte: mira el historial entero de la
 * página, también lo que no salió de acá.
 */
export default function MetricasPage() {
  const t = useTranslations("metricas");
  const tMotivo = useTranslations("episodiosMotivos");
  const locale = useLocale();
  const { activa, cargando: cargandoMarca } = useMarcaActiva();
  const [dias, setDias] = useState<number>(PERIODO_INICIAL);
  const zonaHoraria = zonaDelNavegador();

  const { data, loading, error } = useQuery(RESUMEN_METRICAS, {
    variables: { marcaId: activa?._id, dias, zonaHoraria },
    skip: !activa,
    errorPolicy: "all",
  });
  const r: ResumenMetricas | undefined = data?.resumenMetricas;

  if (!cargandoMarca && !activa) {
    return (
      <DashboardLayout>
        <Aviso titulo={t("sinMarca.titulo")} detalle={t("sinMarca.detalle")} />
      </DashboardLayout>
    );
  }

  const nombreMotivo = (c: string) => (esMotivo(c) ? tMotivo(c) : c);
  const nombreRango = (c: string) => (esRango(c) ? t(`rangos.${c}`) : c);
  const sinPublicaciones = r && r.totales.publicaciones === 0;
  const sinLecturas = r && !sinPublicaciones && r.totales.vistas == null && r.mejores.length === 0;

  const mejorMotivo = r ? mejorGrupo(r.porMotivo) : null;
  const mejorHora = r ? mejorGrupo(r.porHora) : null;
  const seguidoresCambio = r ? sumaDe(r.porRed.map((x) => x.seguidoresCambio)) : null;

  return (
    <DashboardLayout>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("titulo")}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/50">
            <span>{t("subtitulo")}</span>
            {activa && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-white/80">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorDeMarca(activa) }} />
                {activa.nombre}
              </span>
            )}
          </p>
          {r?.actualizadoEn && (
            <p className="mt-1 text-xs text-white/35">
              {t("actualizado", { cuando: tiempoRelativo(r.actualizadoEn, undefined, locale) })}
            </p>
          )}
        </div>
        {/* La acción principal: llevarse los números (el PDF es el reporte para el cliente). */}
        <ExportarMetricas marcaId={activa?._id} dias={dias} />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {PERIODOS_METRICAS.map((p) => (
          <button
            key={p}
            onClick={() => setDias(p)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              dias === p ? "bg-marca text-ng-tinta" : "border border-white/10 text-white/60 hover:bg-white/5"
            }`}
          >
            {t("periodo", { n: p })}
          </button>
        ))}
        <Link href="/analisis" className="ml-auto text-xs text-white/40 hover:text-white/70">
          {t("irAnalisis")}
        </Link>
      </div>

      {loading && !r ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : !r ? (
        <Aviso titulo={t("error.titulo")} detalle={error?.message ?? t("error.detalle")} />
      ) : sinPublicaciones ? (
        <Aviso titulo={t("vacio.titulo", { dias })} detalle={t("vacio.detalle")}>
          <Link href="/episodios" className="mt-4 inline-block text-sm text-ng-celeste hover:underline">
            {t("vacio.irEpisodios")}
          </Link>
        </Aviso>
      ) : sinLecturas ? (
        <Aviso titulo={t("sinLecturas.titulo")} detalle={t("sinLecturas.detalle")} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Cifra
              titulo={t("cifras.vistas")}
              valor={compacto(r.totales.vistas, locale)}
              cambio={cambioPorcentual(r.totales.vistas, r.anterior.vistas)}
            />
            <Cifra
              titulo={t("cifras.interacciones")}
              valor={compacto(r.totales.interacciones, locale)}
              cambio={cambioPorcentual(r.totales.interacciones, r.anterior.interacciones)}
            />
            <Cifra
              titulo={t("cifras.tasa")}
              valor={porcentaje(r.totales.tasaInteraccion, locale)}
              puntos={
                r.totales.tasaInteraccion != null && r.anterior.tasaInteraccion != null
                  ? (r.totales.tasaInteraccion - r.anterior.tasaInteraccion) * 100
                  : null
              }
            />
            <Cifra
              titulo={t("cifras.seguidores")}
              valor={numero(r.totales.seguidoresGanados ?? seguidoresCambio, locale)}
              cambio={cambioPorcentual(r.totales.seguidoresGanados, r.anterior.seguidoresGanados)}
            />
            <Cifra
              titulo={t("cifras.clips")}
              valor={numero(r.clips, locale)}
              detalle={t("cifras.publicaciones", { n: r.totales.publicaciones })}
              cambio={cambioPorcentual(r.totales.publicaciones, r.anterior.publicaciones)}
            />
          </div>

          {/* La conclusión antes que los gráficos, como en el análisis. */}
          {(mejorMotivo || mejorHora) && (
            <div className="rounded-2xl border border-ng-azul/25 p-5">
              <h2 className="text-sm font-semibold texto-marca">{t("conclusion.titulo")}</h2>
              <ul className="mt-2 space-y-1 text-sm text-white/70">
                {mejorMotivo && (
                  <li>
                    {t.rich("conclusion.motivo", {
                      motivo: nombreMotivo(mejorMotivo.clave),
                      vistas: compacto(mejorMotivo.vistasPromedio, locale),
                      n: mejorMotivo.clips,
                      b: (c) => <strong>{c}</strong>,
                    })}
                  </li>
                )}
                {mejorHora && (
                  <li>
                    {t.rich("conclusion.hora", {
                      hora: etiquetaHora(Number(mejorHora.clave)),
                      n: mejorHora.clips,
                      b: (c) => <strong>{c}</strong>,
                    })}
                  </li>
                )}
              </ul>
            </div>
          )}

          {r.porRed.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {r.porRed.map((red) => (
                <div key={red.red} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2">
                    <IconoRed red={red.red} chico />
                    <p className="text-sm font-semibold">{REDES[red.red]?.nombre ?? red.red}</p>
                    <span className="ml-auto text-[11px] text-white/35">
                      {t("redes.publicaciones", { n: red.totales.publicaciones })}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-white/35">{t("redes.vistas")}</dt>
                      <dd className="text-base font-semibold tabular-nums">{compacto(red.totales.vistas, locale)}</dd>
                    </div>
                    <div>
                      <dt className="text-white/35">{t("redes.interacciones")}</dt>
                      <dd className="text-base font-semibold tabular-nums">
                        {compacto(red.totales.interacciones, locale)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-white/35">{t("redes.seguidores")}</dt>
                      <dd className="text-base font-semibold tabular-nums">{compacto(red.seguidores, locale)}</dd>
                      {red.seguidoresCambio != null && red.seguidoresCambio !== 0 && (
                        <dd className={`tabular-nums ${red.seguidoresCambio > 0 ? "text-ng-teal" : "text-red-400"}`}>
                          {red.seguidoresCambio > 0 ? "+" : ""}
                          {numero(red.seguidoresCambio, locale)}
                        </dd>
                      )}
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          )}

          <Ranking titulo={t("mejores.titulo")} detalle={t("mejores.detalle")} clips={r.mejores} />
          {r.peores.length > 0 && (
            <Ranking titulo={t("peores.titulo")} detalle={t("peores.detalle")} clips={r.peores} />
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <BarrasGrupos
              titulo={t("porMotivo.titulo")}
              descripcion={t("porMotivo.descripcion")}
              grupos={r.porMotivo}
              etiqueta={nombreMotivo}
            />
            <BarrasGrupos
              titulo={t("porPuntuacion.titulo")}
              descripcion={t("porPuntuacion.descripcion")}
              grupos={r.porPuntuacion}
              etiqueta={nombreRango}
            />
          </div>

          <BarrasHora
            titulo={t("porHora.titulo")}
            descripcion={t("porHora.descripcion", { zona: zonaHoraria })}
            grupos={r.porHora}
          />
        </div>
      )}
    </DashboardLayout>
  );
}

/** Los clips de un ranking, cada uno con su página de métricas. */
function Ranking({ titulo, detalle, clips }: { titulo: string; detalle: string; clips: ClipConMetricas[] }) {
  const t = useTranslations("metricas");
  const tMotivo = useTranslations("episodiosMotivos");
  const locale = useLocale();
  if (!clips.length) return null;
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="text-sm font-semibold">{titulo}</h2>
      <p className="mt-0.5 text-xs text-white/35">{detalle}</p>
      <ol className="mt-3 space-y-2">
        {clips.map((c, i) => (
          <li key={c.clipId}>
            <Link
              href={`/metricas/clips/${c.clipId}`}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2 transition hover:border-ng-azul/40"
            >
              <span className="w-5 shrink-0 text-right text-sm tabular-nums text-white/30">{i + 1}</span>
              <Poster url={c.urlPoster} className="h-16 w-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.titulo ?? t("sinTitulo")}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-white/50">
                  {c.origen === "MANUAL" ? (
                    <span className="rounded-full bg-white/10 px-2 py-0.5">{t("hechoAMano")}</span>
                  ) : (
                    c.motivo && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5">
                        {esMotivo(c.motivo) ? tMotivo(c.motivo) : c.motivo}
                      </span>
                    )
                  )}
                  {c.redes.map((red) => (
                    <IconoRed key={red} red={red} tamano="h-4 w-4 text-[8px]" />
                  ))}
                </div>
              </div>
              {/* La IA al lado de lo que pasó: es la comparación que interesa. */}
              <div className="shrink-0 text-right">
                <p className="text-base font-bold tabular-nums">{compacto(c.totales.vistas, locale)}</p>
                <p className="text-[11px] text-white/40">{t("vistas")}</p>
                {c.puntuacion != null && c.origen !== "MANUAL" && (
                  <p className="mt-0.5 text-[11px] tabular-nums texto-marca">{t("ia", { n: c.puntuacion })}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Cifra({
  titulo,
  valor,
  cambio,
  puntos,
  detalle,
}: {
  titulo: string;
  valor: string;
  /** Variación porcentual contra el período anterior. */
  cambio?: number | null;
  /** Para una tasa: la diferencia en puntos, no en porcentaje de porcentaje. */
  puntos?: number | null;
  detalle?: string;
}) {
  const t = useTranslations("metricas");
  const locale = useLocale();
  const delta = cambio ?? puntos;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[11px] uppercase tracking-wider text-white/30">{titulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{valor}</p>
      {detalle && <p className="text-[11px] text-white/40">{detalle}</p>}
      {delta != null && Number.isFinite(delta) && (
        <p className={`mt-0.5 text-xs ${delta >= 0 ? "text-ng-teal" : "text-red-400"}`}>
          {t(cambio != null ? "cifras.vsAnterior" : "cifras.vsAnteriorPuntos", {
            flecha: delta >= 0 ? "▲" : "▼",
            valor: Math.abs(delta).toLocaleString(locale, { maximumFractionDigits: cambio != null ? 0 : 1 }),
          })}
        </p>
      )}
    </div>
  );
}

function Aviso({ titulo, detalle, children }: { titulo: string; detalle: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
      <div className="mb-3 text-4xl opacity-30">📈</div>
      <p className="font-medium text-white/70">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-white/40">{detalle}</p>
      {children}
    </div>
  );
}

/** La suma de lo que hay; null si no hay nada. */
function sumaDe(valores: (number | null | undefined)[]): number | null {
  const hay = valores.filter((v): v is number => v != null);
  return hay.length ? hay.reduce((a, b) => a + b, 0) : null;
}
