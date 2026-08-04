"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import { COLA_DE_REVISION, EXPEDIENTES_FALLIDOS } from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { VideoCard, Expediente } from "@/components/VideoCard";

const PAGINAS = ["TODAS", "PRINCIPAL", "SECUNDARIO", "ENTRETENIMIENTO"];

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

  const { data, loading } = useQuery(COLA_DE_REVISION, {
    variables: { pagina: paginaFilter === "TODAS" ? null : paginaFilter },
    pollInterval: 15000,
  });

  const { data: fallidosData, loading: loadingFallidos } = useQuery(EXPEDIENTES_FALLIDOS, {
    variables: { pagina: paginaFilter === "TODAS" ? null : paginaFilter },
    pollInterval: 30000,
  });

  const cola: Expediente[] = data?.colaDeRevision ?? [];
  const fallidos: ExpedienteFallido[] = fallidosData?.expedientesFallidos ?? [];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cola de Revisión</h1>
          <p className="mt-1 text-white/50">
            {cola.length} video{cola.length !== 1 ? "s" : ""} pendiente{cola.length !== 1 ? "s" : ""} de revisión
          </p>
        </div>
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

      {/* Filters */}
      <div className="mb-6 flex gap-2">
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

      {/* Content */}
      {loading ? (
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
