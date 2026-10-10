"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LoaderCircle, ScanFace } from "lucide-react";

/**
 * Auto-encuadre (ng-creator-be#105): mira quién habla y arma los cambios de
 * encuadre solo. Acá se pide, se ve cómo avanza y se vuelve a como estaba.
 * El cuadro entero queda a la vista para ajustar lo que armó.
 */
export function PanelAuto({
  analizando,
  progreso,
  personas,
  onPedir,
  estadoYResumen,
  puedeEditar,
}: {
  analizando: boolean;
  /** 0-1 mientras analiza. */
  progreso?: number | null;
  /** Cuántas personas encontró la última vez. */
  personas?: number | null;
  onPedir: () => void;
  /** El panel de avance y resultado (PanelAutoEncuadre). */
  estadoYResumen: ReactNode;
  puedeEditar: boolean;
}) {
  const tr = useTranslations("editorRecorte");
  const th = useTranslations("editorHerramientas");
  return (
    <div className="space-y-4">
      <p className="text-sm text-white/70">{tr("ayudaAuto")}</p>
      {puedeEditar && (
        <button
          type="button"
          onClick={onPedir}
          disabled={analizando}
          className="flex w-full items-center justify-center gap-2 rounded-ng-md bg-ng-azul px-4 py-2.5 text-sm font-semibold text-ng-tinta hover:brightness-110 disabled:opacity-70"
        >
          {analizando ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <ScanFace size={16} aria-hidden />}
          {analizando
            ? `${tr("mirando")} ${progreso ? `${Math.round(progreso * 100)}%` : ""}`
            : personas != null
              ? th("auto.deNuevo")
              : th("auto.pedir")}
        </button>
      )}
      {personas != null && !analizando && <p className="text-xs text-ng-secundario">{th("auto.encontro", { n: personas })}</p>}
      {estadoYResumen}
      <p className="text-xs text-ng-tenue">{th("auto.ajustar")}</p>
    </div>
  );
}
