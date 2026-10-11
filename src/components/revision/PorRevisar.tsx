"use client";

import Link from "next/link";
import { useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { CLIP_PARA_REVISION, REVISIONES_DE_MARCA } from "@/graphql/operations";
import { Poster } from "@/components/IconoRed";
import { EtiquetaRevision } from "@/components/revision/EtiquetaRevision";
import { etiquetaDeClip, type EstadoRevision } from "@/lib/revision";
import { fechaCompleta, tiempoRelativo } from "@/lib/time";

interface RevisionAbierta {
  _id: string;
  clipId: string;
  estado: EstadoRevision;
  updatedAt: string;
  pedidaPor: { nombre: string };
}

/**
 * Los clips que esperan algo de la revisión (ng-creator-be#175): los
 * pendientes, que espera un revisor, y los que tienen cambios pedidos, que
 * espera quien los edita. Sin importar la semana: lo vencido de antes también.
 */
export function PorRevisar({ marcaId }: { marcaId: string }) {
  const t = useTranslations("revisionClip.lista");
  const q = useQuery(REVISIONES_DE_MARCA, {
    variables: { marcaId },
    skip: !marcaId,
    pollInterval: 60_000,
    errorPolicy: "all",
  });
  const revisiones: RevisionAbierta[] = q.data?.revisionesDeMarca ?? [];
  if (q.loading && !q.data) return null;

  return (
    <section className="mb-6 rounded-xl border border-amber-400/25 bg-amber-400/[0.03] p-3">
      <h2 className="mb-2 text-sm font-semibold">
        {t("titulo")}
        {revisiones.length > 0 && (
          <span className="ml-2 rounded-full bg-amber-400/15 px-2 text-xs text-amber-300">{revisiones.length}</span>
        )}
      </h2>
      {revisiones.length === 0 ? (
        <p className="text-xs text-white/40">{t("vacia")}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {revisiones.map((r) => (
            <FilaRevision key={r._id} r={r} marcaId={marcaId} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** La revisión trae solo el id del clip: cada fila pide lo poco que muestra. */
function FilaRevision({ r, marcaId }: { r: RevisionAbierta; marcaId: string }) {
  const t = useTranslations("revisionClip.lista");
  const locale = useLocale();
  const q = useQuery(CLIP_PARA_REVISION, { variables: { id: r.clipId, marcaId }, errorPolicy: "all" });
  const clip: { _id: string; episodioId: string; titulo: string; urlPoster?: string | null } | null =
    q.data?.clipEpisodio ?? null;
  // Un clip borrado deja su revisión huérfana: no hay adónde llevar.
  if (!clip) return q.loading ? <li className="h-[76px] animate-pulse rounded-lg bg-white/5" /> : null;
  const enlace = `/episodios/${clip.episodioId}/clips/${clip._id}/publicar#revision`;
  return (
    <li className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2">
      <Poster url={clip.urlPoster} className="h-16 w-9" />
      <div className="min-w-0 flex-1">
        <Link href={enlace} className="line-clamp-2 text-sm font-medium hover:underline">
          {clip.titulo}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-white/45">
          <EtiquetaRevision etiqueta={etiquetaDeClip(r.estado)} chica />
          <span title={fechaCompleta(r.updatedAt, locale)}>
            {t("pidio", { nombre: r.pedidaPor.nombre, cuando: tiempoRelativo(r.updatedAt, undefined, locale) })}
          </span>
        </p>
      </div>
      <Link
        href={enlace}
        className="shrink-0 rounded-lg bg-marca px-3 py-1.5 text-xs font-medium text-ng-tinta hover:brightness-110"
      >
        {t("abrir")}
      </Link>
    </li>
  );
}
