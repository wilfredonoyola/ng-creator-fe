"use client";

import { useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { PUBLICACIONES_DE_EXPEDIENTE } from "@/graphql/operations";
import type { Publicacion } from "@/lib/publicaciones";

/** Los formatos con nombre en `redesEstadoFacebook.formatos`. */
const FORMATOS = ["REEL", "HISTORIA_VIDEO", "IMAGEN", "HISTORIA_IMAGEN"] as const;
const esFormato = (f: string): f is (typeof FORMATOS)[number] =>
  (FORMATOS as readonly string[]).includes(f);

/**
 * Si el video ya salió a Facebook, y en qué formatos.
 *
 * Antes había que desplegar el panel de publicar para saberlo, así que sobre
 * una grilla de decenas de videos no había forma de ver de un vistazo cuáles
 * ya salieron: justo la pregunta que uno trae al entrar a esta pantalla.
 *
 * Usa la misma consulta que el panel de publicar, con las mismas variables, así
 * que Apollo la sirve de su caché y no agrega ni una llamada. Y como el panel
 * la refresca mientras algo está en camino, esto se actualiza con él.
 */
export function EstadoEnFacebook({
  expedienteId,
  marcaIdDelVideo,
}: {
  expedienteId: string;
  marcaIdDelVideo: string;
}) {
  const t = useTranslations("redesEstadoFacebook");
  const { data } = useQuery(PUBLICACIONES_DE_EXPEDIENTE, {
    variables: { marcaId: marcaIdDelVideo, expedienteId },
    errorPolicy: "all",
  });

  const publicaciones: Publicacion[] = (
    data?.publicacionesDeExpediente ?? []
  ).filter((p: Publicacion) => p.red === "FACEBOOK");
  const salieron = publicaciones.filter((p) => p.estado === "PUBLICADA");
  const fallaron = publicaciones.filter((p) => p.estado === "FALLIDA");
  const pendientes = publicaciones.filter(
    (p) =>
      p.estado === "PROGRAMADA" ||
      p.estado === "AGENDADA_EN_RED" ||
      p.estado === "SUBIENDO" ||
      p.estado === "PROCESANDO",
  );

  if (!salieron.length && !fallaron.length && !pendientes.length) {
    return (
      <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/50">
        {t("sinPublicar")}
      </span>
    );
  }

  // Los formatos se muestran sin repetir: publicar dos veces el mismo formato
  // es un reintento, no dos destinos distintos.
  const formatos = Array.from(new Set(salieron.map((p) => p.formato)));

  return (
    <span className="flex flex-wrap items-center justify-end gap-1">
      {formatos.map((f) => (
        <span
          key={f}
          className="rounded-md bg-marca px-2 py-0.5 text-[10px] font-semibold text-ng-tinta"
        >
          {esFormato(f) ? t(`formatos.${f}`) : f}
        </span>
      ))}
      {pendientes.length > 0 && (
        <span className="rounded-md bg-indigo-500/70 px-2 py-0.5 text-[10px] font-semibold text-white">
          {t("programadas", { n: pendientes.length })}
        </span>
      )}
      {/* El motivo va en el tooltip: la tarjeta dice que falló y por qué sin
          tener que abrir el panel. */}
      {!salieron.length && fallaron.length > 0 && (
        <span
          className="rounded-md bg-red-500/80 px-2 py-0.5 text-[10px] font-semibold text-white"
          title={fallaron[0].error ?? undefined}
        >
          {t("fallo")}
        </span>
      )}
    </span>
  );
}
