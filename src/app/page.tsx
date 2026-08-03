"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client";
import { COLA_DE_REVISION } from "@/graphql/operations";
import { haySesion } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { TarjetaRevision, Expediente } from "@/components/TarjetaRevision";

export default function ColaPage() {
  const router = useRouter();

  useEffect(() => {
    if (!haySesion()) router.push("/login");
  }, [router]);

  const { data, loading, error } = useQuery(COLA_DE_REVISION, {
    variables: { pagina: null },
    pollInterval: 15000, // refresca la cola cada 15s
  });

  const cola: Expediente[] = data?.colaDeRevision ?? [];

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-medium">Cola de revisión</h1>
          <span
            className="rounded px-2 py-0.5 text-xs"
            style={{ background: "rgba(15,237,157,0.15)", color: "#0FED9D" }}
          >
            {cola.length} pendientes
          </span>
        </div>

        {loading && (
          <p className="text-sm text-white/40">Cargando la cola…</p>
        )}
        {error && (
          <p className="text-sm text-red-400">
            Error al cargar: {error.message}
          </p>
        )}
        {!loading && cola.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-10 text-center">
            <p className="text-sm text-white/50">
              No hay expedientes por revisar. Sube un clip para empezar.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {cola.map((exp) => (
            <TarjetaRevision key={exp._id} exp={exp} />
          ))}
        </div>
      </main>
    </div>
  );
}
