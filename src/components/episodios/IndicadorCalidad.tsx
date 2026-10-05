"use client";

import { useLocale, useTranslations } from "next-intl";
import { Pista } from "@/components/Pista";
import type { CalidadClip, NivelCalidad } from "@/lib/calidad";

export const TONOS_CALIDAD: Record<NivelCalidad, string> = {
  EXCELENTE: "border-ng-teal/30 bg-ng-teal/10 text-ng-teal",
  BUENA: "border-ng-azul/30 bg-ng-azul/10 text-ng-azul",
  BAJA: "border-red-400/30 bg-red-400/10 text-red-300",
};

/**
 * "Calidad: Excelente / Buena / Baja", con el detalle en la pista: de qué
 * resolución es la fuente, cuánto se amplía y, la medida, a qué bitrate salió.
 * Estimada (en el editor, antes de procesar) o medida (del MP4).
 */
export function IndicadorCalidad({
  calidad,
  medida = false,
  lado = "abajo",
  etiqueta,
  className = "",
}: {
  calidad: CalidadClip;
  /** Medida del MP4 (con bitrate) o estimada en el editor. */
  medida?: boolean;
  lado?: "abajo" | "abajo-derecha" | "derecha";
  /** Para distinguir, por ejemplo, la versión para Facebook. */
  etiqueta?: string;
  className?: string;
}) {
  const t = useTranslations("calidadClip");
  const locale = useLocale();
  const numero = (n: number, decimales = 1) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: decimales, minimumFractionDigits: 0 }).format(n);

  const resolucion = Math.min(calidad.fuenteAncho, calidad.fuenteAlto);
  const kbps = calidad.bitrateKbps ?? 0;
  const bitrate = kbps >= 1000 ? t("mbps", { n: numero(kbps / 1000) }) : t("kbps", { n: numero(kbps, 0) });
  const nivel = t(`niveles.${calidad.nivel}`);

  const detalle = (
    <>
      <span className="block font-medium text-white/90">{medida ? t("medida") : t("estimada")}</span>
      <span className="block">
        {t("detalle", { resolucion, ampliacion: numero(calidad.ampliacion) })}
        {medida && kbps > 0 ? ` · ${bitrate}` : ""}
      </span>
      {calidad.nivel === "BAJA" && <span className="mt-1 block text-red-300">{t("consejo")}</span>}
    </>
  );

  return (
    <Pista texto={detalle} lado={lado} className={className}>
      <span
        tabIndex={0}
        aria-label={`${etiqueta ? `${etiqueta} · ` : ""}${t("pastilla", { nivel })}`}
        className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border px-2 text-xs font-medium outline-none ${TONOS_CALIDAD[calidad.nivel]}`}
      >
        {etiqueta ? <span className="mr-1 text-white/55">{etiqueta}</span> : null}
        {t("pastilla", { nivel })}
      </span>
    </Pista>
  );
}
