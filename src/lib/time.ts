"use client";

import { useEffect, useState } from "react";

/**
 * Formato de tiempo para la cola de revisión.
 *
 * La cola es FIFO: lo que importa no es la fecha absoluta sino cuánto lleva
 * esperando cada expediente. Por eso lo primario es el tiempo relativo y la
 * fecha exacta queda en el tooltip.
 */

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

/** Acepta ISO del backend o millis locales (Date.now()). */
export type Instante = string | number | null | undefined;

function aMillis(valor: Instante): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const ms = typeof valor === "number" ? valor : new Date(valor).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** "hace 5 minutos", "hace 3 horas", "hace 2 días". */
export function tiempoRelativo(iso: Instante, ahora = Date.now()): string {
  const ms = aMillis(iso);
  if (ms === null) return "—";

  const seg = Math.round((ahora - ms) / 1000);
  if (seg < 45) return "hace instantes";

  const min = Math.round(seg / 60);
  if (min < 60) return rtf.format(-min, "minute");

  const horas = Math.round(min / 60);
  if (horas < 24) return rtf.format(-horas, "hour");

  const dias = Math.round(horas / 24);
  if (dias < 30) return rtf.format(-dias, "day");

  return rtf.format(-Math.round(dias / 30), "month");
}

/** Fecha y hora completas, para el tooltip. */
export function fechaCompleta(iso: Instante): string {
  const ms = aMillis(iso);
  if (ms === null) return "";
  return new Date(ms).toLocaleString("es", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Horas transcurridas. Null si no hay fecha válida. */
export function horasDesde(iso: Instante, ahora = Date.now()): number | null {
  const ms = aMillis(iso);
  if (ms === null) return null;
  return (ahora - ms) / 3_600_000;
}

/**
 * Urgencia por antigüedad. En una cola de revisión lo accionable no es la
 * fecha sino "esto lleva demasiado esperando".
 */
export type Urgencia = "normal" | "media" | "alta";

export function urgenciaPorEspera(iso: Instante, ahora = Date.now()): Urgencia {
  const horas = horasDesde(iso, ahora);
  if (horas === null) return "normal";
  if (horas >= 48) return "alta";
  if (horas >= 12) return "media";
  return "normal";
}

export const claseUrgencia: Record<Urgencia, string> = {
  normal: "text-white/40",
  media: "text-yellow-400/80",
  alta: "text-red-400",
};

/**
 * Reloj compartido para que los "hace X" se refresquen sin depender de que
 * llegue nueva data del servidor.
 */
export function useAhora(intervaloMs = 30_000): number {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);

  return ahora;
}
