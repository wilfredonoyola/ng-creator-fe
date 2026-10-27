"use client";

import { useQuery } from "@apollo/client";
import { AJUSTES_NUMERACION, NUMERACION_DE_CLIP } from "@/graphql/operations";

/**
 * El correlativo "Programa 31 | Video 2" (ng-creator-be, `Marca.numeracion`).
 * Los números se fijan la primera vez que se programa el clip; antes, el
 * backend dice los que va a tomar.
 */
export interface AjustesNumeracion {
  activa: boolean;
  formato: string;
  enTexto: boolean;
  enPortada: boolean;
  siguientePrograma: number;
  siguientePublicacion: number;
}

export interface NumeracionClip {
  programa: number | null;
  video: number | null;
  publicacion: number | null;
  /** "Programa 31 | Video 2", o null si al formato le falta un número. */
  encabezado: string | null;
  asignada: boolean;
  enTexto: boolean;
  enPortada: boolean;
}

/** Lo mismo que el backend. */
export const FORMATO_NUMERACION_POR_DEFECTO = "Programa {programa} | Video {video}";
export const LARGO_MAXIMO_FORMATO = 80;
export const NUMERO_MAXIMO = 999_999;
export const VARIABLES_NUMERACION = ["programa", "video", "publicacion"] as const;

export const formatoValido = (formato: string): boolean => {
  const f = formato.trim();
  return f.length > 0 && f.length <= LARGO_MAXIMO_FORMATO && /\{(programa|video|publicacion)\}/.test(f);
};

/** El formato con números de ejemplo, para ver cómo queda. */
export const ejemploFormato = (formato: string, n: { programa: number; video: number; publicacion: number }) =>
  formato.trim().replace(/\{(programa|video|publicacion)\}/g, (_, v: keyof typeof n) => String(n[v]));

/** El texto con el encabezado como primer renglón; si ya lo tiene, igual. */
export function conEncabezado(texto: string, encabezado: string | null | undefined): string {
  if (!encabezado) return texto;
  const t = texto.trim();
  if (t === encabezado || t.startsWith(`${encabezado}\n`)) return t;
  return t ? `${encabezado}\n${t}` : encabezado;
}

/** Cambia el encabezado del primer renglón por otro (al corregir los números). Si no estaba, lo pone. */
export function cambiarEncabezado(texto: string, antes: string | null, despues: string | null): string {
  const t = texto.trim();
  const sinAntes = antes && (t === antes || t.startsWith(`${antes}\n`)) ? t.slice(antes.length).replace(/^\n/, "") : t;
  return conEncabezado(sinAntes, despues);
}

export function useAjustesNumeracion(marcaId: string | undefined) {
  const q = useQuery(AJUSTES_NUMERACION, { variables: { marcaId }, skip: !marcaId, errorPolicy: "all" });
  return {
    ajustes: (q.data?.ajustesNumeracion ?? null) as AjustesNumeracion | null,
    cargando: q.loading,
  };
}

export function useNumeracionClip(marcaId: string | undefined, clipId: string | undefined) {
  const q = useQuery(NUMERACION_DE_CLIP, {
    variables: { marcaId, clipId },
    skip: !marcaId || !clipId,
    errorPolicy: "all",
    fetchPolicy: "cache-and-network",
  });
  return {
    numeracion: (q.data?.numeracionDeClip ?? null) as NumeracionClip | null,
    cargando: q.loading,
    refrescar: () => void q.refetch(),
  };
}
