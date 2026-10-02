"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Pista } from "@/components/Pista";

export interface PestanaInspector<T extends string> {
  id: T;
  /** Corta: va debajo del ícono, en un riel angosto. */
  etiqueta: string;
  icono: LucideIcon;
  /** Para el título del panel, si dice más que la etiqueta. */
  titulo?: string;
  contenido: ReactNode;
}

const CLAVE = "ng:editor-clip:pestana";

/**
 * La pestaña activa del inspector: la que se abre con `#estilo`, `#textos`…
 * en la dirección, o si no la última que se usó (localStorage, si se puede).
 */
export function usePestanaInspector<T extends string>(ids: readonly T[], porDefecto: T) {
  const [pestana, setPestana] = useState<T>(porDefecto);
  const valida = useCallback((v: string | null | undefined): v is T => !!v && (ids as readonly string[]).includes(v), [ids]);

  useEffect(() => {
    const deLaDireccion = () => {
      const h = window.location.hash.replace(/^#/, "");
      if (valida(h)) {
        setPestana(h);
        return true;
      }
      return false;
    };
    if (!deLaDireccion()) {
      try {
        const guardada = window.localStorage.getItem(CLAVE);
        if (valida(guardada)) setPestana(guardada);
      } catch {
        // Sin almacenamiento (privado, bloqueado): arranca en la de siempre.
      }
    }
    window.addEventListener("hashchange", deLaDireccion);
    return () => window.removeEventListener("hashchange", deLaDireccion);
  }, [valida]);

  const elegir = useCallback((p: T) => {
    setPestana(p);
    try {
      window.localStorage.setItem(CLAVE, p);
    } catch {
      // Igual cambia; solo no se recuerda.
    }
  }, []);

  return [pestana, elegir] as const;
}

/**
 * El inspector del editor de clips: un riel de pestañas (ícono y etiqueta) y
 * al lado el panel de la activa, con su propio scroll. Así se edita un texto
 * o el estilo mirando la vista previa, sin bajar y volver a subir.
 *
 * En pantallas chicas el riel se vuelve una barra horizontal arriba del panel.
 * El riel es un `tablist`: las flechas (arriba/abajo o izquierda/derecha),
 * Inicio y Fin recorren las pestañas.
 */
export function InspectorClip<T extends string>({
  pestanas,
  activa,
  onElegir,
}: {
  pestanas: PestanaInspector<T>[];
  activa: T;
  onElegir: (p: T) => void;
}) {
  const base = useId();
  const riel = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const actual = pestanas.find((p) => p.id === activa) ?? pestanas[0];
  // El riel es vertical desde md; más angosto, una barra horizontal.
  const [vertical, setVertical] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setVertical(mq.matches);
    const cambio = (e: MediaQueryListEvent) => setVertical(e.matches);
    mq.addEventListener("change", cambio);
    return () => mq.removeEventListener("change", cambio);
  }, []);

  // Al cambiar de pestaña, el panel arranca arriba.
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [actual.id]);

  function teclas(e: React.KeyboardEvent) {
    const i = pestanas.findIndex((p) => p.id === actual.id);
    let j: number | null = null;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") j = (i + 1) % pestanas.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") j = (i - 1 + pestanas.length) % pestanas.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = pestanas.length - 1;
    if (j === null) return;
    e.preventDefault();
    onElegir(pestanas[j].id);
    riel.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[j]?.focus();
  }

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] md:h-full md:flex-row">
      <div
        ref={riel}
        role="tablist"
        aria-label="Ajustes del clip"
        aria-orientation={vertical ? "vertical" : "horizontal"}
        onKeyDown={teclas}
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 p-1.5 md:w-[52px] md:flex-col md:items-center md:overflow-visible md:border-b-0 md:border-r"
      >
        {pestanas.map((p) => {
          const elegida = p.id === actual.id;
          const Icono = p.icono;
          return (
            // Desde md, solo el ícono: el nombre va en la pista, que sale a la
            // derecha (sobre el panel, no sobre la vista previa).
            <Pista key={p.id} texto={p.titulo ?? p.etiqueta} lado="derecha" className="shrink-0">
              <button
                id={`${base}-pestana-${p.id}`}
                type="button"
                role="tab"
                aria-selected={elegida}
                aria-controls={`${base}-panel`}
                aria-label={p.titulo ?? p.etiqueta}
                tabIndex={elegida ? 0 : -1}
                onClick={() => onElegir(p.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition md:h-10 md:w-10 md:justify-center md:p-0 ${
                  elegida ? "bg-ng-azul/20 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icono size={18} aria-hidden className={elegida ? "text-ng-celeste" : undefined} />
                <span className="leading-tight md:sr-only">{p.etiqueta}</span>
              </button>
            </Pista>
          );
        })}
      </div>
      <div
        ref={panel}
        id={`${base}-panel`}
        role="tabpanel"
        aria-labelledby={`${base}-pestana-${actual.id}`}
        tabIndex={0}
        className="min-h-0 min-w-0 flex-1 p-4 outline-none md:overflow-y-auto"
      >
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">{actual.titulo ?? actual.etiqueta}</h2>
        {actual.contenido}
      </div>
    </div>
  );
}
