"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { COLOR_POCA_MUESTRA, COLOR_SERIE, etiquetaHora } from "@/lib/analitica";
import { MINIMO_CLIPS, compacto, porcentaje, type GrupoRendimiento } from "@/lib/metricas";

/**
 * Vistas promedio según la hora local a la que salió cada clip: las 24 horas
 * siempre, con hueco donde no salió nada, para que se lea como un reloj y no
 * como una lista de horas sueltas.
 *
 * Mismo criterio que `BarrasRendimiento` del análisis: viewBox fijo, poca
 * muestra en gris, el detalle al pasar por encima (o al tocar en el teléfono).
 */
export function BarrasHora({
  titulo,
  descripcion,
  grupos,
}: {
  titulo: string;
  descripcion: string;
  grupos: GrupoRendimiento[];
}) {
  const t = useTranslations("metricasGraficos");
  const locale = useLocale();
  const [encima, setEncima] = useState<number | null>(null);
  const porHora = new Map(grupos.map((g) => [Number(g.clave), g]));
  const maximo = Math.max(...grupos.map((g) => g.vistasPromedio ?? 0), 1);

  const ANCHO = 300;
  const ALTO = 90;
  const paso = ANCHO / 24;
  const ANCHO_BARRA = paso - 2;
  const elegida = encima !== null ? porHora.get(encima) : undefined;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="text-sm font-semibold">{titulo}</h2>
      <p className="mt-0.5 text-xs text-white/35">{descripcion}</p>

      {grupos.length === 0 ? (
        <p className="mt-4 text-center text-sm text-white/40">{t("sinDatos")}</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${ANCHO} ${ALTO + 14}`} className="mt-4 w-full" role="img" aria-label={titulo}>
            {[0.5, 1].map((f) => (
              <line
                key={f}
                x1={0}
                x2={ANCHO}
                y1={ALTO - ALTO * f}
                y2={ALTO - ALTO * f}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: 24 }, (_, h) => {
              const g = porHora.get(h);
              const x = h * paso + 1;
              const alto = g?.vistasPromedio != null ? Math.max((g.vistasPromedio / maximo) * ALTO, 2) : 0;
              return (
                <g key={h}>
                  {g && (
                    <rect
                      x={x}
                      y={ALTO - alto}
                      width={ANCHO_BARRA}
                      height={alto}
                      rx={2}
                      fill={g.clips >= MINIMO_CLIPS ? COLOR_SERIE : COLOR_POCA_MUESTRA}
                      opacity={encima === null || encima === h ? 1 : 0.45}
                    />
                  )}
                  <rect
                    x={x}
                    y={0}
                    width={ANCHO_BARRA}
                    height={ALTO}
                    fill="transparent"
                    onMouseEnter={() => setEncima(h)}
                    onMouseLeave={() => setEncima(null)}
                    onClick={() => setEncima((e) => (e === h ? null : h))}
                    style={{ cursor: g ? "pointer" : "default" }}
                  />
                  {h % 3 === 0 && (
                    <text x={x + ANCHO_BARRA / 2} y={ALTO + 10} textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.35)">
                      {String(h).padStart(2, "0")}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {/* El detalle va abajo y no flotando: en el teléfono el dedo tapa lo que flota. */}
          <p className="mt-2 min-h-[1rem] text-xs text-white/50">
            {encima === null
              ? t("tocaUnaHora")
              : elegida
                ? `${etiquetaHora(encima)} · ${t("vistasPromedio", { vistas: compacto(elegida.vistasPromedio, locale) })} · ${t("muestra", { n: elegida.clips })}${
                    elegida.tasaInteraccion != null ? ` · ${t("tasa", { tasa: porcentaje(elegida.tasaInteraccion, locale) })}` : ""
                  }`
                : `${etiquetaHora(encima)} · ${t("nadaEnEsaHora")}`}
          </p>
        </>
      )}
    </section>
  );
}
