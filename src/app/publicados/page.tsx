"use client";

import { useQuery } from "@apollo/client";
import { PUBLICATIONS } from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Publication {
  _id: string;
  expedienteId: string;
  expedienteNum: number;
  pagina: string;
  publicadoEn?: string;
  videoFinalUrl?: string;
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
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent overflow-hidden"
            >
              {/* Video Player */}
              {pub.videoFinalUrl ? (
                <video
                  src={pub.videoFinalUrl}
                  controls
                  className="w-full aspect-[9/16] bg-black object-contain"
                  preload="metadata"
                />
              ) : (
                <div className="w-full aspect-[9/16] bg-black/50 flex items-center justify-center">
                  <span className="text-white/30">Sin video</span>
                </div>
              )}

              {/* Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-[#0FED9D]">
                    #{pub.expedienteNum}
                  </span>
                  <span className="rounded-lg bg-[#0FED9D]/20 px-2 py-1 text-xs font-medium text-[#0FED9D]">
                    {pub.pagina}
                  </span>
                </div>

                {pub.publicadoEn && (
                  <p className="text-xs text-white/40">
                    {new Date(pub.publicadoEn).toLocaleDateString("es", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}

                {pub.videoFinalUrl && (
                  <a
                    href={pub.videoFinalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="mt-3 block w-full text-center rounded-lg bg-white/10 py-2 text-sm hover:bg-white/20 transition"
                  >
                    ⬇️ Descargar
                  </a>
                )}
              </div>
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
