"use client";

import Link from "next/link";
import { useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { CLIP_PARA_METRICAS, METRICAS_DE_CLIP } from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Poster } from "@/components/IconoRed";
import { MetricasClip } from "@/components/metricas/MetricasClip";
import { useMarcaActiva } from "@/lib/marca-activa";
import { esMotivo } from "@/lib/momentos";

/**
 * Las métricas de un clip en su propia página: es adonde lleva el ranking de
 * /metricas, y una URL que se puede pasar ("mirá cómo le fue a este").
 */
export default function MetricasDeClipPage({
  params,
}: {
  // Objeto plano, no promesa: ver publicados/[id].
  params: { clipId: string };
}) {
  const t = useTranslations("metricasClip");
  const tMotivo = useTranslations("episodiosMotivos");
  const { clipId } = params;
  const { activa } = useMarcaActiva();
  const marcaId = activa?._id ?? "";

  const clipQ = useQuery(CLIP_PARA_METRICAS, {
    variables: { id: clipId, marcaId },
    skip: !activa,
    errorPolicy: "all",
  });
  // La misma consulta que hace el panel (sale de la caché): para saber si hay
  // algo que mostrar o va el aviso de que todavía no salió.
  const metricasQ = useQuery(METRICAS_DE_CLIP, {
    variables: { marcaId, clipId },
    skip: !activa,
    errorPolicy: "all",
  });
  const clip = clipQ.data?.clipEpisodio;
  const publicaciones = metricasQ.data?.metricasDeClip?.publicaciones ?? [];
  const cargando = !activa || clipQ.loading || metricasQ.loading;

  return (
    <DashboardLayout>
      <Link href="/metricas" className="text-sm text-white/50 hover:text-white/80">
        ← {t("volver")}
      </Link>

      {cargando && !clip ? (
        <div className="mt-4 h-64 animate-pulse rounded-2xl bg-white/5" />
      ) : !clip ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="font-medium text-white/70">{t("noEncontrado")}</p>
          <p className="mt-1 text-sm text-white/40">{t("otraMarca")}</p>
        </div>
      ) : (
        <div className="mx-auto mt-3 max-w-3xl space-y-5">
          <div className="flex items-center gap-4">
            <Poster url={clip.urlPoster} className="h-28 w-16" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold">{clip.titulo}</h1>
              <p className="mt-1 text-sm text-white/45">
                {clip.origen === "MANUAL"
                  ? t("hechoAMano")
                  : esMotivo(clip.motivo)
                    ? tMotivo(clip.motivo)
                    : clip.motivo}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <Link href={`/episodios/${clip.episodioId}`} className="text-ng-celeste hover:underline">
                  {t("verEpisodio")}
                </Link>
                <Link
                  href={`/episodios/${clip.episodioId}/clips/${clip._id}/publicar`}
                  className="text-ng-celeste hover:underline"
                >
                  {t("verPublicaciones")}
                </Link>
              </div>
            </div>
          </div>

          {!metricasQ.loading && publicaciones.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
              <p className="font-medium text-white/70">{t("sinPublicar.titulo")}</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-white/40">{t("sinPublicar.detalle")}</p>
            </div>
          ) : (
            <MetricasClip
              marcaId={marcaId}
              clipId={clip._id}
              puntuacion={clip.origen === "MANUAL" ? null : clip.puntuacion}
            />
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
