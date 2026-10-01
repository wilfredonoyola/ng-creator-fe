"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import { MARCAR_CLIP_LISTO } from "@/graphql/operations";
import { diaYHora } from "@/lib/publicaciones";
import type { Autoria } from "./TomarClip";

/**
 * "Listo" y lo que ya pasó con el clip en las redes (#70, ng-creator-be#129).
 *
 * El equipo de una marca se reparte el trabajo: alguien edita el clip y lo
 * marca listo, y otra persona lo programa si quien lo editó no lo hizo. Los
 * listos sin programar aparecen en el calendario, en "Listos para programar".
 */

export interface ResumenPublicacionClip {
  programadas: number;
  publicadas: number;
  fallidas: number;
  proximaEn?: string | null;
  ultimaPublicadaEn?: string | null;
}

/**
 * El chip "Terminado · Ana" con "Volver a editar", o el botón "Marcar terminado".
 * El botón solo aparece con el MP4 procesado: sin eso no hay nada que
 * programar, y el backend lo rechaza igual.
 */
export function ListoClip({
  clipId,
  marcaId,
  listoPor,
  tieneVideo,
  puedeOperar,
}: {
  clipId: string;
  marcaId: string;
  listoPor?: Autoria | null;
  tieneVideo: boolean;
  puedeOperar: boolean;
}) {
  const [marcar, { loading }] = useMutation(MARCAR_CLIP_LISTO, {
    // Entra o sale de "Listos para programar" en el calendario.
    refetchQueries: ["ClipsListosSinProgramar"],
  });
  const [error, setError] = useState<string | null>(null);

  async function cambiar(listo: boolean) {
    setError(null);
    try {
      await marcar({ variables: { id: clipId, marcaId, listo } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar");
    }
  }

  if (!listoPor && !(puedeOperar && tieneVideo)) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {listoPor ? (
        <>
          <span
            title={`Desde ${new Date(listoPor.en).toLocaleString("es")}`}
            className="rounded-full bg-ng-teal/15 px-2 py-0.5 text-[11px] text-ng-teal"
          >
            ✓ Terminado · {listoPor.nombre}
          </span>
          {puedeOperar && (
            <button
              onClick={() => void cambiar(false)}
              disabled={loading}
              className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/60 hover:bg-white/5 disabled:opacity-50"
            >
              Volver a editar
            </button>
          )}
        </>
      ) : (
        <button
          onClick={() => void cambiar(true)}
          disabled={loading}
          title="Ya se puede programar: lo ve todo el equipo en el calendario"
          className="rounded-full border border-ng-teal/40 px-2 py-0.5 text-[11px] text-ng-teal hover:bg-ng-teal/10 disabled:opacity-50"
        >
          {loading ? "Marcando…" : "Marcar terminado"}
        </button>
      )}
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </span>
  );
}

/**
 * "Programado · vie 3, 18:00", "Publicado · 2 redes", "Falló". Nada si
 * todavía no se programó.
 */
export function EstadoPublicacionClip({ publicacion }: { publicacion?: ResumenPublicacionClip | null }) {
  if (!publicacion) return null;
  const { programadas, publicadas, fallidas, proximaEn } = publicacion;
  return (
    <>
      {programadas > 0 && (
        <span className="rounded-full bg-indigo-400/15 px-2 py-0.5 text-[11px] text-indigo-300">
          Programado{proximaEn ? ` · ${diaYHora(new Date(proximaEn))}` : ""}
          {programadas > 1 ? ` (${programadas})` : ""}
        </span>
      )}
      {publicadas > 0 && (
        <span className="rounded-full bg-ng-teal/15 px-2 py-0.5 text-[11px] text-ng-teal">
          Publicado · {publicadas} {publicadas === 1 ? "red" : "redes"}
        </span>
      )}
      {fallidas > 0 && (
        <span
          title="Una red rechazó la publicación: entrá a Programar para ver el motivo y reintentar"
          className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] text-red-400"
        >
          Falló en redes{fallidas > 1 ? ` (${fallidas})` : ""}
        </span>
      )}
    </>
  );
}
