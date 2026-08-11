"use client";

import { useQuery } from "@apollo/client";
import { FACEBOOK_PUBLICACIONES_DE_EXPEDIENTE } from "@/graphql/operations";

const ETIQUETA: Record<string, string> = {
  REEL: "Reel",
  HISTORIA_VIDEO: "Historia",
  IMAGEN: "Imagen",
  HISTORIA_IMAGEN: "Historia img",
};

/**
 * Si el video ya salió a Facebook, y en qué formatos.
 *
 * Antes había que desplegar el panel de publicar para saberlo, así que sobre
 * una grilla de decenas de videos no había forma de ver de un vistazo cuáles
 * ya salieron: justo la pregunta que uno trae al entrar a esta pantalla.
 *
 * Usa la misma consulta que el panel de publicar, con las mismas variables, así
 * que Apollo la sirve de su caché y no agrega ni una llamada.
 */
export function EstadoEnFacebook({ expedienteId }: { expedienteId: string }) {
  const { data } = useQuery(FACEBOOK_PUBLICACIONES_DE_EXPEDIENTE, {
    variables: { expedienteId },
    errorPolicy: "all",
  });

  const publicaciones = data?.facebookPublicacionesDeExpediente ?? [];
  const salieron = publicaciones.filter(
    (p: { estado: string }) => p.estado === "PUBLICADA",
  );
  const fallaron = publicaciones.filter(
    (p: { estado: string }) => p.estado === "FALLIDA",
  );

  if (!salieron.length && !fallaron.length) {
    return (
      <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/50">
        Sin publicar
      </span>
    );
  }

  // Los formatos se muestran sin repetir: publicar dos veces el mismo formato
  // es un reintento, no dos destinos distintos.
  const formatos = Array.from(
    new Set(salieron.map((p: { formato: string }) => p.formato)),
  );

  return (
    <span className="flex flex-wrap items-center justify-end gap-1">
      {formatos.map((f) => (
        <span
          key={String(f)}
          className="rounded-md bg-[#0FED9D] px-2 py-0.5 text-[10px] font-semibold text-black"
        >
          {ETIQUETA[String(f)] ?? String(f)}
        </span>
      ))}
      {!salieron.length && fallaron.length > 0 && (
        <span className="rounded-md bg-red-500/80 px-2 py-0.5 text-[10px] font-semibold text-white">
          Falló
        </span>
      )}
    </span>
  );
}
