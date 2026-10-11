"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Captions, Layers, LoaderCircle, Music, RectangleVertical, ScanFace, Scissors, Type, type LucideIcon } from "lucide-react";
import { HERRAMIENTAS, type Herramienta } from "./tipos";

const ICONOS: Record<Herramienta, LucideIcon> = {
  editar: Scissors,
  texto: Type,
  subtitulos: Captions,
  superposicion: Layers,
  audio: Music,
  formato: RectangleVertical,
  auto: ScanFace,
};

/**
 * La barra de herramientas, como la de CapCut: vertical a la izquierda en lo
 * ancho; en el teléfono, una fila que se corre de costado. Es un `tablist`:
 * las flechas, Inicio y Fin la recorren.
 */
export function RielHerramientas({
  activa,
  onElegir,
  analizando,
}: {
  activa: Herramienta;
  onElegir: (h: Herramienta) => void;
  /** El auto-encuadre está mirando: la herramienta lo muestra girando. */
  analizando: boolean;
}) {
  const tr = useTranslations("editorHerramientas");
  const riel = useRef<HTMLElement>(null);

  function teclas(e: React.KeyboardEvent) {
    const i = HERRAMIENTAS.indexOf(activa);
    let j: number | null = null;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") j = (i + 1) % HERRAMIENTAS.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") j = (i - 1 + HERRAMIENTAS.length) % HERRAMIENTAS.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = HERRAMIENTAS.length - 1;
    if (j === null) return;
    e.preventDefault();
    onElegir(HERRAMIENTAS[j]);
    riel.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[j]?.focus();
  }

  return (
    <nav
      ref={riel}
      role="tablist"
      aria-label={tr("herramientas")}
      onKeyDown={teclas}
      className="flex gap-1 overflow-x-auto px-2 py-2 md:flex-col md:overflow-visible md:px-2 md:py-3"
    >
      {HERRAMIENTAS.map((h) => {
        const Icono = h === "auto" && analizando ? LoaderCircle : ICONOS[h];
        const elegida = h === activa;
        return (
          <button
            key={h}
            id={`herramienta-${h}`}
            type="button"
            role="tab"
            aria-selected={elegida}
            aria-controls="panel-herramienta"
            tabIndex={elegida ? 0 : -1}
            onClick={() => onElegir(h)}
            className={`flex w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-ng-md px-1 py-2.5 text-[11px] font-medium transition md:w-[76px] ${
              elegida ? "bg-ng-superficie text-ng-azul" : "text-ng-secundario hover:bg-ng-superficie hover:text-white"
            }`}
          >
            <Icono size={20} aria-hidden className={h === "auto" && analizando ? "animate-spin" : undefined} />
            <span className="leading-tight">{tr(`nombres.${h}`)}</span>
          </button>
        );
      })}
    </nav>
  );
}
