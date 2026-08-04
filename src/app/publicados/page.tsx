"use client";

import { useQuery } from "@apollo/client";
import { PUBLICATIONS } from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Publication {
  _id: string;
  expedienteId: string;
  plataforma: string;
  publicUrl?: string;
  metricas?: {
    views?: number;
    likes?: number;
    comments?: number;
  };
  createdAt?: string;
}

export default function PublicadosPage() {
  const { data, loading } = useQuery(PUBLICATIONS);
  const publications: Publication[] = data?.publications ?? [];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Videos Publicados</h1>
        <p className="mt-1 text-white/50">
          {publications.length} video{publications.length !== 1 ? "s" : ""} publicado{publications.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0FED9D] border-t-transparent" />
        </div>
      ) : publications.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {publications.map((pub) => (
            <div
              key={pub._id}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-lg bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-400">
                  {pub.plataforma}
                </span>
                {pub.publicUrl && (
                  <a
                    href={pub.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#0FED9D] hover:underline"
                  >
                    Ver video
                  </a>
                )}
              </div>

              <p className="mb-4 truncate text-sm text-white/40">
                Expediente: {pub.expedienteId}
              </p>

              {pub.metricas && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white/5 p-3 text-center">
                    <p className="text-lg font-bold">{pub.metricas.views ?? 0}</p>
                    <p className="text-xs text-white/40">Views</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3 text-center">
                    <p className="text-lg font-bold">{pub.metricas.likes ?? 0}</p>
                    <p className="text-xs text-white/40">Likes</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3 text-center">
                    <p className="text-lg font-bold">{pub.metricas.comments ?? 0}</p>
                    <p className="text-xs text-white/40">Comments</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
          <div className="mb-4 text-5xl opacity-30">📺</div>
          <p className="text-lg font-medium text-white/60">
            No hay videos publicados
          </p>
          <p className="mt-1 text-sm text-white/40">
            Los videos aprobados aparecerán aquí después de publicarse
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
