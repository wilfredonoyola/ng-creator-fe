"use client";

import { useLocale, useTranslations } from "next-intl";
import { COLOR_SERIE } from "@/lib/analitica";
import { porcentaje, seFueEnTres } from "@/lib/metricas";

/**
 * La retención de TikTok: qué parte de la gente sigue mirando en cada segundo.
 *
 * Los primeros 3 segundos van marcados porque es donde se juega el clip: si
 * ahí se va la mitad, el problema es el gancho, no el resto del video.
 */
export function CurvaRetencion({
  retencion,
  fraccionCompleta,
}: {
  retencion: { seg: number; fraccion: number }[];
  /** Qué parte llegó al final, según TikTok. */
  fraccionCompleta?: number | null;
}) {
  const t = useTranslations("metricasGraficos");
  const locale = useLocale();
  const puntos = [...retencion].sort((a, b) => a.seg - b.seg);
  if (puntos.length < 2) return null;

  const ANCHO = 300;
  const ALTO = 90;
  const IZQ = 22;
  const maxSeg = Math.max(puntos[puntos.length - 1].seg, 1);
  const x = (s: number) => IZQ + (s / maxSeg) * (ANCHO - IZQ - 4);
  const y = (f: number) => ALTO - Math.min(Math.max(f, 0), 1) * (ALTO - 4);
  const linea = puntos.map((p) => `${x(p.seg)},${y(p.fraccion)}`).join(" ");
  const area = `${x(puntos[0].seg)},${ALTO} ${linea} ${x(puntos[puntos.length - 1].seg)},${ALTO}`;
  const enTres = seFueEnTres(puntos);
  // Las marcas del eje: cada 5 o 10 segundos según lo que dure.
  const cada = maxSeg > 40 ? 10 : 5;
  const marcas = Array.from({ length: Math.floor(maxSeg / cada) + 1 }, (_, i) => i * cada);

  return (
    <div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {enTres != null && (
          <p>
            {t.rich("seFueEnTres", {
              pct: porcentaje(enTres, locale, 0),
              b: (c) => <strong className="texto-marca">{c}</strong>,
            })}
          </p>
        )}
        {fraccionCompleta != null && (
          <p>
            {t.rich("vioEntero", {
              pct: porcentaje(fraccionCompleta, locale, 1),
              b: (c) => <strong>{c}</strong>,
            })}
          </p>
        )}
      </div>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO + 14}`} className="mt-2 w-full" role="img" aria-label={t("retencionTitulo")}>
        {/* Los primeros 3 segundos, la zona del gancho. */}
        <rect x={x(0)} y={0} width={Math.max(x(Math.min(3, maxSeg)) - x(0), 0)} height={ALTO} fill={COLOR_SERIE} opacity="0.12" />
        <text x={x(0) + 2} y={8} fontSize="6" fill={COLOR_SERIE}>
          {t("gancho")}
        </text>
        {[0.5, 1].map((f) => (
          <g key={f}>
            <line x1={IZQ} x2={ANCHO} y1={y(f)} y2={y(f)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={IZQ - 3} y={y(f) + 2} textAnchor="end" fontSize="6" fill="rgba(255,255,255,0.35)">
              {porcentaje(f, locale, 0)}
            </text>
          </g>
        ))}
        <polygon points={area} fill="rgba(255,255,255,0.06)" />
        <polyline points={linea} fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1={IZQ} x2={ANCHO} y1={ALTO} y2={ALTO} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        {marcas.map((s) => (
          <text key={s} x={x(s)} y={ALTO + 10} textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.35)">
            {t("segundos", { n: s })}
          </text>
        ))}
      </svg>
    </div>
  );
}
