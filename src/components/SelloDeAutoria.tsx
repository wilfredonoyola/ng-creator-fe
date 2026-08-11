"use client";

import { fechaCompleta, tiempoRelativo } from "@/lib/time";

export interface Autoria {
  nombre: string;
  en: string;
}

/**
 * Quién hizo algo y cuándo, para poner al pie de una tarjeta.
 *
 * No muestra nada cuando no hay autor. Eso pasa con todo lo anterior a que se
 * empezara a registrar autoría: no sabemos quién lo hizo, y poner "desconocido"
 * o un guion sería ensuciar cada tarjeta vieja para no decir nada.
 *
 * La fecha va relativa porque es lo que se pregunta de un vistazo ("¿esto es de
 * hoy?"); la exacta queda en el `title` para cuando importa el dato preciso.
 */
export function SelloDeAutoria({
  accion,
  autoria,
}: {
  accion: string;
  autoria?: Autoria | null;
}) {
  if (!autoria) return null;

  return (
    <p
      className="mt-1 text-[10px] text-white/30"
      title={fechaCompleta(autoria.en)}
    >
      <span aria-hidden className="mr-1">
        ⤷
      </span>
      {accion} por <span className="text-white/50">{autoria.nombre}</span>,{" "}
      {tiempoRelativo(autoria.en)}
    </p>
  );
}
