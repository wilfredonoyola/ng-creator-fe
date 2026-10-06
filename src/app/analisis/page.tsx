"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { ANALISIS_PAGINA } from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PestanasPublicaciones } from "@/components/PestanasPublicaciones";
import { BarrasRendimiento } from "@/components/analisis/BarrasRendimiento";
import { colorDeMarca, useMarcaActiva } from "@/lib/marca-activa";
import {
  etiquetaHora,
  mejorTramo,
  umbralDeMuestra,
  variacion,
  type Tramo,
} from "@/lib/analitica";

/** Días hacia atrás; 0 es todo el historial. La etiqueta: `periodos.<id>`. */
const PERIODOS = [7, 28, 90, 0] as const;

/** Los tipos con nombre propio (`tipos.<clave>`); otro se muestra tal cual. */
const TIPOS = ["IMAGEN", "VIDEO", "ENLACE", "TEXTO", "OTRO"] as const;
type Tipo = (typeof TIPOS)[number];
const esTipo = (t: string): t is Tipo => (TIPOS as readonly string[]).includes(t);

/** Los días llegan del 1 (domingo) al 7 (sábado). */
const DIAS_SEMANA = ["1", "2", "3", "4", "5", "6", "7"] as const;
type DiaSemana = (typeof DIAS_SEMANA)[number];
const esDia = (d: string): d is DiaSemana => (DIAS_SEMANA as readonly string[]).includes(d);

/**
 * Qué y cuándo conviene publicar, según el historial de la página.
 *
 * Trabaja sobre el historial de Facebook ya sincronizado, no sobre la API de
 * Meta: además de ser inmediato, en junio de 2026 Meta dio de baja buena parte
 * de las métricas de Page Insights, así que apoyarse en ellas sería construir
 * sobre algo que ya se rompió una vez.
 */
export default function AnalisisPage() {
  const t = useTranslations("analisis");
  const locale = useLocale();
  const nombreTipo = (tipo: string) => (esTipo(tipo) ? t(`tipos.${tipo}`) : tipo);
  const nombreDia = (d: number) => (esDia(String(d)) ? t(`dias.${String(d) as DiaSemana}`) : String(d));
  const diaCorto = (d: number) => (esDia(String(d)) ? t(`diasCortos.${String(d) as DiaSemana}`) : String(d));
  const { activa, cargando: cargandoPagina } = useMarcaActiva();
  // El análisis es del historial de la página de Facebook de la marca.
  const pageId = activa?.paginaFacebook?.pageId;
  const [dias, setDias] = useState(0);

  // La zona del navegador: es la que usa quien lee para pensar en horarios.
  const zonaHoraria =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  const { data, loading } = useQuery(ANALISIS_PAGINA, {
    variables: {
      pageId,
      zonaHoraria,
      desdeDias: dias || null,
      dias: dias || 28,
    },
    skip: !pageId,
    errorPolicy: "all",
  });

  if (!cargandoPagina && !pageId) {
    return (
      <DashboardLayout>
        <PestanasPublicaciones />
        <Aviso
          titulo={t("sinPagina.titulo")}
          detalle={t("sinPagina.detalle")}
        />
      </DashboardLayout>
    );
  }

  const horas: Tramo[] = data?.rendimientoPorHora ?? [];
  const diasSemana: Tramo[] = data?.rendimientoPorDiaSemana ?? [];
  const tipos = data?.rendimientoPorTipo ?? [];
  const resumen = data?.resumenDePeriodo;

  const mejorHora = mejorTramo(horas, umbralDeMuestra(horas));
  const mejorDia = mejorTramo(diasSemana, umbralDeMuestra(diasSemana));

  const sinHistorial = !loading && !horas.length;

  return (
    <DashboardLayout>
      <PestanasPublicaciones />
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{t("titulo")}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/50">
          <span>{t("subtitulo")}</span>
          {activa && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-white/80">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: colorDeMarca(activa) }}
              />
              {activa.nombre}
            </span>
          )}
        </p>
      </div>

      {/* Los filtros van en una fila, arriba de todo lo que afectan. */}
      <div className="mb-5 flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p}
            onClick={() => setDias(p)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              dias === p
                ? "bg-marca text-ng-tinta"
                : "border border-white/10 text-white/60 hover:bg-white/5"
            }`}
          >
            {t(`periodos.${p}`)}
          </button>
        ))}
      </div>

      {sinHistorial ? (
        <Aviso
          titulo={t("sinHistorial.titulo")}
          detalle={t("sinHistorial.detalle")}
        />
      ) : (
        <div className="space-y-4">
          {/* El resumen no es un gráfico: son cifras con su cambio. */}
          {resumen && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Cifra
                titulo={t("cifras.publicaciones", { dias: resumen.dias })}
                valor={resumen.posts}
                cambio={variacion(resumen.posts, resumen.postsAnterior)}
              />
              <Cifra
                titulo={t("cifras.scorePromedio")}
                valor={Math.round(resumen.scorePromedio)}
                cambio={variacion(
                  resumen.scorePromedio,
                  resumen.scorePromedioAnterior,
                )}
              />
              <Cifra titulo={t("cifras.reacciones")} valor={resumen.reacciones} />
              <Cifra titulo={t("cifras.comentarios")} valor={resumen.comentarios} />
            </div>
          )}

          {/* La conclusión antes que los gráficos: es lo que se viene a buscar. */}
          {(mejorHora || mejorDia) && (
            <div className="rounded-2xl border border-ng-azul/25 bg-ng-teal/[0.04] p-5">
              <h2 className="text-sm font-semibold text-ng-teal">
                {t("conclusion.titulo")}
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-white/70">
                {mejorHora && (
                  <li>
                    {t.rich("conclusion.hora", {
                      hora: etiquetaHora(mejorHora.clave),
                      n: mejorHora.posts,
                      b: (c) => <strong>{c}</strong>,
                    })}
                  </li>
                )}
                {mejorDia && (
                  <li>
                    {t.rich("conclusion.dia", {
                      dia: nombreDia(mejorDia.clave),
                      n: mejorDia.posts,
                      b: (c) => <strong>{c}</strong>,
                    })}
                  </li>
                )}
                {tipos.length > 0 && (
                  <li>
                    {t.rich("conclusion.formato", {
                      tipo: nombreTipo(tipos[0].tipo),
                      n: tipos[0].posts,
                      b: (c) => <strong>{c}</strong>,
                    })}
                  </li>
                )}
              </ul>
              <p className="mt-2 text-[11px] text-white/35">
                {t("conclusion.nota")}
              </p>
            </div>
          )}

          <BarrasRendimiento
            titulo={t("porHora.titulo")}
            descripcion={t("porHora.descripcion", { zona: zonaHoraria })}
            tramos={horas}
            etiqueta={(h) => String(h).padStart(2, "0")}
          />

          <BarrasRendimiento
            titulo={t("porDia.titulo")}
            descripcion={t("porDia.descripcion")}
            tramos={diasSemana}
            etiqueta={diaCorto}
          />

          {tipos.length > 0 && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="text-sm font-semibold">{t("porTipo.titulo")}</h2>
              <p className="mt-0.5 text-xs text-white/35">
                {t("porTipo.descripcion")}
              </p>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-white/30">
                    <th className="pb-1 font-medium">{t("columnas.tipo")}</th>
                    <th className="pb-1 text-right font-medium">{t("columnas.posts")}</th>
                    <th className="pb-1 text-right font-medium">{t("columnas.score")}</th>
                  </tr>
                </thead>
                <tbody>
                  {tipos.map((tp: { tipo: string; posts: number; scorePromedio: number }) => (
                    <tr key={tp.tipo} className="border-t border-white/5">
                      <td className="py-1.5">
                        {nombreTipo(tp.tipo)}
                      </td>
                      <td className="py-1.5 text-right text-white/50">
                        {tp.posts.toLocaleString(locale)}
                      </td>
                      <td className="py-1.5 text-right">
                        {Math.round(tp.scorePromedio).toLocaleString(locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Vista de tabla: lo exige el contraste del estado apagado, y de paso
              es la salida para quien no puede leer el gráfico. */}
          <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <summary className="cursor-pointer text-sm font-semibold">
              {t("verTabla")}
            </summary>
            <TablaTramos
              titulo={t("tablaHora")}
              tramos={horas}
              etiqueta={etiquetaHora}
            />
            <TablaTramos
              titulo={t("tablaDia")}
              tramos={diasSemana}
              etiqueta={nombreDia}
            />
          </details>
        </div>
      )}
    </DashboardLayout>
  );
}

function TablaTramos({
  titulo,
  tramos,
  etiqueta,
}: {
  titulo: string;
  tramos: Tramo[];
  etiqueta: (clave: number) => string;
}) {
  const t = useTranslations("analisis");
  const locale = useLocale();
  if (!tramos.length) return null;
  const umbral = umbralDeMuestra(tramos);
  return (
    <div className="mt-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-white/35">
        {titulo}
      </h3>
      <table className="mt-1.5 w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-white/25">
            <th className="pb-1 font-medium">{t("columnas.tramo")}</th>
            <th className="pb-1 text-right font-medium">{t("columnas.posts")}</th>
            <th className="pb-1 text-right font-medium">{t("columnas.score")}</th>
          </tr>
        </thead>
        <tbody>
          {tramos.map((tr) => (
            <tr key={tr.clave} className="border-t border-white/5">
              <td className="py-1">{etiqueta(tr.clave)}</td>
              <td className="py-1 text-right text-white/50">
                {tr.posts}
                {tr.posts < umbral && (
                  <span className="ml-1 text-amber-400/70">·</span>
                )}
              </td>
              <td className="py-1 text-right">
                {Math.round(tr.scorePromedio).toLocaleString(locale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cifra({
  titulo,
  valor,
  cambio,
}: {
  titulo: string;
  valor: number;
  cambio?: number | null;
}) {
  const t = useTranslations("analisis");
  const locale = useLocale();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[11px] uppercase tracking-wider text-white/30">
        {titulo}
      </p>
      <p className="mt-1 text-2xl font-bold">{valor.toLocaleString(locale)}</p>
      {cambio != null && (
        <p
          className={`mt-0.5 text-xs ${
            cambio >= 0 ? "text-ng-teal" : "text-red-400"
          }`}
        >
          {t("cifras.vsAnterior", {
            flecha: cambio >= 0 ? "▲" : "▼",
            porcentaje: Math.abs(cambio).toFixed(0),
          })}
        </p>
      )}
    </div>
  );
}

function Aviso({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
      <div className="mb-3 text-4xl opacity-30">📊</div>
      <p className="font-medium text-white/70">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-white/40">{detalle}</p>
    </div>
  );
}
