"use client";

import { useEffect, useMemo, useState } from "react";
import { NetworkStatus, useQuery } from "@apollo/client";
import { COLA_DE_REVISION, EXPEDIENTES_FALLIDOS } from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { VideoCard, Expediente } from "@/components/VideoCard";
import { fechaCompleta, tiempoRelativo, useAhora } from "@/lib/time";

const PAGINAS = ["TODAS", "PRINCIPAL", "SECUNDARIO", "ENTRETENIMIENTO"];

type Orden = "ANTIGUOS" | "RECIENTES";

const ORDENES: Array<{ valor: Orden; label: string }> = [
  { valor: "ANTIGUOS", label: "Más antiguos" },
  { valor: "RECIENTES", label: "Más recientes" },
];

interface ExpedienteFallido {
  _id: string;
  pagina: string;
  tipoDeValor: string;
  estado: string;
  error?: string;
  createdAt?: string;
}

export default function RevisionPage() {
  const [paginaFilter, setPaginaFilter] = useState<string>("TODAS");
  const [showFallidos, setShowFallidos] = useState(false);
  const [orden, setOrden] = useState<Orden>("ANTIGUOS");
  const ahora = useAhora(10_000);

  const { data, loading, refetch, networkStatus } = useQuery(COLA_DE_REVISION, {
    variables: { pagina: paginaFilter === "TODAS" ? null : paginaFilter },
    pollInterval: 15000,
    notifyOnNetworkStatusChange: true,
  });

  const { data: fallidosData } = useQuery(EXPEDIENTES_FALLIDOS, {
    variables: { pagina: paginaFilter === "TODAS" ? null : paginaFilter },
    pollInterval: 30000,
  });

  // Marca de frescura: la página se refresca sola cada 15s, pero sin esto no
  // hay forma de saber si lo que estás viendo está al día.
  const [ultimaActualizacion, setUltimaActualizacion] = useState<number | null>(null);
  useEffect(() => {
    if (networkStatus === NetworkStatus.ready) {
      setUltimaActualizacion(Date.now());
    }
  }, [networkStatus]);

  const colaCruda: Expediente[] = data?.colaDeRevision ?? [];
  const fallidos: ExpedienteFallido[] = fallidosData?.expedientesFallidos ?? [];

  // El backend ya devuelve FIFO (createdAt asc); acá solo se invierte si el
  // revisor pide ver primero lo último que entró.
  const cola = useMemo(() => {
    if (orden === "ANTIGUOS") return colaCruda;
    return [...colaCruda].reverse();
  }, [colaCruda, orden]);

  const recargando = networkStatus === NetworkStatus.refetch;
  const primeraCarga = loading && !data;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cola de Revisión</h1>
          <p className="mt-1 text-white/50">
            {cola.length} video{cola.length !== 1 ? "s" : ""} pendiente{cola.length !== 1 ? "s" : ""} de revisión
          </p>
          <p
            className="mt-1 text-xs text-white/30"
            title={
              ultimaActualizacion
                ? `Última consulta: ${fechaCompleta(ultimaActualizacion)}`
                : undefined
            }
          >
            {ultimaActualizacion
              ? `Actualizado ${tiempoRelativo(ultimaActualizacion, ahora)} · se refresca cada 15s`
              : "Cargando…"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={recargando}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:bg-white/5 disabled:opacity-50"
            title="Volver a consultar ahora"
          >
            {recargando ? "Actualizando…" : "↻ Actualizar"}
          </button>
          {fallidos.length > 0 && (
            <button
              onClick={() => setShowFallidos(!showFallidos)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                showFallidos
                  ? "bg-red-500 text-white"
                  : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              }`}
            >
              {showFallidos ? "Ocultar" : "Ver"} fallidos ({fallidos.length})
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {PAGINAS.map((p) => (
            <button
              key={p}
              onClick={() => setPaginaFilter(p)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                paginaFilter === p
                  ? "bg-[#0FED9D] text-black"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {p.toLowerCase()}
            </button>
          ))}
        </div>

        {/* Orden: por defecto FIFO, para que nada se quede atrás en la cola */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Orden</span>
          <div className="flex overflow-hidden rounded-lg border border-white/10">
            {ORDENES.map((o) => (
              <button
                key={o.valor}
                onClick={() => setOrden(o.valor)}
                className={`px-3 py-2 text-xs font-medium transition ${
                  orden === o.valor
                    ? "bg-white/15 text-white"
                    : "text-white/50 hover:bg-white/5"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fallidos Section */}
      {showFallidos && fallidos.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-red-400">
            Expedientes Fallidos
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {fallidos.map((exp) => (
              <div
                key={exp._id}
                className="rounded-xl border border-red-500/30 bg-red-500/5 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400">
                    FALLIDO
                  </span>
                  <span className="text-xs text-white/40">
                    {exp.createdAt ? new Date(exp.createdAt).toLocaleString() : ""}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-white/40">Página:</span>{" "}
                    <span className="text-white/70">{exp.pagina}</span>
                  </p>
                  <p>
                    <span className="text-white/40">Tipo:</span>{" "}
                    <span className="text-white/70">{exp.tipoDeValor}</span>
                  </p>
                  <p className="truncate">
                    <span className="text-white/40">ID:</span>{" "}
                    <span className="font-mono text-xs text-white/50">{exp._id}</span>
                  </p>
                </div>
                {exp.error && (
                  <div className="mt-3">
                    <p className="text-xs text-red-400 line-clamp-2">
                      {exp.error}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content: solo la primera carga muestra spinner. Con
          notifyOnNetworkStatusChange, `loading` también se activa en cada poll,
          y usarlo acá haría desaparecer la lista cada 15 segundos. */}
      {primeraCarga ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0FED9D] border-t-transparent" />
        </div>
      ) : cola.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {cola.map((exp) => (
            <VideoCard key={exp._id} exp={exp} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
          <div className="mb-4 text-5xl opacity-30">✅</div>
          <p className="text-lg font-medium text-white/60">
            No hay videos en revisión
          </p>
          <p className="mt-1 text-sm text-white/40">
            {paginaFilter !== "TODAS"
              ? `No hay videos en la página ${paginaFilter.toLowerCase()}`
              : "Todos los videos han sido procesados"}
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
