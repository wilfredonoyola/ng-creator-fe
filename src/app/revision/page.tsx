"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import { COLA_DE_REVISION } from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { VideoCard, Expediente } from "@/components/VideoCard";

const PAGINAS = ["TODAS", "PRINCIPAL", "SECUNDARIO", "ENTRETENIMIENTO"];

export default function RevisionPage() {
  const [paginaFilter, setPaginaFilter] = useState<string>("TODAS");

  const { data, loading } = useQuery(COLA_DE_REVISION, {
    variables: { pagina: paginaFilter === "TODAS" ? null : paginaFilter },
    pollInterval: 15000,
  });

  const cola: Expediente[] = data?.colaDeRevision ?? [];

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
