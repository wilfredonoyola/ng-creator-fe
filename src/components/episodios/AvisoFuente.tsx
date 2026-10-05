"use client";

import { useLocale, useTranslations } from "next-intl";
import { avisoFuente } from "@/lib/aviso-fuente";
import { TONOS_CALIDAD } from "./IndicadorCalidad";

/**
 * "Fuente 1080p · los clips verticales salen con calidad Buena…": qué pueden
 * esperar de los clips por la resolución del original. Nada mientras no se
 * sabe (el episodio se está procesando). `corto`, para la lista de episodios.
 */
export function AvisoFuente({
  resolucion,
  corto = false,
  className = "",
}: {
  resolucion: { ancho: number; alto: number } | null | undefined;
  corto?: boolean;
  className?: string;
}) {
  const t = useTranslations("avisoFuente");
  const locale = useLocale();
  const aviso = avisoFuente(resolucion);
  if (!aviso) return null;
  const ampliacion = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(aviso.ampliacion);
  const explicacion = t("explicacion", { ampliacion });

  if (corto) {
    return (
      <span
        title={explicacion}
        className={`inline-flex items-center whitespace-nowrap rounded-full border px-1.5 text-[11px] font-medium ${TONOS_CALIDAD[aviso.nivel]} ${className}`}
      >
        {t(`corto.${aviso.nivel}`, { resolucion: aviso.resolucion })}
      </span>
    );
  }
  return (
    <p
      title={explicacion}
      className={`rounded-lg border px-3 py-2 text-sm ${TONOS_CALIDAD[aviso.nivel]} ${aviso.nivel === "BAJA" ? "font-medium" : ""} ${className}`}
    >
      {t(aviso.nivel, { resolucion: aviso.resolucion })}
    </p>
  );
}
