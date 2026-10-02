"use client";

import { type ReactNode } from "react";

const LADOS = {
  // Abajo, alineada a la izquierda o a la derecha del elemento.
  abajo: "left-0 top-full mt-1.5",
  "abajo-derecha": "right-0 top-full mt-1.5",
  derecha: "left-full top-1/2 ml-2 -translate-y-1/2",
} as const;

/**
 * Un tooltip propio, para elegir de qué lado sale. El `title` del navegador
 * aparece donde está el mouse y en el editor tapaba la vista previa; este se
 * abre del lado que se le dice (al pasar el mouse o con el foco del teclado).
 * Cerrado no ocupa lugar (display: none): si no, los de los bordes estiraban
 * la página de costado en el teléfono.
 */
export function Pista({
  texto,
  lado = "abajo",
  children,
  className = "",
  id,
}: {
  texto: ReactNode;
  lado?: keyof typeof LADOS;
  children: ReactNode;
  className?: string;
  /** Para apuntarle con aria-describedby (cerrada sigue valiendo como descripción). */
  id?: string;
}) {
  return (
    <span className={`group/pista relative inline-flex ${className}`}>
      {children}
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute z-50 hidden w-max max-w-[16rem] rounded-lg border border-white/10 bg-ng-elevada px-2.5 py-1.5 text-xs font-normal normal-case leading-snug tracking-normal text-white/80 shadow-xl shadow-black/40 group-focus-within/pista:block group-hover/pista:block ${LADOS[lado]}`}
      >
        {texto}
      </span>
    </span>
  );
}
