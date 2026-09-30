"use client";

import { useEffect, useState } from "react";

/**
 * Lo que se ve mientras el auto-encuadre mira el clip (ng-creator-be#105) y
 * al terminar: las etapas con su avance y cuánto falta, quién es quién y
 * cuánto quedó en pantalla, y "Volver a como estaba". Lo mismo que la app.
 */

export type PersonaAuto = { cx: number; segundos: number; retrato?: string | null };

const ETAPAS: { clave: string; texto: string }[] = [
  { clave: "BAJANDO", texto: "Bajando el tramo" },
  { clave: "CARAS", texto: "Buscando caras" },
  { clave: "VOCES", texto: "Escuchando quién habla" },
  { clave: "ARMANDO", texto: "Armando los encuadres" },
];

/** Segundos que faltan, a partir de lo que tardó hasta acá. Null mientras es muy pronto para saber. */
export function segundosQueFaltan(progreso: number, empezoEn: string | null | undefined, ahora: number): number | null {
  if (!empezoEn || progreso < 0.08 || progreso >= 1) return null;
  const pasado = (ahora - new Date(empezoEn).getTime()) / 1000;
  if (!(pasado > 0)) return null;
  return Math.max(1, Math.round((pasado * (1 - progreso)) / progreso));
}

function textoFalta(s: number): string {
  if (s < 60) return `faltan ~${s} s`;
  return `faltan ~${Math.round(s / 60)} min`;
}

function useAhora(activo: boolean): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!activo) return;
    const i = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(i);
  }, [activo]);
  return ahora;
}

export function PanelAutoEncuadre({
  estado,
  etapa,
  progreso,
  empezoEn,
  error,
  personas,
  cambios,
  mostrarResumen,
  deshacible,
  deshaciendo,
  onVerPrimerCambio,
  onDeshacer,
  onReintentar,
  onCerrar,
}: {
  estado: string | null | undefined;
  etapa: string | null | undefined;
  progreso: number | null | undefined;
  empezoEn: string | null | undefined;
  error: string | null | undefined;
  personas: PersonaAuto[];
  /** Cuántos cambios de encuadre armó. */
  cambios: number;
  /** El resumen se abre al terminar en esta visita; si no, solo el "Volver a como estaba". */
  mostrarResumen: boolean;
  deshacible: boolean;
  deshaciendo: boolean;
  onVerPrimerCambio: () => void;
  onDeshacer: () => void;
  onReintentar: () => void;
  onCerrar: () => void;
}) {
  const analizando = estado === "EN_COLA" || estado === "ANALIZANDO";
  const ahora = useAhora(analizando);

  if (analizando) {
    const enFila = estado === "EN_COLA";
    const p = Math.max(0, Math.min(1, progreso ?? 0));
    const actual = enFila ? -1 : Math.max(0, ETAPAS.findIndex((e) => e.clave === etapa));
    const falta = enFila ? null : segundosQueFaltan(p, empezoEn, ahora);
    return (
      <div className="mt-3 rounded-xl border border-ng-violeta/40 bg-ng-violeta/10 p-3" aria-live="polite">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">{enFila ? "En la fila, ya empieza…" : "Mirando quién habla"}</span>
          <span className="tabular-nums text-white/60">
            {Math.round(p * 100)}%{falta ? ` · ${textoFalta(falta)}` : ""}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-ng-violeta transition-all duration-700" style={{ width: `${Math.max(3, p * 100)}%` }} />
        </div>
        <ol className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
          {ETAPAS.map((e, i) => {
            const hecha = i < actual;
            const enCurso = i === actual;
            return (
              <li key={e.clave} className={`flex items-center gap-1.5 ${hecha ? "text-white/80" : enCurso ? "text-white" : "text-white/35"}`}>
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                    hecha ? "bg-emerald-500 text-white" : enCurso ? "animate-pulse bg-ng-violeta text-white" : "border border-white/20"
                  }`}
                >
                  {hecha ? "✓" : i + 1}
                </span>
                {e.texto}
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-white/50">Podés seguir editando textos y subtítulos: los encuadres llegan solos.</p>
      </div>
    );
  }

  if (estado === "FALLIDO" && error) {
    return (
      <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
        <p className="font-medium text-red-300">No se pudo auto-encuadrar</p>
        <p className="mt-1 text-white/70">{error}</p>
        <div className="mt-2 flex gap-2">
          <button onClick={onReintentar} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs hover:bg-white/15">
            Probar de nuevo
          </button>
          <button onClick={onCerrar} className="rounded-lg px-2.5 py-1 text-xs text-white/50 hover:text-white/80">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  if (estado === "LISTO" && mostrarResumen) {
    const conPantalla = personas.filter((x) => x.segundos > 0);
    return (
      <div className="mt-3 animate-[aparecer_0.4s_ease-out] rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium">
            ✓ Listo: {personas.length} persona{personas.length === 1 ? "" : "s"} · {cambios} cambio{cambios === 1 ? "" : "s"} de encuadre
          </p>
          <button onClick={onCerrar} className="text-white/40 hover:text-white/80" title="Cerrar">
            ✕
          </button>
        </div>
        {conPantalla.length <= 1 && personas.length > 1 && (
          <p className="mt-1 text-xs text-amber-200/80">
            Encontré a {personas.length} personas, pero en este tramo habla una sola: el clip queda en esa persona.
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-3">
          {personas.map((x, i) => (
            <div key={i} className={`flex items-center gap-2 ${x.segundos > 0 ? "" : "opacity-40"}`}>
              {x.retrato ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={x.retrato} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs">{i + 1}</span>
              )}
              <span className="text-xs tabular-nums text-white/70">
                {x.segundos > 0 ? `${Math.round(x.segundos)} s` : "no habla"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {cambios > 1 && (
            <button onClick={onVerPrimerCambio} className="rounded-lg bg-ng-violeta px-2.5 py-1 text-xs font-medium text-white hover:brightness-110">
              ▶ Ver el primer cambio
            </button>
          )}
          {deshacible && (
            <button
              onClick={onDeshacer}
              disabled={deshaciendo}
              className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:bg-white/5 disabled:opacity-50"
            >
              ↩ Volver a como estaba
            </button>
          )}
        </div>
      </div>
    );
  }

  if (deshacible) {
    return (
      <button onClick={onDeshacer} disabled={deshaciendo} className="mt-2 text-xs text-white/50 underline hover:text-white/80 disabled:opacity-50">
        ↩ Volver a como estaba antes del auto-encuadre
      </button>
    );
  }
  return null;
}
