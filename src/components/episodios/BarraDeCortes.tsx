"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AudioLines, Info, LoaderCircle, Scissors, Trash2, X } from "lucide-react";
import { Pista } from "@/components/Pista";
import {
  agregarCorte,
  duracionEfectiva,
  estaCortado,
  pedazosDelClip,
  siguienteTiempoVisible,
  unirCortes,
  type Corte,
} from "@/lib/cortes";

/** Cuánto hay que mover el dedo para que un toque pase a ser un arrastre. */
const UMBRAL_ARRASTRE_PX = 5;

/**
 * Los cortes en el medio del clip, sobre una barra del clip entero (de su
 * inicio a su final, en segundos del episodio):
 *
 * - "Cortar acá" parte el pedazo donde está el cabezal.
 * - Tocar un pedazo lo elige; arrastrar marca un rango. "Quitar este pedazo"
 *   lo convierte en corte.
 * - Los cortes se ven rayados, cada uno con su ✕ para deshacerlo.
 * - "Quitar silencios largos" pide al servidor los silencios y los suma.
 *
 * Todo cambia el borrador del editor, que se guarda como el resto.
 */
export function BarraDeCortes({
  desde,
  hasta,
  cortes,
  t,
  onCambiar,
  onIr,
  onSugerirSilencios,
  deshabilitado,
}: {
  desde: number;
  hasta: number;
  /** Ya normalizados (lib/cortes). */
  cortes: Corte[];
  /** El cabezal, en segundos del episodio. */
  t: number;
  onCambiar: (cortes: Corte[]) => void;
  /** Lleva el video a un segundo del episodio. */
  onIr: (tEpisodio: number) => void;
  onSugerirSilencios?: () => Promise<Corte[]>;
  deshabilitado?: boolean;
}) {
  const tr = useTranslations("editorCortes");
  // Sin los ":" de useId: van en un url(#…).
  const idRayado = `rayado-${useId().replace(/:/g, "")}`;
  const barra = useRef<HTMLDivElement>(null);
  // Los puntos de "Cortar acá": solo parten la barra para elegir pedazos; lo
  // que se guarda son los cortes.
  const [puntos, setPuntos] = useState<number[]>([]);
  const [elegido, setElegido] = useState<Corte | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [silencios, setSilencios] = useState<{ n: number; seg: number; antes: Corte[] } | null>(null);
  const [buscando, setBuscando] = useState(false);

  // Si el tramo del clip cambia, la elección vieja puede quedar afuera.
  useEffect(() => {
    setElegido(null);
    setPuntos((ps) => ps.filter((p) => p > desde && p < hasta));
  }, [desde, hasta]);

  const total = Math.max(0.001, hasta - desde);
  const efectiva = duracionEfectiva(desde, hasta, cortes);
  const pedazos = pedazosDelClip(desde, hasta, cortes, puntos);
  const pct = (seg: number) => ((seg - desde) / total) * 100;
  const deClip = (seg: number) => relojFino(seg - desde);

  function segDe(clientX: number, caja: DOMRect) {
    return desde + Math.min(1, Math.max(0, (clientX - caja.left) / caja.width)) * total;
  }

  function tocarBarra(e: React.PointerEvent) {
    const caja = barra.current?.getBoundingClientRect();
    if (!caja || e.button !== 0) return;
    e.preventDefault();
    const x0 = e.clientX;
    const s0 = segDe(x0, caja);
    let arrastrando = false;
    const mover = (ev: PointerEvent) => {
      if (deshabilitado) return;
      if (!arrastrando && Math.abs(ev.clientX - x0) < UMBRAL_ARRASTRE_PX) return;
      arrastrando = true;
      const s = segDe(ev.clientX, caja);
      setElegido({ desdeSeg: Math.min(s0, s), hastaSeg: Math.max(s0, s) });
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      if (arrastrando) return;
      // Un toque: el video va ahí y se elige el pedazo.
      onIr(siguienteTiempoVisible(s0, cortes));
      if (!deshabilitado) setElegido(pedazos.find((p) => s0 >= p.desdeSeg && s0 < p.hastaSeg) ?? null);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  function cortarAca() {
    setAviso(null);
    if (t <= desde || t >= hasta || estaCortado(t, cortes)) return;
    setPuntos((ps) => [...ps.filter((p) => Math.abs(p - t) > 0.05), Math.round(t * 1000) / 1000]);
    setElegido(null);
  }

  function quitarElegido() {
    if (!elegido) return;
    const r = agregarCorte(cortes, elegido, desde, hasta);
    if (!r) {
      setAviso(tr("noQuitarTodo"));
      return;
    }
    setAviso(null);
    setElegido(null);
    onCambiar(r);
  }

  function deshacerCorte(c: Corte) {
    onCambiar(cortes.filter((x) => x !== c));
  }

  async function quitarSilencios() {
    if (!onSugerirSilencios) return;
    setAviso(null);
    setSilencios(null);
    setBuscando(true);
    try {
      const sugeridos = await onSugerirSilencios();
      const unidos = unirCortes(cortes, sugeridos, desde, hasta);
      const seg = efectiva - duracionEfectiva(desde, hasta, unidos);
      if (seg < 0.05) {
        setAviso(tr("sinSilencios"));
        return;
      }
      setSilencios({ n: sugeridos.length, seg, antes: cortes });
      setElegido(null);
      onCambiar(unidos);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : tr("errorSilencios"));
    } finally {
      setBuscando(false);
    }
  }

  const boton =
    "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/15 px-2.5 text-xs text-white/80 hover:bg-white/5 disabled:opacity-40";

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-white/45">
        <span className="flex items-center gap-1.5 whitespace-nowrap font-medium uppercase tracking-wide text-white/50">
          {tr("titulo")}
          <Pista texto={tr("ayuda")}>
            <Info size={14} className="text-white/40" aria-label={tr("ayudaEtiqueta")} tabIndex={0} />
          </Pista>
        </span>
        <span className="whitespace-nowrap tabular-nums">
          {cortes.length ? tr("duracion", { efectiva: reloj(efectiva), total: reloj(total) }) : reloj(total)}
        </span>
      </div>

      <div
        ref={barra}
        onPointerDown={tocarBarra}
        className="relative h-10 cursor-pointer touch-none select-none overflow-hidden rounded-md bg-white/[0.06]"
      >
        <svg className="absolute h-0 w-0" aria-hidden>
          <defs>
            <pattern id={idRayado} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="2" height="6" fill="rgba(248,113,113,0.6)" />
            </pattern>
          </defs>
        </svg>
        {pedazos.map((p) => {
          const esElegido = elegido && Math.abs(elegido.desdeSeg - p.desdeSeg) < 0.001 && Math.abs(elegido.hastaSeg - p.hastaSeg) < 0.001;
          return (
            <div
              key={`${p.desdeSeg}-${p.hastaSeg}`}
              className={`pointer-events-none absolute inset-y-0 rounded-sm border ${
                esElegido ? "border-2 border-marca bg-marca/20" : "border-ng-azul/50 bg-ng-teal/15"
              }`}
              style={{ left: `${pct(p.desdeSeg)}%`, width: `${pct(p.hastaSeg) - pct(p.desdeSeg)}%` }}
            />
          );
        })}
        {/* El rango que se está marcando arrastrando (no coincide con un pedazo). */}
        {elegido && !pedazos.some((p) => Math.abs(elegido.desdeSeg - p.desdeSeg) < 0.001 && Math.abs(elegido.hastaSeg - p.hastaSeg) < 0.001) && (
          <div
            className="pointer-events-none absolute inset-y-0 border-2 border-marca bg-marca/25"
            style={{ left: `${pct(elegido.desdeSeg)}%`, width: `${pct(elegido.hastaSeg) - pct(elegido.desdeSeg)}%` }}
          />
        )}
        {cortes.map((c) => (
          <div
            key={`${c.desdeSeg}-${c.hastaSeg}`}
            className="absolute inset-y-0 flex min-w-[2px] items-start justify-center bg-black/50"
            style={{ left: `${pct(c.desdeSeg)}%`, width: `${pct(c.hastaSeg) - pct(c.desdeSeg)}%` }}
            title={tr("corte", { desde: deClip(c.desdeSeg), hasta: deClip(c.hastaSeg) })}
          >
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              <rect width="100%" height="100%" fill={`url(#${idRayado})`} />
            </svg>
            {!deshabilitado && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => deshacerCorte(c)}
                aria-label={tr("deshacerCorte", { desde: deClip(c.desdeSeg), hasta: deClip(c.hastaSeg) })}
                className="relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ng-tinta text-white ring-1 ring-red-400/70 hover:bg-red-500"
              >
                <X size={10} strokeWidth={3} />
              </button>
            )}
          </div>
        ))}
        {t >= desde && t <= hasta && (
          <div className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-white" style={{ left: `${pct(t)}%` }} />
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Pista texto={tr("ayudaCortarAca")}>
          <button className={boton} disabled={deshabilitado || t <= desde || t >= hasta || Boolean(estaCortado(t, cortes))} onClick={cortarAca}>
            <Scissors size={13} aria-hidden />
            {tr("cortarAca")}
          </button>
        </Pista>
        <button className={boton} disabled={deshabilitado || !elegido} onClick={quitarElegido}>
          <Trash2 size={13} aria-hidden />
          {tr("quitarPedazo")}
        </button>
        {onSugerirSilencios && (
          <Pista texto={tr("ayudaSilencios")} lado="abajo-derecha">
            <button className={`${boton} ml-auto`} disabled={deshabilitado || buscando} onClick={() => void quitarSilencios()}>
              {buscando ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <AudioLines size={13} aria-hidden />}
              {tr("quitarSilencios")}
            </button>
          </Pista>
        )}
      </div>

      {silencios && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-marca/30 bg-marca/10 px-3 py-2 text-xs text-white/85">
          <span className="flex-1">{tr("silenciosMarcados", { n: silencios.n, seg: silencios.seg.toFixed(1) })}</span>
          <button
            onClick={() => {
              onCambiar(silencios.antes);
              setSilencios(null);
            }}
            className="font-medium text-ng-celeste hover:underline"
          >
            {tr("deshacer")}
          </button>
          <button onClick={() => setSilencios(null)} aria-label={tr("cerrar")} className="text-white/40 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}
      {aviso && <p className="mt-2 text-xs text-amber-300">{aviso}</p>}

      {cortes.length > 0 && (
        // Cada corte también en una fila: los muy cortos casi no se ven en la barra.
        <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {cortes.map((c) => (
            <span
              key={`${c.desdeSeg}-${c.hastaSeg}`}
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-red-400/30 px-2 py-0.5 text-xs tabular-nums text-white/60"
            >
              <button onClick={() => onIr(Math.max(desde, c.desdeSeg - 1))} className="line-through decoration-red-400/70">
                {deClip(c.desdeSeg)}–{deClip(c.hastaSeg)}
              </button>
              {!deshabilitado && (
                <button
                  onClick={() => deshacerCorte(c)}
                  aria-label={tr("deshacerCorte", { desde: deClip(c.desdeSeg), hasta: deClip(c.hastaSeg) })}
                  className="text-white/40 hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** 48.2 → "0:48". */
export function reloj(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 12.34 → "0:12.3": los cortes son de décimas. */
function relojFino(seg: number): string {
  const s = Math.max(0, seg);
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
}
