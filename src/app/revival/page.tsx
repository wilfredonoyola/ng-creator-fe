"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  ESTADO_POR_ANIO,
  HISTORIAL_DE_PAGINA,
  RESUMEN_HISTORIAL,
  SINCRONIZAR_ANIO,
} from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { usePaginaActiva } from "@/lib/pagina-activa";

type Orden = "SCORE" | "FECHA";

interface EstadoAnio {
  anio: number;
  posts: number;
  sincronizadoEn?: string | null;
  completo: boolean;
}

interface PostHistorial {
  _id: string;
  mensaje?: string | null;
  tipo: "IMAGEN" | "VIDEO" | "ENLACE" | "TEXTO" | "OTRO";
  permalink?: string | null;
  imagenUrl?: string | null;
  publicadoEn: string;
  reacciones: number;
  comentarios: number;
  compartidos: number;
  reproducciones?: number | null;
  clics?: number | null;
  score: number;
}

const ICONO_TIPO: Record<PostHistorial["tipo"], string> = {
  IMAGEN: "🖼️",
  VIDEO: "🎬",
  ENLACE: "🔗",
  TEXTO: "📝",
  OTRO: "❓",
};

/**
 * Historial de la fan page rankeado por rendimiento.
 *
 * Se sincroniza un año por vez: el historial completo son decenas de miles de
 * publicaciones, y una corrida única que se corta a la mitad no deja nada
 * aprovechable. La grilla de años muestra qué se trajo y qué falta.
 */
export default function RevivalPage() {
  const { activa } = usePaginaActiva();
  const [orden, setOrden] = useState<Orden>("SCORE");
  const [anioFiltro, setAnioFiltro] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [sincronizandoAnio, setSincronizandoAnio] = useState<number | null>(null);

  const pageId = activa?.pageId;

  const { data, loading, refetch } = useQuery(HISTORIAL_DE_PAGINA, {
    variables: { pageId, orden, limite: 100, anio: anioFiltro },
    skip: !pageId,
  });

  const { data: dataAnios, refetch: refetchAnios } = useQuery(ESTADO_POR_ANIO, {
    variables: { pageId },
    skip: !pageId,
  });

  const { data: dataResumen, refetch: refetchResumen } = useQuery(
    RESUMEN_HISTORIAL,
    { variables: { pageId }, skip: !pageId },
  );

  const [sincronizar] = useMutation(SINCRONIZAR_ANIO, {
    onCompleted: (res) => {
      const r = res.sincronizarAnio;
      setSincronizandoAnio(null);
      setAviso(
        `${r.anio}: ${r.posts} publicaciones` +
          (r.completo ? "" : " · quedó contenido sin traer, volvé a sincronizar"),
      );
      refetch();
      refetchAnios();
      refetchResumen();
    },
    onError: (err) => {
      setSincronizandoAnio(null);
      setAviso(`Error: ${err.message}`);
    },
  });

  const posts: PostHistorial[] = data?.historialDePagina ?? [];
  const anios: EstadoAnio[] = dataAnios?.estadoPorAnio ?? [];
  const resumen = dataResumen?.resumenHistorial;

  const numero = (n: number) => n.toLocaleString("es");
  const fecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  function lanzarSync(anio: number) {
    setAviso(null);
    setSincronizandoAnio(anio);
    sincronizar({ variables: { pageId, anio } });
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Revival</h1>
        <p className="mt-1 text-white/50">
          Las publicaciones que mejor funcionaron en{" "}
          {activa ? activa.nombre : "tu fan page"}
        </p>
        <p className="mt-1 text-xs text-white/30">
          {resumen?.total
            ? `${numero(resumen.total)} publicaciones guardadas`
            : "Todavía no se sincronizó ningún año"}
        </p>
      </div>

      {aviso && (
        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          {aviso}
        </div>
      )}

      {!pageId ? (
        <Vacio
          icono="🔗"
          titulo="Sin página de Facebook habilitada"
          detalle="Un admin tiene que conectar y habilitar una página en Integraciones."
        />
      ) : (
        <>
          {/* Grilla de años */}
          <div className="mb-8">
            <h2 className="mb-3 text-xs uppercase tracking-wider text-white/40">
              Sincronizar por año
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {anios.map((a) => {
                const activo = sincronizandoAnio === a.anio;
                const seleccionado = anioFiltro === a.anio;
                return (
                  <div
                    key={a.anio}
                    className={`rounded-xl border p-3 transition ${
                      seleccionado
                        ? "border-[#0FED9D]/50 bg-[#0FED9D]/5"
                        : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() =>
                          setAnioFiltro(seleccionado ? null : a.anio)
                        }
                        disabled={!a.posts}
                        className="text-left text-lg font-bold disabled:cursor-default disabled:text-white/30"
                      >
                        {a.anio}
                      </button>
                      <button
                        onClick={() => lanzarSync(a.anio)}
                        disabled={sincronizandoAnio !== null}
                        title={`Sincronizar ${a.anio}`}
                        className="rounded-md px-2 py-1 text-xs text-white/50 transition hover:bg-white/10 hover:text-[#0FED9D] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        {activo ? (
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#0FED9D] border-t-transparent" />
                        ) : (
                          "↻"
                        )}
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-white/50">
                      {a.posts ? `${numero(a.posts)} posts` : "sin datos"}
                    </p>
                    <p className="text-[10px] text-white/25">
                      {activo
                        ? "trayendo…"
                        : a.sincronizadoEn
                          ? new Date(a.sincronizadoEn).toLocaleDateString("es", {
                              day: "numeric",
                              month: "short",
                            })
                          : "nunca"}
                      {!a.completo && (
                        <span className="text-amber-400/70"> · incompleto</span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-white/25">
              Un año activo tarda alrededor de un minuto. Clic en el número para
              filtrar la tabla; en ↻ para traerlo de Meta.
            </p>
          </div>

          {/* Aviso de métricas de insights */}
          {resumen && resumen.total > 0 && resumen.conMetricas === 0 && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/80">
              Sin reproducciones ni clics: falta el permiso{" "}
              <code>read_insights</code>. Meta acepta la llamada igual y responde
              vacío, por eso no ves un error. El ranking funciona sin eso — usa
              reacciones, comentarios y compartidos, que miden a todos los posts
              con la misma vara.
            </div>
          )}

          {/* Filtros */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(
              [
                ["SCORE", "Mejor rendimiento"],
                ["FECHA", "Más recientes"],
              ] as const
            ).map(([valor, etiqueta]) => (
              <button
                key={valor}
                onClick={() => setOrden(valor)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  orden === valor
                    ? "bg-[#0FED9D]/10 text-[#0FED9D]"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                {etiqueta}
              </button>
            ))}
            {anioFiltro && (
              <button
                onClick={() => setAnioFiltro(null)}
                className="ml-auto rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10"
              >
                Filtrando {anioFiltro} · quitar ✕
              </button>
            )}
          </div>

          {/* Tabla */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0FED9D] border-t-transparent" />
            </div>
          ) : posts.length === 0 ? (
            <Vacio
              icono="♻️"
              titulo={anioFiltro ? `Sin datos de ${anioFiltro}` : "Historial vacío"}
              detalle="Sincronizá un año con el botón ↻ de la grilla de arriba."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/40">
                  <tr>
                    <th className="px-4 py-3 font-medium">Publicación</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 text-right font-medium">Reacc.</th>
                    <th className="px-4 py-3 text-right font-medium">Coment.</th>
                    <th className="px-4 py-3 text-right font-medium">Comp.</th>
                    <th className="px-4 py-3 text-right font-medium">Repro.</th>
                    <th className="px-4 py-3 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {posts.map((p) => (
                    <tr key={p._id} className="transition hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.imagenUrl ? (
                            // URL del CDN de Facebook: next/image exigiría declarar
                            // el dominio y estas URLs además caducan.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.imagenUrl}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/5">
                              {ICONO_TIPO[p.tipo]}
                            </div>
                          )}
                          <div className="min-w-0 max-w-md">
                            <p className="truncate text-white/80">
                              {p.mensaje || (
                                <span className="text-white/30">Sin texto</span>
                              )}
                            </p>
                            <p className="text-xs text-white/30">
                              {ICONO_TIPO[p.tipo]} {p.tipo.toLowerCase()}
                              {p.permalink && (
                                <>
                                  {" · "}
                                  <a
                                    href={p.permalink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-[#0FED9D]"
                                  >
                                    ver en Facebook
                                  </a>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-white/50">
                        {fecha(p.publicadoEn)}
                      </td>
                      <td className="px-4 py-3 text-right text-white/70">
                        {numero(p.reacciones)}
                      </td>
                      <td className="px-4 py-3 text-right text-white/70">
                        {numero(p.comentarios)}
                      </td>
                      <td className="px-4 py-3 text-right text-white/70">
                        {numero(p.compartidos)}
                      </td>
                      <td className="px-4 py-3 text-right text-white/50">
                        {p.reproducciones != null
                          ? numero(p.reproducciones)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#0FED9D]">
                        {numero(p.score)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

function Vacio({
  icono,
  titulo,
  detalle,
}: {
  icono: string;
  titulo: string;
  detalle: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
      <div className="mb-4 text-5xl opacity-30">{icono}</div>
      <p className="text-lg font-medium text-white/60">{titulo}</p>
      <p className="mt-1 text-sm text-white/40">{detalle}</p>
    </div>
  );
}
