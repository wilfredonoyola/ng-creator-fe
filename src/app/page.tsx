"use client";

import { useQuery } from "@apollo/client";
import { COLA_DE_REVISION, CREATORS, LICENSES, PUBLICATIONS } from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCard } from "@/components/StatsCard";
import { VideoCard, Expediente } from "@/components/VideoCard";
import Link from "next/link";

export default function DashboardPage() {
  const { data: colaData } = useQuery(COLA_DE_REVISION, {
    variables: { pagina: null },
    pollInterval: 30000,
  });
  const { data: creatorsData } = useQuery(CREATORS);
  const { data: licensesData } = useQuery(LICENSES);
  const { data: publicationsData } = useQuery(PUBLICATIONS);

  const cola: Expediente[] = colaData?.colaDeRevision ?? [];
  const totalCreators = creatorsData?.creators?.length ?? 0;
  const totalLicenses = licensesData?.licenses?.length ?? 0;
  const totalPublications = publicationsData?.publications?.length ?? 0;

  const recentVideos = cola.slice(0, 3);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-white/50">
          Bienvenido a NG Video Creator
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon="📹"
          label="En revisión"
          value={cola.length}
          color="#0FED9D"
        />
        <StatsCard
          icon="📺"
          label="Publicados"
          value={totalPublications}
          color="#60A5FA"
        />
        <StatsCard
          icon="👤"
          label="Creators"
          value={totalCreators}
          color="#F472B6"
        />
        <StatsCard
          icon="📜"
          label="Licencias"
          value={totalLicenses}
          color="#FBBF24"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Acciones rápidas</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/crear"
            className="flex items-center gap-4 rounded-2xl border border-[#0FED9D]/30 bg-[#0FED9D]/5 p-5 transition hover:border-[#0FED9D]/50 hover:bg-[#0FED9D]/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0FED9D]/20">
              <span className="text-2xl">🎬</span>
            </div>
            <div>
              <p className="font-medium text-[#0FED9D]">Crear Video</p>
              <p className="text-sm text-white/40">Sube un clip y genera contenido</p>
            </div>
          </Link>

          <Link
            href="/revision"
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <span className="text-2xl">✅</span>
            </div>
            <div>
              <p className="font-medium">Revisar Videos</p>
              <p className="text-sm text-white/40">{cola.length} pendientes</p>
            </div>
          </Link>

          <Link
            href="/creators"
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <span className="text-2xl">👤</span>
            </div>
            <div>
              <p className="font-medium">Gestionar Creators</p>
              <p className="text-sm text-white/40">{totalCreators} registrados</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Videos */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Videos recientes</h2>
          {cola.length > 3 && (
            <Link
              href="/revision"
              className="text-sm text-[#0FED9D] hover:underline"
            >
              Ver todos ({cola.length}) →
            </Link>
          )}
        </div>

        {recentVideos.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {recentVideos.map((exp) => (
              <VideoCard key={exp._id} exp={exp} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <div className="mb-4 text-5xl opacity-30">🎬</div>
            <p className="text-lg font-medium text-white/60">No hay videos en revisión</p>
            <p className="mt-1 text-sm text-white/40">
              Crea tu primer video para empezar
            </p>
            <Link
              href="/crear"
              className="mt-4 inline-block rounded-xl bg-[#0FED9D] px-6 py-3 font-medium text-black transition hover:bg-[#0FED9D]/90"
            >
              Crear Video
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
