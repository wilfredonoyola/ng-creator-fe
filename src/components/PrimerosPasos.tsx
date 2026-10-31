"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Circle } from "lucide-react";
import { usePrimerosPasos } from "@/lib/primeros-pasos";

/**
 * La guía de primeros pasos en el menú (ng-creator-be#273): cuántos lleva, el
 * que sigue y, al abrirla, los cuatro. Para el propietario (y un ADMIN, que
 * solo mira). No se oculta: mientras falten pasos es lo más importante del menú.
 *
 * Con los pasos hechos queda como una fila chica, "✓ Primeros pasos", que se
 * abre para ver el recorrido. En la tira de íconos queda el conteo mientras
 * falte algo; completa, no ocupa lugar ahí.
 */
export function PrimerosPasos({
  colapsado = false,
  onExpandir,
  ir,
}: {
  colapsado?: boolean;
  onExpandir?: () => void;
  ir: (href: string) => void;
}) {
  const t = useTranslations("primerosPasos");
  const { pasos, hechos, siguiente, visible, completos } = usePrimerosPasos();
  const [abierta, setAbierta] = useState(false);

  if (!visible) return null;
  const total = pasos.length;

  return (
    <>
      {colapsado && !completos && (
        <div className="hidden justify-center pb-2 md:flex">
          <button
            onClick={onExpandir}
            title={t("titulo")}
            aria-label={t("progreso", { hechos, total })}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-marca/40 text-[11px] font-bold text-marca transition hover:bg-white/10"
          >
            {hechos}/{total}
          </button>
        </div>
      )}

      <div
        className={`mx-3 mb-3 rounded-xl ${completos ? "px-3 py-2" : "border border-white/10 bg-white/5 p-3"} ${colapsado ? "md:hidden" : ""}`}
      >
        <button
          onClick={() => setAbierta((a) => !a)}
          aria-expanded={abierta}
          className="flex w-full items-center gap-2 text-left"
        >
          {completos && <Check size={14} aria-hidden className="shrink-0 text-marca" />}
          <span className={`flex-1 ${completos ? "text-xs text-white/50" : "text-sm font-semibold"}`}>{t("titulo")}</span>
          {!completos && (
            <span className="text-xs text-white/50">
              {hechos}/{total}
            </span>
          )}
          <ChevronDown size={14} aria-hidden className={`text-white/40 transition ${abierta ? "rotate-180" : ""}`} />
        </button>

        {!completos && (
          <div className="mt-2 flex gap-1" aria-hidden>
            {pasos.map((p) => (
              <span key={p.clave} className={`h-1 flex-1 rounded-full ${p.hecho ? "bg-marca" : "bg-white/10"}`} />
            ))}
          </div>
        )}

        {abierta ? (
          <ul className="mt-3 space-y-1">
            {pasos.map((p) => (
              <li key={p.clave}>
                <button
                  onClick={() => ir(p.href)}
                  className="flex w-full items-start gap-2 rounded-lg px-1 py-1.5 text-left text-xs transition hover:bg-white/5"
                >
                  {p.hecho ? (
                    <Check size={14} aria-hidden className="mt-px shrink-0 text-marca" />
                  ) : (
                    <Circle size={14} aria-hidden className="mt-px shrink-0 text-white/30" />
                  )}
                  <span className={p.hecho ? "text-white/40 line-through" : "text-white/80"}>
                    {t(`pasos.${p.clave}`)}
                    {p.opcional && <span className="ml-1 text-white/35 no-underline">({t("opcional")})</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          !completos &&
          siguiente && (
            <button
              onClick={() => ir(siguiente.href)}
              className="mt-3 w-full rounded-lg bg-marca px-3 py-2 text-left text-xs font-semibold text-ng-tinta transition hover:opacity-90"
            >
              {t(`siguiente.${siguiente.clave}`)}
            </button>
          )
        )}
      </div>
    </>
  );
}
