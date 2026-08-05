"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  HISTORIAL_DE_PAGINA,
  RESUMEN_HISTORIAL,
  SINCRONIZAR_HISTORIAL,
} from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { usePaginaActiva } from "@/lib/pagina-activa";

type Orden = "SCORE" | "FECHA";

interface PostHistorial {
  _id: string;
  postId: string;
  mensaje?: string | null;
  tipo: "IMAGEN" | "VIDEO" | "ENLACE" | "TEXTO" | "OTRO";
  permalink?: string | null;
  imagenUrl?: string | null;
  publicadoEn: string;
  reacciones: number;
  comentarios: number;
  compartidos: number;
  alcance?: number | null;
  impresiones?: number | null;
  score: number;
}

const ICONO_TIPO: Record<PostHistorial["tipo"], string> = {
  IMAGEN: "🖼️",
  VIDEO: "🎬",
  ENLACE: "🔗",
  TEXTO: "📝",
  OTRO: "❓",
};

/** Cuantos posts pedirle a Meta en cada sincronizacion. */
const MAXIMO_SINCRONIZACION = 200;

/**
 * Historial de la fan page rankeado por rendimiento.
 *
 * Primera mitad del reciclaje de contenido: ver que publicaciones funcionaron
 * mejor para despues decidir cuales vale la pena reversionar.
 */
export default function RevivalPage() {
  const { activa } = usePaginaActiva();
  const [orden, setOrden] = useState<Orden>("SCORE");
  const [aviso, setAviso] = useState<string | null>(null);

  const pageId = activa?.pageId;

  const { data, loading, refetch } = useQuery(HISTORIAL_DE_PAGINA, {
    variables: { pageId, orden, limite: 100 },
    skip: !pageId,
  });

  const { data: dataResumen, refetch: refetchResumen } = useQuery(
    RESUMEN_HISTORIAL,
    { variables: { pageId }, skip: !pageId },
  );

  const [sincronizar, { loading: sincronizando }] = useMutation(
    SINCRONIZAR_HISTORIAL,
    {
      onCompleted: (res) => {
        const r = res.sincronizarHistorial;
        setAviso(
          `${r.total} publicaciones (${r.nuevos} nuevas)` +
            (r.conAlcance === 0
              ? " · sin datos de alcance"
              : ` · ${r.conAlcance} con alcance`),
        );
        refetch();
        refetchResumen();
      },
      onError: (err) => setAviso(`Error: ${err.message}`),
    },
  );

  const posts: PostHistorial[] = data?.historialDePagina ?? [];
  const resumen = dataResumen?.resumenHistorial;

  const numero = (n: number) => n.toLocaleString("es");

  const fecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Revival</h1>
          <p className="mt-1 text-white/50">
            Las publicaciones que mejor funcionaron en{" "}
            {activa ? activa.nombre : "tu fan page"}
          </p>
          <p className="mt-1 text-xs text-white/30">
            {resumen?.sincronizadoEn
              ? `Datos del ${new Date(resumen.sincronizadoEn).toLocaleString("es")}`
              : "Todavía no se sincronizó el historial"}
          </p>
        </div>

        <button
          onClick={() => {
            setAviso(null);
            sincronizar({
              variables: { pageId, maximo: MAXIMO_SINCRONIZACION },
            });
          }}
          disabled={!pageId || sincronizando}
          className="shrink-0 rounded-lg bg-[#0FED9D] px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sincronizando ? "Sincronizando…" : "↻ Sincronizar"}
        </button>
      </div>

      {aviso && (
        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          {aviso}
        </div>
      )}

      {/* Aviso de alcance: sin read_insights el score se calcula sin el */}
      {resumen && resumen.total > 0 && resumen.conAlcance === 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/80">
          Sin datos de alcance. El ranking usa solo reacciones, comentarios y
          compartidos, que sirve igual porque mide a todos los posts con la misma
          vara. Para sumar alcance e impresiones, reconectá Facebook desde
          Integraciones aceptando el permiso <code>read_insights</code>. Si ya lo
          concediste, mirá los logs del backend: el error de Meta dice el motivo
          exacto.
        </div>
      )}

      {/* Orden */}
      <div className="mb-4 flex gap-2">
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
      </div>

      {/* Tabla */}
      {!pageId ? (
        <Vacio
          icono="🔗"
          titulo="Sin página de Facebook habilitada"
          detalle="Un admin tiene que conectar y habilitar una página en Integraciones."
        />
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0FED9D] border-t-transparent" />
        </div>
      ) : posts.length === 0 ? (
        <Vacio
          icono="♻️"
          titulo="Historial vacío"
          detalle="Dale a Sincronizar para traer las publicaciones de la página desde Facebook."
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
                <th className="px-4 py-3 text-right font-medium">Alcance</th>
                <th className="px-4 py-3 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {posts.map((p) => (
                <tr key={p._id} className="transition hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.imagenUrl ? (
                        // URL del CDN de Facebook: next/image exigiria declarar
                        // el dominio y estas URLs ademas caducan.
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
                    {p.alcance != null ? numero(p.alcance) : "—"}
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
