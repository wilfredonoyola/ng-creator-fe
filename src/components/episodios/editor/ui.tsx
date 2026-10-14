"use client";

import type { ReactNode } from "react";

/** Un bloque dentro del panel de una herramienta, con su rótulo chico arriba. */
export function Seccion({ titulo, extra, children }: { titulo?: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      {(titulo || extra) && (
        <div className="flex items-center justify-between gap-2">
          {titulo && <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ng-secundario">{titulo}</h3>}
          {extra}
        </div>
      )}
      {children}
    </section>
  );
}

/** Un botón de acción del panel: ícono arriba, nombre abajo, como en la hoja de la app. */
export function BotonAccion({
  icono,
  children,
  onClick,
  deshabilitado,
  titulo,
}: {
  icono: ReactNode;
  children: ReactNode;
  onClick: () => void;
  deshabilitado?: boolean;
  titulo?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      title={titulo}
      className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-ng-md bg-ng-superficie px-2 py-2 text-xs font-medium text-white transition hover:bg-ng-elevada disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icono}
      <span className="text-center leading-tight">{children}</span>
    </button>
  );
}

/** Un interruptor de sí o no, con su texto y una ayuda chica. */
export function Interruptor({
  etiqueta,
  ayuda,
  valor,
  onCambio,
  deshabilitado,
}: {
  etiqueta: string;
  ayuda?: ReactNode;
  valor: boolean;
  onCambio: (v: boolean) => void;
  deshabilitado?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{etiqueta}</p>
        {ayuda && <p className="mt-0.5 text-xs text-ng-tenue">{ayuda}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={valor}
        aria-label={etiqueta}
        disabled={deshabilitado}
        onClick={() => onCambio(!valor)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${valor ? "bg-ng-azul" : "bg-ng-elevada"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${valor ? "left-[22px] bg-ng-tinta" : "left-0.5 bg-white"}`} />
      </button>
    </div>
  );
}

/**
 * "Beta" al lado de lo que todavía se equivoca seguido (el auto-encuadre):
 * que se sepa que hay que revisar lo que hace.
 */
export function EtiquetaBeta({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block rounded-full border border-ng-azul/60 px-1.5 py-px align-middle text-[9px] font-bold uppercase leading-none tracking-[.08em] text-ng-azul ${className}`}
    >
      Beta
    </span>
  );
}
