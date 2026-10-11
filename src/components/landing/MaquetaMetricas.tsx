import { useTranslations } from "next-intl";
import { ETIQUETA, MONO } from "@/components/landing/Publica";

/**
 * La viñeta de las métricas en la landing: lo que ve una agencia en
 * /metricas, con datos de ejemplo. La forma de la retención es la de un clip
 * real de TikTok (9/10/2026); los números están redondeados y no son de ningún
 * cliente.
 */

const RETENCION = [1, 0.85, 0.69, 0.61, 0.55, 0.52, 0.5, 0.48, 0.46, 0.43, 0.41, 0.4, 0.39, 0.37, 0.36, 0.35, 0.34, 0.34];

/** Los valores van en los mensajes: "6,4 %" en español es "6.4%" en inglés. */
const KPIS = ["vistas", "tasa", "seguidores", "completo"] as const;

/** Vistas promedio por rango de puntuación de la IA, de 0 a 1. */
const IA = [
  { rango: "90+", valor: 1 },
  { rango: "70-89", valor: 0.46 },
  { rango: "50-69", valor: 0.22 },
] as const;

const FORMATOS = ["PDF", "CSV", "Markdown"] as const;

/** La curva de retención, en un lienzo de 100 x 40. */
function Retencion() {
  const t = useTranslations("landing.metricas.maqueta");
  const x = (i: number) => (i / (RETENCION.length - 1)) * 100;
  const y = (f: number) => 4 + (1 - f) * 34;
  const linea = RETENCION.map((f, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(f).toFixed(2)}`).join(" ");
  const tresSeg = x(3);
  return (
    <div className="flex flex-col gap-2 rounded bg-[#1C1C1A] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-white">{t("retencion")}</span>
        <span className="text-[10px]">TikTok</span>
      </div>
      <svg viewBox="0 0 100 42" preserveAspectRatio="none" className="h-24 w-full" aria-hidden>
        <rect x="0" y="0" width={tresSeg} height="42" fill="#FFD400" opacity="0.12" />
        <line x1={tresSeg} x2={tresSeg} y1="0" y2="42" stroke="#FFD400" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
        <path d={`${linea} L100,42 L0,42 Z`} fill="#FFFFFF" opacity="0.06" />
        <path d={linea} fill="none" stroke="#FFD400" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between gap-2 text-[10px]">
        <span className="text-[#FFD400]">{t("seVan")}</span>
        <span>{t("completo")}</span>
      </div>
    </div>
  );
}

export function MaquetaMetricas() {
  const t = useTranslations("landing.metricas.maqueta");
  return (
    <div
      role="img"
      aria-label={t("alt")}
      className={`${MONO} flex flex-col gap-3 rounded-xl border border-[#2E2E2B] bg-[#141413] p-4 text-[11px] text-[#A3A29C] sm:p-5`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-white">{t("encabezado")}</span>
        <span className="shrink-0 rounded-full border border-dashed border-[#6B6A64] px-2 py-0.5 text-[10px]">{t("ejemplo")}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k} className="flex flex-col gap-1 rounded bg-[#1C1C1A] p-2.5">
            <span className="truncate text-[10px]">{t(`kpis.${k}.nombre`)}</span>
            <span className="font-[family-name:var(--font-archivo)] text-[22px] font-extrabold leading-none text-white">{t(`kpis.${k}.valor`)}</span>
            <span className="text-[10px] text-[#FFD400]">▲ {t(`kpis.${k}.cambio`)}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Retencion />
        <div className="flex flex-col gap-2 rounded bg-[#1C1C1A] p-3">
          <span className="text-white">{t("iaVsRealidad")}</span>
          <div className="flex flex-1 flex-col justify-center gap-2.5">
            {IA.map((g, i) => (
              <div key={g.rango} className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-[10px]">{g.rango}</span>
                <span className="h-2.5 flex-1 rounded-sm bg-[#262624]">
                  <span
                    className={`block h-full rounded-sm ${i === 0 ? "bg-[#FFD400]" : "bg-[#5A5954]"}`}
                    style={{ width: `${g.valor * 100}%` }}
                  />
                </span>
              </div>
            ))}
          </div>
          <span className="text-[10px]">{t("vistasPromedio")}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2E2E2B] pt-3">
        <span className="truncate">{t("mejorClip")}</span>
        <span className="flex gap-1.5">
          {FORMATOS.map((f) => (
            <span key={f} className={`${ETIQUETA} rounded border border-[#3A3A36] px-2 py-0.5 text-[10px] font-bold text-white`}>
              {f}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
