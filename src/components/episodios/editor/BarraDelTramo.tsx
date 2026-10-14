"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { Pista } from "@/components/Pista";
import { reloj } from "./tipos";

/** Tope de un clip a mano, el mismo que valida el backend. */
const CLIP_MAXIMO_SEG = 180;

/**
 * El tramo del clip dentro del episodio, para extenderlo o acortarlo
 * arrastrando sus bordes. Muestra un poco de episodio a cada lado: lo que se
 * podría sumar. La línea de tiempo de abajo es solo del clip; esto es lo que
 * deja salirse de él.
 *
 * La ventana se congela al empezar a arrastrar; si se recalculara con cada
 * movimiento, la barra se correría debajo del dedo.
 */
export function BarraDelTramo({
  desde,
  hasta,
  t,
  duracionEpisodio,
  onCambiar,
  deshabilitado,
}: {
  desde: number;
  hasta: number;
  t: number;
  duracionEpisodio: number;
  onCambiar: (desde: number, hasta: number) => void;
  deshabilitado?: boolean;
}) {
  const tr = useTranslations("editorRecorte");
  const barra = useRef<HTMLDivElement>(null);
  const [fija, setFija] = useState<{ ini: number; fin: number } | null>(null);
  const margen = Math.max(30, (hasta - desde) * 0.6);
  const ventana = fija ?? {
    ini: Math.max(0, desde - margen),
    fin: Math.min(duracionEpisodio || hasta + margen, hasta + margen),
  };
  const largo = Math.max(1, ventana.fin - ventana.ini);
  const pct = (seg: number) => ((seg - ventana.ini) / largo) * 100;

  const acotar = (d: number, h: number) => {
    let a = Math.max(0, Math.round(d * 100) / 100);
    let b = Math.min(duracionEpisodio || h, Math.round(h * 100) / 100);
    if (b - a < 1) b = a + 1;
    if (b - a > CLIP_MAXIMO_SEG) {
      if (d !== desde) a = b - CLIP_MAXIMO_SEG;
      else b = a + CLIP_MAXIMO_SEG;
    }
    return [a, b] as const;
  };

  function arrastrar(e: React.PointerEvent, borde: "desde" | "hasta") {
    if (deshabilitado) return;
    e.preventDefault();
    const caja = barra.current?.getBoundingClientRect();
    if (!caja) return;
    const congelada = { ...ventana };
    setFija(congelada);
    const mover = (ev: PointerEvent) => {
      const seg = congelada.ini + ((ev.clientX - caja.left) / caja.width) * (congelada.fin - congelada.ini);
      if (borde === "desde") onCambiar(...acotar(Math.min(seg, hasta - 1), hasta));
      else onCambiar(...acotar(desde, Math.max(seg, desde + 1)));
    };
    const soltar = () => {
      setFija(null);
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  const boton = "whitespace-nowrap rounded border border-white/15 px-1.5 py-0.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-40";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-white/45">
        <span className="flex items-center gap-1.5 whitespace-nowrap font-medium text-white/60">
          {tr("barra.titulo")}
          <Pista texto={tr("barra.ayuda")}>
            <Info size={14} className="text-white/40" aria-label={tr("barra.ayudaEtiqueta")} tabIndex={0} />
          </Pista>
        </span>
        <span className="whitespace-nowrap tabular-nums">
          {reloj(desde)} – {reloj(hasta)}
        </span>
      </div>
      <div ref={barra} className="relative h-9 touch-none select-none rounded-md bg-white/[0.06]">
        <div className="absolute inset-y-0 rounded-md border-2 border-ng-azul bg-ng-azul/10" style={{ left: `${pct(desde)}%`, width: `${pct(hasta) - pct(desde)}%` }}>
          <div onPointerDown={(e) => arrastrar(e, "desde")} className="absolute -left-1.5 inset-y-0 w-3 cursor-ew-resize rounded-sm bg-ng-azul" title={tr("barra.arrastraInicio")} />
          <div onPointerDown={(e) => arrastrar(e, "hasta")} className="absolute -right-1.5 inset-y-0 w-3 cursor-ew-resize rounded-sm bg-ng-azul" title={tr("barra.arrastraFinal")} />
        </div>
        {t >= ventana.ini && t <= ventana.fin && <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white" style={{ left: `${pct(t)}%` }} />}
        <span className="pointer-events-none absolute bottom-0.5 left-1 text-xs leading-none tabular-nums text-white/30">{reloj(ventana.ini)}</span>
        <span className="pointer-events-none absolute bottom-0.5 right-1 text-xs leading-none tabular-nums text-white/30">{reloj(ventana.fin)}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-white/40">{tr("barra.inicio")}</span>
          <button className={boton} disabled={deshabilitado} onClick={() => onCambiar(...acotar(desde - 5, hasta))} title={tr("barra.inicioAntes")}>
            ←5s
          </button>
          <button className={boton} disabled={deshabilitado} onClick={() => onCambiar(...acotar(Math.min(desde + 5, hasta - 1), hasta))} title={tr("barra.inicioDespues")}>
            5s→
          </button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-white/40">{tr("barra.final")}</span>
          <button className={boton} disabled={deshabilitado} onClick={() => onCambiar(...acotar(desde, Math.max(hasta - 5, desde + 1)))} title={tr("barra.finalAntes")}>
            ←5s
          </button>
          <button className={boton} disabled={deshabilitado} onClick={() => onCambiar(...acotar(desde, hasta + 5))} title={tr("barra.finalDespues")}>
            5s→
          </button>
        </div>
      </div>
    </div>
  );
}

/** Un tiempo con ajuste fino: ±50 ms con los botones, o al milisegundo tipeando. */
export function AjusteFino({
  etiqueta,
  valor,
  onCambio,
  disabled,
}: {
  etiqueta: string;
  valor: number;
  onCambio: (v: number) => void;
  disabled?: boolean;
}) {
  const tr = useTranslations("editorClip");
  const [texto, setTexto] = useState(valor.toFixed(3));
  useEffect(() => setTexto(valor.toFixed(3)), [valor]);
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs text-white/50">{tr("delEpisodio", { etiqueta })}</p>
      {/* min-w-0: en el panel angosto la fila se achica (el numero) en vez de pisar la de al lado. */}
      <div className="flex min-w-0 items-center gap-1">
        <button type="button" disabled={disabled} onClick={() => onCambio(valor - 0.05)} className="shrink-0 rounded border border-white/15 px-2 py-1 text-xs">
          −50ms
        </button>
        <input
          value={texto}
          disabled={disabled}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => {
            const n = parseFloat(texto.replace(",", "."));
            if (Number.isFinite(n)) onCambio(n);
            else setTexto(valor.toFixed(3));
          }}
          className="w-24 min-w-0 flex-1 rounded border border-white/15 bg-black/30 px-2 py-1 text-center text-xs tabular-nums"
        />
        <button type="button" disabled={disabled} onClick={() => onCambio(valor + 0.05)} className="shrink-0 rounded border border-white/15 px-2 py-1 text-xs">
          +50ms
        </button>
      </div>
    </div>
  );
}
