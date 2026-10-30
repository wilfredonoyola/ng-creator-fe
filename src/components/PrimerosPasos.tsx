"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Circle } from "lucide-react";
import { usePrimerosPasos } from "@/lib/primeros-pasos";

/**
 * La guía de primeros pasos en el menú (ng-creator-be#273): cuántos lleva, el
 * que sigue y, al abrirla, los cuatro. Solo para el propietario y mientras le
 * falte algo obligatorio; "Ocultar" la saca (vuelve desde Perfil).
 *
 * En la tira de íconos queda como el conteo; tocarlo expande el menú.
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
  const { pasos, hechos, siguiente, visible, ocultar, guardando } = usePrimerosPasos();
  const [abierta, setAbierta] = useState(false);

  if (!visible) return null;
  const total = pasos.length;

  return (
    <>
      {colapsado && (
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

      <div className={`mx-3 mb-3 rounded-xl border border-white/10 bg-white/5 p-3 ${colapsado ? "md:hidden" : ""}`}>
        <button
          onClick={() => setAbierta((a) => !a)}
          aria-expanded={abierta}
          className="flex w-full items-center gap-2 text-left"
        >
          <span className="flex-1 text-sm font-semibold">{t("titulo")}</span>
          <span className="text-xs text-white/50">
            {hechos}/{total}
          </span>
          <ChevronDown size={14} aria-hidden className={`text-white/40 transition ${abierta ? "rotate-180" : ""}`} />
        </button>

        <div className="mt-2 flex gap-1" aria-hidden>
          {pasos.map((p) => (
            <span key={p.clave} className={`h-1 flex-1 rounded-full ${p.hecho ? "bg-marca" : "bg-white/10"}`} />
          ))}
        </div>

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
            <li className="pt-1">
              <button
                onClick={() => void ocultar(true)}
                disabled={guardando}
                className="px-1 text-[11px] text-white/40 transition hover:text-white disabled:opacity-50"
              >
                {t("ocultar")}
              </button>
            </li>
          </ul>
        ) : (
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

/**
 * En Perfil: volver a mostrar la guía que se ocultó, u ocultarla. Solo el
 * propietario y mientras falte algo; si no, no aparece.
 */
export function AjustePrimerosPasos({ marcaNombre }: { marcaNombre?: string }) {
  const t = useTranslations("primerosPasos");
  const { vista, ocultar, guardando } = usePrimerosPasos();
  if (!vista || vista.completos) return null;

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="font-semibold">{t("titulo")}</h2>
      <p className="mt-1 text-sm text-white/60">
        {vista.oculta ? t("perfil.oculta", { marca: marcaNombre ?? "" }) : t("perfil.visible", { marca: marcaNombre ?? "" })}
      </p>
      <button
        onClick={() => void ocultar(!vista.oculta)}
        disabled={guardando}
        className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5 disabled:opacity-50"
      >
        {vista.oculta ? t("perfil.mostrar") : t("ocultar")}
      </button>
    </section>
  );
}
