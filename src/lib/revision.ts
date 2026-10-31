"use client";

import { useQuery } from "@apollo/client";
import { AJUSTES_REVISION } from "@/graphql/operations";

/**
 * Revisión antes de publicar (ng-creator-be#175): alguien del equipo aprueba
 * cada clip antes de que salga, o pide cambios con un comentario escrito o de
 * voz. Lo que programa un revisor queda aprobado solo.
 */
export type EstadoRevision = "PENDIENTE" | "APROBADA" | "CAMBIOS_PEDIDOS";
export type AlVencerRevision = "NO_PUBLICAR" | "PUBLICAR_IGUAL";
export type AccionRevision = "PEDIDA" | "APROBADA" | "CAMBIOS_PEDIDOS" | "COMENTARIO";

export interface AjustesRevision {
  activa: boolean;
  alVencer: AlVencerRevision;
}

export interface AutoriaRevision {
  usuarioId: string;
  nombre: string;
  en: string;
}

export interface ComentarioRevision {
  _id: string;
  accion: AccionRevision;
  texto?: string | null;
  audioUrl?: string | null;
  audioDuracionSeg?: number | null;
  transcripcion?: string | null;
  autor: AutoriaRevision;
}

export interface Revision {
  _id: string;
  clipId: string;
  estado: EstadoRevision;
  updatedAt: string;
  pedidaPor: AutoriaRevision;
  resueltaPor?: AutoriaRevision | null;
  comentarios: ComentarioRevision[];
}

/** Lo que se manda como comentario: texto, voz o los dos. */
export interface ComentarioRevisionInput {
  texto?: string;
  audioUrl?: string;
  audioDuracionSeg?: number;
  transcripcion?: string;
}

/**
 * Si la marca revisa y si la persona de la sesión es revisora. Si el backend
 * falla, como si no hubiera revisión: nada se frena por un error de pantalla.
 */
export function useRevisionMarca(marcaId: string | undefined) {
  const q = useQuery(AJUSTES_REVISION, {
    variables: { marcaId },
    skip: !marcaId,
    errorPolicy: "all",
  });
  const ajustes: AjustesRevision | null = q.data?.ajustesRevision ?? null;
  return {
    ajustes,
    activa: !!ajustes?.activa,
    soyRevisor: !!q.data?.soyRevisor,
    cargando: q.loading,
  };
}

/** Las etiquetas de revisión de una tarjeta, de la más urgente a la menos. */
export type EtiquetaRevision = "vencida" | "cambiosPedidos" | "porRevisar" | "salioSinRevisar";

export const CLASE_ETIQUETA_REVISION: Record<EtiquetaRevision, string> = {
  vencida: "bg-red-500/15 text-red-300",
  cambiosPedidos: "bg-orange-400/15 text-orange-300",
  porRevisar: "bg-amber-400/15 text-amber-300",
  salioSinRevisar: "bg-white/10 text-white/60",
};

interface PubConRevision {
  estado: string;
  publicarEn: string;
  createdAt?: string;
  esperaAprobacion?: boolean | null;
  sinRevisar?: boolean | null;
}

/**
 * Qué dice la tarjeta de unas publicaciones del mismo clip. `estadoClip` es la
 * revisión del clip (si se pidió): con cambios pedidos, lo frenado lo dice.
 *
 * Una frenada con la hora pasada está vencida, salvo que se haya pedido "para
 * ya" (la hora es la de cuando se programó): esa espera la aprobación.
 */
export function etiquetaRevision(
  pubs: PubConRevision[],
  estadoClip: EstadoRevision | null | undefined,
  ahora: number,
): EtiquetaRevision | null {
  const frenadas = pubs.filter((p) => p.esperaAprobacion && p.estado === "PROGRAMADA");
  if (frenadas.length) {
    if (estadoClip === "CAMBIOS_PEDIDOS") return "cambiosPedidos";
    const vencida = frenadas.some((p) => {
      const hora = new Date(p.publicarEn).getTime();
      const pedida = p.createdAt ? new Date(p.createdAt).getTime() : 0;
      return hora < ahora && hora - pedida > 60_000;
    });
    return vencida ? "vencida" : "porRevisar";
  }
  if (pubs.some((p) => p.sinRevisar)) return "salioSinRevisar";
  return null;
}

/** La etiqueta de un clip sin mirar sus publicaciones (tarjetas del episodio). */
export function etiquetaDeClip(estado: EstadoRevision | null | undefined): EtiquetaRevision | null {
  if (estado === "PENDIENTE") return "porRevisar";
  if (estado === "CAMBIOS_PEDIDOS") return "cambiosPedidos";
  return null;
}
