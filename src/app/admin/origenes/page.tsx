"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/DashboardLayout";
import { USUARIOS_ORIGEN } from "@/graphql/operations";
import { useSesion } from "@/lib/sesion";
import { fechaCompleta } from "@/lib/time";

/** Las respuestas posibles, en el orden del onboarding (enum ComoNosConocio). */
const ORIGENES = ["CHATGPT", "GOOGLE", "FACEBOOK", "INSTAGRAM", "TIKTOK", "YOUTUBE", "LINKEDIN", "RECOMENDACION", "OTRO"] as const;
type Origen = (typeof ORIGENES)[number];

type Usuario = {
  _id: string;
  email: string;
  nombre?: string | null;
  comoNosConocio?: Origen | null;
  comoNosConocioDetalle?: string | null;
  createdAt: string;
};

/**
 * Dónde nos conocieron quienes se registraron: la respuesta del onboarding
 * (be#163). Solo ADMIN, porque lista personas de todas las marcas. Se arma con
 * la query `usuarios`, que ya es solo de admin.
 */
export default function OrigenesPage() {
  const t = useTranslations("adminOrigenes");
  const tOpcion = useTranslations("onboarding.marca.comoNosConocio.opciones");
  const locale = useLocale();
  const { esAdmin, cargando: cargandoSesion } = useSesion();
  const { data, loading, error } = useQuery<{ usuarios: Usuario[] }>(USUARIOS_ORIGEN, {
    skip: !esAdmin,
    fetchPolicy: "cache-and-network",
  });

  const { conteo, respondieron, sinRespuesta, recientes } = useMemo(() => {
    const usuarios = data?.usuarios ?? [];
    const conteo = new Map<Origen, number>(ORIGENES.map((o) => [o, 0]));
    const respondieron = usuarios.filter((u) => u.comoNosConocio);
    for (const u of respondieron) conteo.set(u.comoNosConocio!, (conteo.get(u.comoNosConocio!) ?? 0) + 1);
    const recientes = [...respondieron].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { conteo, respondieron: respondieron.length, sinRespuesta: usuarios.length - respondieron.length, recientes };
  }, [data]);

  const filas = ORIGENES.map((o) => ({ origen: o, n: conteo.get(o) ?? 0 })).sort((a, b) => b.n - a.n);
  const maximo = Math.max(1, ...filas.map((f) => f.n));

  if (!cargandoSesion && !esAdmin) {
    return (
      <DashboardLayout>
        <p className="text-white/50">{t("soloAdmin")}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t("titulo")}</h1>
        <p className="mt-1 text-white/50">{t("subtitulo")}</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error.message}</p>
        </div>
      )}

      {loading && !data ? (
        <p className="text-sm text-white/40">{t("cargando")}</p>
      ) : (
        <>
          <section className="mb-8 rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">{t("resumen.titulo")}</h2>
              <p className="text-xs text-white/40">
                {t("resumen.totales", { respondieron, sinRespuesta })}
              </p>
            </div>
            {respondieron === 0 ? (
              <p className="text-sm text-white/40">{t("vacio")}</p>
            ) : (
              <ul className="space-y-2.5">
                {filas.map(({ origen, n }) => (
                  <li key={origen} className="grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-3 text-sm sm:grid-cols-[11rem_1fr_5rem]">
                    <span className="truncate text-white/80">{tOpcion(origen)}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-white/5">
                      <span className="block h-full rounded-full bg-marca" style={{ width: `${(n / maximo) * 100}%` }} />
                    </span>
                    <span className="text-right tabular-nums text-white/60">
                      {n} <span className="text-white/30">· {Math.round((n / respondieron) * 100)}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {recientes.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold">{t("lista.titulo")}</h2>
              <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
                {recientes.map((u) => (
                  <li key={u._id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="truncate">{u.nombre || u.email}</p>
                      {u.nombre && <p className="truncate text-xs text-white/40">{u.email}</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs">
                        {tOpcion(u.comoNosConocio!)}
                        {u.comoNosConocioDetalle && <span className="text-white/50"> · {u.comoNosConocioDetalle}</span>}
                      </span>
                      <span className="text-xs text-white/40">{fechaCompleta(u.createdAt, locale)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
