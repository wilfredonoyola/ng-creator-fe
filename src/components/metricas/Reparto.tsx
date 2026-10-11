"use client";

import { useLocale } from "next-intl";
import { porcentaje, type ParteReparto } from "@/lib/metricas";

/**
 * Un reparto en filas con su barra (de dónde vino la gente, de qué país):
 * los primeros `maximo` y el resto afuera, que en una lista de 40 países lo
 * que importa son los tres de arriba.
 */
export function Reparto({
  titulo,
  partes,
  etiqueta,
  maximo = 5,
}: {
  titulo: string;
  partes: ParteReparto[];
  etiqueta: (clave: string) => string;
  maximo?: number;
}) {
  const locale = useLocale();
  if (!partes.length) return null;
  const visibles = [...partes].sort((a, b) => b.fraccion - a.fraccion).slice(0, maximo);
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wider text-white/40">{titulo}</h3>
      <ul className="mt-1.5 space-y-1.5">
        {visibles.map((p) => (
          <li key={p.clave}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 truncate text-white/75">{etiqueta(p.clave)}</span>
              <span className="shrink-0 tabular-nums text-white/55">{porcentaje(p.fraccion, locale, 0)}</span>
            </div>
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-white/50" style={{ width: `${Math.min(p.fraccion, 1) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
