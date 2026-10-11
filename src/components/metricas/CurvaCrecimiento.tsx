"use client";

import { useLocale, useTranslations } from "next-intl";
import { REDES } from "@/lib/publicaciones";
import { COLOR_RED, compacto, etiquetaHoras, type PublicacionConMetricas, type PuntoCurva } from "@/lib/metricas";

/** Las marcas del eje: las mismas horas a las que se leen las métricas, más o menos. */
const MARCAS_HORAS = [1, 6, 24, 72, 168, 720, 2160];

/**
 * Cómo crecieron las vistas desde que salió, una línea por publicación con el
 * color de su red.
 *
 * El eje de las horas es logarítmico: las lecturas son a 1 h, 6 h, 24 h, 2 d…
 * 90 d, y en una escala lineal las primeras 24 horas —que es donde se decide
 * si un clip despega— quedarían apretadas en un borde.
 */
export function CurvaCrecimiento({
  curva,
  publicaciones,
}: {
  curva: PuntoCurva[];
  publicaciones: PublicacionConMetricas[];
}) {
  const t = useTranslations("metricasGraficos");
  const locale = useLocale();

  const lineas = publicaciones
    .map((p) => ({
      p,
      puntos: [
        // Al salir tenía cero: así una sola lectura ya dibuja una línea.
        { horas: 0, vistas: 0 },
        ...curva
          .filter((c) => c.publicacionId === p._id && c.vistas != null)
          .map((c) => ({ horas: c.horas, vistas: c.vistas! }))
          .sort((a, b) => a.horas - b.horas),
      ],
    }))
    .filter((l) => l.puntos.length > 1);

  if (!lineas.length) {
    return <p className="text-sm text-white/40">{t("curvaVacia")}</p>;
  }

  const ANCHO = 300;
  const ALTO = 120;
  const IZQ = 28; // lugar para las cifras del eje
  const maxHoras = Math.max(...lineas.flatMap((l) => l.puntos.map((p) => p.horas)), 1);
  const maxVistas = Math.max(...lineas.flatMap((l) => l.puntos.map((p) => p.vistas)), 1);
  const x = (h: number) => IZQ + (Math.log1p(h) / Math.log1p(maxHoras)) * (ANCHO - IZQ - 4);
  const y = (v: number) => ALTO - (v / maxVistas) * (ALTO - 6);
  const marcas = MARCAS_HORAS.filter((h) => h <= maxHoras * 1.05);

  return (
    <div>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO + 14}`} className="w-full" role="img" aria-label={t("curvaTitulo")}>
        {[0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1={IZQ}
              x2={ANCHO}
              y1={y(maxVistas * f)}
              y2={y(maxVistas * f)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
            <text x={IZQ - 3} y={y(maxVistas * f) + 2} textAnchor="end" fontSize="6" fill="rgba(255,255,255,0.35)">
              {compacto(maxVistas * f, locale)}
            </text>
          </g>
        ))}
        <line x1={IZQ} x2={ANCHO} y1={ALTO} y2={ALTO} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        {marcas.map((h) => {
          const e = etiquetaHoras(h);
          return (
            <text key={h} x={x(h)} y={ALTO + 10} textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.35)">
              {t(`unidad.${e.unidad}`, { n: e.n })}
            </text>
          );
        })}
        {lineas.map(({ p, puntos }) => (
          <g key={p._id}>
            <polyline
              points={puntos.map((pt) => `${x(pt.horas)},${y(pt.vistas)}`).join(" ")}
              fill="none"
              stroke={COLOR_RED[p.red]}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {puntos.slice(1).map((pt) => (
              <circle key={pt.horas} cx={x(pt.horas)} cy={y(pt.vistas)} r="1.6" fill={COLOR_RED[p.red]}>
                <title>
                  {`${REDES[p.red]?.nombre ?? p.red} · ${t(`unidad.${etiquetaHoras(pt.horas).unidad}`, {
                    n: etiquetaHoras(pt.horas).n,
                  })} · ${t("vistas", { n: compacto(pt.vistas, locale) })}`}
                </title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      {/* Leyenda con el nombre: el color solo no alcanza para distinguir las redes. */}
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/55">
        {lineas.map(({ p, puntos }) => (
          <li key={p._id} className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-0.5 w-3 rounded" style={{ backgroundColor: COLOR_RED[p.red] }} />
            {REDES[p.red]?.nombre ?? p.red}
            {p.cuentaNombre ? ` · ${p.cuentaNombre}` : ""}
            <span className="tabular-nums text-white/35">{compacto(puntos[puntos.length - 1].vistas, locale)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
