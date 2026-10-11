"use client";

import { useLocale, useTranslations } from "next-intl";
import { COLOR_POCA_MUESTRA, COLOR_SERIE } from "@/lib/analitica";
import { MINIMO_CLIPS, compacto, porcentaje, type GrupoRendimiento } from "@/lib/metricas";

/**
 * Vistas promedio por grupo de clips (motivo, rango de puntuación), en barras
 * horizontales: las etiquetas son largas ("Opinión polémica") y así entran
 * enteras en un teléfono sin girarlas.
 *
 * Cada barra lleva al lado cuántos clips promedia. Un grupo con menos de
 * `MINIMO_CLIPS` va en gris: su promedio es una anécdota, no un patrón.
 */
export function BarrasGrupos({
  titulo,
  descripcion,
  grupos,
  etiqueta,
  claro = false,
}: {
  titulo: string;
  descripcion?: string;
  grupos: GrupoRendimiento[];
  etiqueta: (clave: string) => string;
  /** Sobre papel blanco (el reporte para el cliente). */
  claro?: boolean;
}) {
  const t = useTranslations("metricasGraficos");
  const locale = useLocale();
  const maximo = Math.max(...grupos.map((g) => g.vistasPromedio ?? 0), 1);
  const hayPocaMuestra = grupos.some((g) => g.clips < MINIMO_CLIPS);
  const tenue = claro ? "text-black/50" : "text-white/40";
  const pista = claro ? "bg-black/[0.06]" : "bg-white/[0.06]";

  return (
    <section
      className={
        claro
          ? "break-inside-avoid rounded-xl border border-black/10 p-4"
          : "rounded-2xl border border-white/10 bg-white/[0.02] p-5"
      }
    >
      <h2 className="text-sm font-semibold">{titulo}</h2>
      {descripcion && <p className={`mt-0.5 text-xs ${tenue}`}>{descripcion}</p>}

      {grupos.length === 0 ? (
        <p className={`mt-4 text-center text-sm ${tenue}`}>{t("sinDatos")}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {grupos.map((g) => {
            const confiable = g.clips >= MINIMO_CLIPS;
            const ancho = g.vistasPromedio != null ? Math.max((g.vistasPromedio / maximo) * 100, 2) : 0;
            return (
              <li key={g.clave}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{etiqueta(g.clave)}</span>
                  <span className="shrink-0 tabular-nums">
                    {t("vistasPromedio", { vistas: compacto(g.vistasPromedio, locale) })}
                  </span>
                </div>
                <div className={`mt-1 h-2 overflow-hidden rounded-full ${pista}`}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${ancho}%`,
                      backgroundColor: confiable ? COLOR_SERIE : COLOR_POCA_MUESTRA,
                      // En papel el amarillo puro casi no se ve: se le da un borde de tinta.
                      border: claro && confiable ? "1px solid #0A0A0A" : undefined,
                    }}
                  />
                </div>
                <p className={`mt-0.5 text-[11px] tabular-nums ${tenue}`}>
                  {t("muestra", { n: g.clips })}
                  {g.tasaInteraccion != null &&
                    ` · ${t("tasa", { tasa: porcentaje(g.tasaInteraccion, locale) })}`}
                  {!confiable && ` · ${t("pocaMuestra")}`}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {hayPocaMuestra && (
        <p className={`mt-3 flex items-center gap-2 text-[11px] ${tenue}`}>
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLOR_POCA_MUESTRA }} />
          {t("leyendaMuestra", { n: MINIMO_CLIPS })}
        </p>
      )}
    </section>
  );
}
