"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * La portada de marca como sale (la imagen la arma el backend). Mientras llega
 * una nueva queda la anterior, con un indicador chico.
 */
export function VistaPortada({
  imagen,
  cargando,
  error,
  ancho = 180,
}: {
  imagen: string | null;
  cargando: boolean;
  error?: boolean;
  ancho?: number;
}) {
  const t = useTranslations("portadaMarca");
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5"
      style={{ width: ancho, height: (ancho * 16) / 9 }}
    >
      {imagen ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL armada por el backend
        <img src={imagen} alt={t("vista.alt")} className="h-full w-full object-cover" />
      ) : (
        !error && <div className="h-full w-full animate-pulse bg-white/5" />
      )}
      {error && !imagen && (
        <p className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-white/50">{t("vista.error")}</p>
      )}
      {cargando && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1" aria-label={t("vista.cargando")}>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-white/80" />
        </span>
      )}
    </div>
  );
}
