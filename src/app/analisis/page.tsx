"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import { ANALISIS_PAGINA } from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BarrasRendimiento } from "@/components/analisis/BarrasRendimiento";
import { colorDePagina, usePaginaActiva } from "@/lib/pagina-activa";
import {
  DIAS,
  DIAS_CORTOS,
  etiquetaHora,
  mejorTramo,
  umbralDeMuestra,
  variacion,
  type Tramo,
} from "@/lib/analitica";

const PERIODOS = [
  { id: 7, etiqueta: "7 días" },
  { id: 28, etiqueta: "28 días" },
  { id: 90, etiqueta: "90 días" },
  { id: 0, etiqueta: "Todo el historial" },
];

const ETIQUETA_TIPO: Record<string, string> = {
  IMAGEN: "Imagen",
  VIDEO: "Video",
  ENLACE: "Enlace",
  TEXTO: "Texto",
  OTRO: "Otro",
};

/**
 * Qué y cuándo conviene publicar, según el historial de la página.
 *
 * Trabaja sobre el historial que Revival ya sincronizó, no sobre la API de
 * Meta: además de ser inmediato, en junio de 2026 Meta dio de baja buena parte
 * de las métricas de Page Insights, así que apoyarse en ellas sería construir
 * sobre algo que ya se rompió una vez.
 */
export default function AnalisisPage() {
  const { activa, cargando: cargandoPagina } = usePaginaActiva();
  const [dias, setDias] = useState(0);

  // La zona del navegador: es la que usa quien lee para pensar en horarios.
  const zonaHoraria =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  const { data, loading } = useQuery(ANALISIS_PAGINA, {
    variables: {
      pageId: activa?.pageId,
      zonaHoraria,
      desdeDias: dias || null,
      dias: dias || 28,
    },
    skip: !activa,
    errorPolicy: "all",
  });

  if (!cargandoPagina && !activa) {
    return (
      <DashboardLayout>
        <Aviso
          titulo="No hay ninguna página activa"
          detalle="El análisis es del historial de una página. Elegí una en el switch de la izquierda."
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
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Análisis</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/50">
          <span>Qué y cuándo conviene publicar en</span>
          {activa && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-white/80">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: colorDePagina(activa.pageId) }}
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
            key={p.id}
            onClick={() => setDias(p.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              dias === p.id
                ? "bg-[#0FED9D] text-black"
                : "border border-white/10 text-white/60 hover:bg-white/5"
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {sinHistorial ? (
        <Aviso
          titulo="Esta página no tiene historial sincronizado"
          detalle="El análisis se arma con las publicaciones que ya trajimos de Facebook. Sincronizá algún año desde Revival y volvé."
        />
      ) : (
        <div className="space-y-4">
          {/* El resumen no es un gráfico: son cifras con su cambio. */}
          {resumen && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Cifra
                titulo={`Publicaciones · ${resumen.dias}d`}
                valor={resumen.posts}
                cambio={variacion(resumen.posts, resumen.postsAnterior)}
              />
              <Cifra
                titulo="Score promedio"
                valor={Math.round(resumen.scorePromedio)}
                cambio={variacion(
                  resumen.scorePromedio,
                  resumen.scorePromedioAnterior,
                )}
              />
              <Cifra titulo="Reacciones" valor={resumen.reacciones} />
              <Cifra titulo="Comentarios" valor={resumen.comentarios} />
            </div>
          )}

          {/* La conclusión antes que los gráficos: es lo que se viene a buscar. */}
          {(mejorHora || mejorDia) && (
            <div className="rounded-2xl border border-[#0FED9D]/25 bg-[#0FED9D]/[0.04] p-5">
              <h2 className="text-sm font-semibold text-[#0FED9D]">
                Lo que dice tu historial
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-white/70">
                {mejorHora && (
                  <li>
                    Tu mejor hora es alrededor de las{" "}
                    <strong>{etiquetaHora(mejorHora.clave)}</strong>, sobre{" "}
                    {mejorHora.posts} publicaciones.
                  </li>
                )}
                {mejorDia && (
                  <li>
                    El mejor día es el <strong>{DIAS[mejorDia.clave]}</strong>,
                    sobre {mejorDia.posts} publicaciones.
                  </li>
                )}
                {tipos.length > 0 && (
                  <li>
                    El formato que mejor rinde es{" "}
                    <strong>
                      {ETIQUETA_TIPO[tipos[0].tipo] ?? tipos[0].tipo}
                    </strong>
                    , sobre {tipos[0].posts} publicaciones.
                  </li>
                )}
              </ul>
              <p className="mt-2 text-[11px] text-white/35">
                Solo se consideran tramos con muestra suficiente. Las horas con
                pocas publicaciones quedan afuera aunque tengan mejor promedio.
              </p>
            </div>
          )}

          <BarrasRendimiento
            titulo="Por hora del día"
            descripcion={`Score promedio de cada hora, en tu zona horaria (${zonaHoraria}).`}
            tramos={horas}
            etiqueta={(h) => String(h).padStart(2, "0")}
          />

          <BarrasRendimiento
            titulo="Por día de la semana"
            descripcion="Score promedio según el día en que salió la publicación."
            tramos={diasSemana}
            etiqueta={(d) => DIAS_CORTOS[d] ?? String(d)}
          />

          {tipos.length > 0 && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="text-sm font-semibold">Por tipo de contenido</h2>
              <p className="mt-0.5 text-xs text-white/35">
                Ordenado por score promedio.
              </p>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-white/30">
                    <th className="pb-1 font-medium">Tipo</th>
                    <th className="pb-1 text-right font-medium">Posts</th>
                    <th className="pb-1 text-right font-medium">Score prom.</th>
                  </tr>
                </thead>
                <tbody>
                  {tipos.map((t: { tipo: string; posts: number; scorePromedio: number }) => (
                    <tr key={t.tipo} className="border-t border-white/5">
                      <td className="py-1.5">
                        {ETIQUETA_TIPO[t.tipo] ?? t.tipo}
                      </td>
                      <td className="py-1.5 text-right text-white/50">
                        {t.posts.toLocaleString("es")}
                      </td>
                      <td className="py-1.5 text-right">
                        {Math.round(t.scorePromedio).toLocaleString("es")}
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
              Ver los números en tabla
            </summary>
            <TablaTramos
              titulo="Por hora"
              tramos={horas}
              etiqueta={etiquetaHora}
            />
            <TablaTramos
              titulo="Por día"
              tramos={diasSemana}
              etiqueta={(d) => DIAS[d] ?? String(d)}
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
            <th className="pb-1 font-medium">Tramo</th>
            <th className="pb-1 text-right font-medium">Posts</th>
            <th className="pb-1 text-right font-medium">Score prom.</th>
          </tr>
        </thead>
        <tbody>
          {tramos.map((t) => (
            <tr key={t.clave} className="border-t border-white/5">
              <td className="py-1">{etiqueta(t.clave)}</td>
              <td className="py-1 text-right text-white/50">
                {t.posts}
                {t.posts < umbral && (
                  <span className="ml-1 text-amber-400/70">·</span>
                )}
              </td>
              <td className="py-1 text-right">
                {Math.round(t.scorePromedio).toLocaleString("es")}
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
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[11px] uppercase tracking-wider text-white/30">
        {titulo}
      </p>
      <p className="mt-1 text-2xl font-bold">{valor.toLocaleString("es")}</p>
      {cambio != null && (
        <p
          className={`mt-0.5 text-xs ${
            cambio >= 0 ? "text-[#0FED9D]" : "text-red-400"
          }`}
        >
          {cambio >= 0 ? "▲" : "▼"} {Math.abs(cambio).toFixed(0)}% vs período
          anterior
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
