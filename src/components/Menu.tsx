"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface OpcionMenu {
  texto: string;
  icono?: ReactNode;
  /** Una línea chica debajo: por qué está apagada, o qué pasa al tocarla. */
  detalle?: string;
  onClick: () => void;
  deshabilitada?: boolean;
  peligro?: boolean;
}

/**
 * Un botón que abre una lista de acciones debajo. Se cierra al elegir, al
 * tocar afuera o con Escape; las flechas recorren las opciones.
 *
 * `boton` recibe si está abierto y devuelve el contenido del botón: el botón
 * mismo (alto, radio, colores) lo pone `claseBoton`, para que todos los de la
 * barra se vean iguales.
 */
export function Menu({
  etiqueta,
  boton,
  claseBoton,
  opciones,
  encabezado,
  alinear = "derecha",
}: {
  /** Para lectores de pantalla y el título al pasar el mouse. */
  etiqueta: string;
  boton: ReactNode;
  claseBoton: string;
  opciones: (OpcionMenu | null | false)[];
  /** Algo para leer arriba de las opciones (el estado, un error). */
  encabezado?: ReactNode;
  alinear?: "derecha" | "izquierda";
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const id = useId();
  const visibles = opciones.filter((o): o is OpcionMenu => Boolean(o));

  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    window.addEventListener("pointerdown", afuera);
    // Al abrir, el foco va a la primera opción que se puede usar.
    lista.current?.querySelector<HTMLButtonElement>("[role=menuitem]:not([disabled])")?.focus();
    return () => window.removeEventListener("pointerdown", afuera);
  }, [abierto]);

  function teclas(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setAbierto(false);
      caja.current?.querySelector<HTMLButtonElement>("[aria-haspopup]")?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(lista.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not([disabled])") ?? []);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const siguiente = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[siguiente].focus();
  }

  return (
    <div ref={caja} className="relative" onKeyDown={teclas}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? id : undefined}
        aria-label={etiqueta}
        onClick={() => setAbierto((a) => !a)}
        className={claseBoton}
      >
        {boton}
      </button>
      {abierto && (
        <div
          ref={lista}
          id={id}
          role="menu"
          aria-label={etiqueta}
          className={`absolute top-full z-50 mt-1.5 w-64 rounded-ng-md border border-white/10 bg-ng-elevada p-1.5 shadow-2xl shadow-black/50 ${
            alinear === "derecha" ? "right-0" : "left-0"
          }`}
        >
          {encabezado && <div className="border-b border-white/10 px-2.5 pb-2 pt-1 text-xs">{encabezado}</div>}
          {visibles.map((o) => (
            <button
              key={o.texto}
              type="button"
              role="menuitem"
              disabled={o.deshabilitada}
              onClick={() => {
                setAbierto(false);
                o.onClick();
              }}
              className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition hover:bg-white/5 focus-visible:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45 ${
                o.peligro ? "text-red-300" : "text-white/90"
              }`}
            >
              {o.icono && <span className="mt-0.5 shrink-0 text-white/60">{o.icono}</span>}
              <span className="min-w-0">
                <span className="block">{o.texto}</span>
                {o.detalle && <span className="mt-0.5 block text-xs leading-snug text-white/45">{o.detalle}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
