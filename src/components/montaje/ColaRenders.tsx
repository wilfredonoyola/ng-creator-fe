"use client";

import { useQuery } from "@apollo/client";
import { MONTAJES_EN_COLA } from "@/graphql/operations";

interface EnCola {
  _id: string;
  estado: "EN_COLA" | "RENDERIZANDO" | string;
  progreso: number;
  duracionSeg: number;
  posicionEnCola: number;
}

/**
 * La fila de renders de la página.
 *
 * Existe porque ahora se puede pedir varios: sin esto, el segundo video que se
 * manda desaparece de la vista —no hay barra que mirar hasta que le toque— y
 * queda la duda de si se pidió o no.
 *
 * `excluir` es el trabajo que ya se muestra arriba con su propia barra. Sin eso
 * el mismo render aparecería dos veces y parecería que se pidió doble.
 */
export function ColaRenders({
  pageId,
  excluir,
}: {
  pageId: string;
  excluir?: string | null;
}) {
  // Cada 3 segundos: el que está armándose mueve su barra, y los que esperan
  // cambian de posición cuando termina cualquier otro.
  const { data } = useQuery(MONTAJES_EN_COLA, {
    variables: { pageId },
    pollInterval: 3000,
    fetchPolicy: "cache-and-network",
  });

  const items: EnCola[] = (data?.montajesEnCola ?? []).filter(
    (t: EnCola) => t._id !== excluir,
  );
  if (!items.length) return null;

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">
        En la fila · {items.length}
      </p>
      <div className="space-y-2">
        {items.map((t) => (
          <div key={t._id} className="flex items-center gap-3 text-xs">
            <span className="w-28 shrink-0 text-white/60">
              {t.estado === "RENDERIZANDO"
                ? `Armándose · ${Math.round(t.progreso)}%`
                : t.posicionEnCola === 0
                  ? "Siguiente"
                  : `Esperando · ${t.posicionEnCola} delante`}
            </span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  t.estado === "RENDERIZANDO" ? "bg-[#0FED9D]" : "bg-white/20"
                }`}
                style={{
                  width:
                    t.estado === "RENDERIZANDO"
                      ? `${Math.max(2, t.progreso)}%`
                      : "100%",
                }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-white/30">
              {Math.round(t.duracionSeg)}s
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-white/40">
        Se hacen de uno en uno: el servidor tiene un solo núcleo y dos a la vez
        tardarían más que en fila. Podés cerrar la pestaña.
      </p>
    </div>
  );
}
