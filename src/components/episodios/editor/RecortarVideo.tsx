"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  MINIMO_VIDEO_SEG,
  conTramoDelArchivo,
  lugarEnElClip,
  tramoDelArchivo,
  type TramoDelClip,
  type VideoClip,
} from "@/lib/videos-clip";
import { TiraDeCuadros } from "./TiraDeCuadros";
import { relojFino } from "./tipos";

type Manija = "inicio" | "fin";

/**
 * Recortar un video de encima, como en CapCut: la barra es el archivo entero
 * (con sus cuadros) y las dos manijas marcan el tramo que se usa. La de la
 * izquierda es `inicioSeg`; la de la derecha, hasta dónde se ve (pasa a
 * `hastaSeg` en el tiempo del clip). El video sigue apareciendo en el mismo
 * segundo del clip.
 *
 * Mientras se arrastra se ve el cuadro de la manija y no se guarda nada: al
 * soltar, un solo cambio (un paso de deshacer, un guardado).
 *
 * Lo rayado del final es lo que no entra: el clip termina antes.
 */
export function RecortarVideo({
  video: v,
  tramo,
  onCambiar,
  deshabilitado,
}: {
  video: VideoClip;
  tramo: TramoDelClip;
  onCambiar: (v: VideoClip) => void;
  deshabilitado?: boolean;
}) {
  const tr = useTranslations("editorVideos");
  const barra = useRef<HTMLDivElement>(null);
  const previa = useRef<HTMLVideoElement>(null);
  const [falla, setFalla] = useState(false);
  const [arrastre, setArrastre] = useState<{ inicio: number; fin: number; manija: Manija } | null>(null);

  const dura = Math.max(0.001, v.duracionSeg);
  const guardado = tramoDelArchivo(v, tramo);
  const { inicio, fin } = arrastre ?? guardado;
  const lugar = lugarEnElClip(v, tramo);
  /** Hasta dónde del archivo entra en el clip con este inicio. */
  const limite = Math.min(dura, inicio + lugar);
  const pct = (s: number) => `${(Math.min(Math.max(s, 0), dura) / dura) * 100}%`;
  const todo = v.inicioSeg === 0 && !v.hastaSeg;

  // El cuadro de la vista previa: el de la manija que se arrastra; quieto, el del inicio.
  const cuadro = arrastre ? (arrastre.manija === "inicio" ? arrastre.inicio : Math.max(0, arrastre.fin - 0.05)) : inicio;
  useEffect(() => {
    const el = previa.current;
    if (!el || falla) return;
    if (Math.abs(el.currentTime - cuadro) > 0.03) el.currentTime = cuadro;
  }, [cuadro, falla]);
  useEffect(() => setFalla(false), [v.url]);

  /** Los topes de cada manija: no se cruzan, y el final no pasa de lo que entra en el clip. */
  function ajustar(manija: Manija, s: number, actual: { inicio: number; fin: number }) {
    if (manija === "inicio") {
      const i = Math.min(Math.max(0, s), actual.fin - MINIMO_VIDEO_SEG);
      return { inicio: Math.max(0, i), fin: Math.min(actual.fin, i + lugar) };
    }
    const tope = Math.min(dura, actual.inicio + lugar);
    return { inicio: actual.inicio, fin: Math.max(Math.min(s, tope), Math.min(tope, actual.inicio + MINIMO_VIDEO_SEG)) };
  }

  function guardar(t: { inicio: number; fin: number }) {
    const n = conTramoDelArchivo(v, t.inicio, t.fin, tramo);
    if (n.inicioSeg !== v.inicioSeg || n.hastaSeg !== v.hastaSeg) onCambiar(n);
  }

  function agarrar(e: React.PointerEvent, manija: Manija) {
    if (deshabilitado || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const caja = barra.current?.getBoundingClientRect();
    if (!caja) return;
    const segDe = (x: number) => Math.min(1, Math.max(0, (x - caja.left) / caja.width)) * dura;
    const base = guardado;
    let ultimo = { ...base };
    let movido = false;
    const mover = (ev: PointerEvent) => {
      movido = true;
      ultimo = ajustar(manija, Math.round(segDe(ev.clientX) * 100) / 100, base);
      setArrastre({ ...ultimo, manija });
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
      setArrastre(null);
      if (movido) guardar(ultimo);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    setArrastre({ ...base, manija });
  }

  function teclas(e: React.KeyboardEvent, manija: Manija) {
    if (deshabilitado || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    e.stopPropagation();
    const paso = (e.shiftKey ? 1 : 0.1) * (e.key === "ArrowLeft" ? -1 : 1);
    guardar(ajustar(manija, (manija === "inicio" ? guardado.inicio : guardado.fin) + paso, guardado));
  }

  const manija = (m: Manija) => (
    <span
      role="slider"
      tabIndex={deshabilitado ? -1 : 0}
      aria-label={tr(m === "inicio" ? "manijaInicio" : "manijaFin")}
      aria-valuemin={0}
      aria-valuemax={Math.round(dura * 10) / 10}
      aria-valuenow={Math.round((m === "inicio" ? inicio : fin) * 10) / 10}
      aria-valuetext={relojFino(m === "inicio" ? inicio : fin)}
      aria-disabled={deshabilitado || undefined}
      onPointerDown={(e) => agarrar(e, m)}
      onKeyDown={(e) => teclas(e, m)}
      className={`absolute inset-y-0 z-10 flex w-3 touch-none items-center justify-center bg-ng-azul outline-none focus-visible:ring-2 focus-visible:ring-white ${
        deshabilitado ? "cursor-not-allowed opacity-60" : "cursor-ew-resize"
      } ${m === "inicio" ? "rounded-l-md" : "-translate-x-full rounded-r-md"}`}
      style={{ left: pct(m === "inicio" ? inicio : fin) }}
    >
      <span className="h-4 w-0.5 rounded-full bg-ng-tinta/70" aria-hidden />
    </span>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-white/50">{tr("recortar")}</p>
        {!deshabilitado && (
          <button
            type="button"
            onClick={() => onCambiar({ ...v, inicioSeg: 0, hastaSeg: null })}
            disabled={todo}
            className="rounded-md border border-white/15 px-2 py-0.5 text-[11px] text-white/70 hover:bg-white/5 disabled:opacity-40"
          >
            {tr("usarTodo")}
          </button>
        )}
      </div>

      {/* El cuadro donde está la manija */}
      <div className="flex justify-center">
        <div
          className="relative h-24 overflow-hidden rounded-md bg-black"
          style={{ aspectRatio: `${Math.max(1, v.anchoVideo)} / ${Math.max(1, v.altoVideo)}`, maxWidth: "100%" }}
        >
          {falla ? (
            <TiraDeCuadros url={v.url} duracionSeg={v.duracionSeg} className="h-full w-full" />
          ) : (
            <video
              ref={previa}
              src={v.url}
              muted
              playsInline
              preload="auto"
              onError={() => setFalla(true)}
              onLoadedMetadata={(e) => {
                if (!e.currentTarget.videoWidth) setFalla(true);
                else e.currentTarget.currentTime = cuadro;
              }}
              className="pointer-events-none block h-full w-full object-contain"
            />
          )}
          <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[10px] tabular-nums text-white">{relojFino(cuadro)}</span>
        </div>
      </div>

      {/* El archivo entero, con el tramo que se usa entre las manijas */}
      <div ref={barra} className="relative h-12 select-none overflow-hidden rounded-md">
        <TiraDeCuadros url={v.url} duracionSeg={v.duracionSeg} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-y-0 left-0 bg-black/65" style={{ width: pct(inicio) }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 bg-black/65" style={{ left: pct(fin) }} />
        {limite < dura - 0.05 && (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.5)_0_4px,transparent_4px_8px)]"
            style={{ left: pct(limite) }}
            title={tr("noEntra")}
          />
        )}
        <div className="pointer-events-none absolute inset-y-0 border-y-2 border-ng-azul" style={{ left: pct(inicio), width: `calc(${pct(fin)} - ${pct(inicio)})` }} />
        {manija("inicio")}
        {manija("fin")}
      </div>

      <div className="flex justify-between text-[11px] tabular-nums text-white/50">
        <span>{relojFino(inicio)}</span>
        <span className="text-white/80">{tr("tramo", { dura: relojFino(Math.max(0, fin - inicio)), total: relojFino(v.duracionSeg) })}</span>
        <span>{relojFino(fin)}</span>
      </div>
      {limite < dura - 0.05 && <p className="text-[11px] text-white/35">{tr("noEntraAyuda")}</p>}
    </div>
  );
}
