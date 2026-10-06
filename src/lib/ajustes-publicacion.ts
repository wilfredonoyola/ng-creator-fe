"use client";

import { useQuery } from "@apollo/client";
import { AJUSTES_PUBLICACION } from "@/graphql/operations";

/**
 * Lo que se precarga al publicar en la marca (ng-creator-be, `Marca.ajustesPublicacion`).
 * `hashtags` van sin '#'. `destinosApagados` son los `cuentaId` que NO salen
 * marcados: lo que no está ahí sale marcado.
 */
export interface AjustesPublicacion {
  hashtags: string[];
  destinosApagados: string[];
}

/** Lo mismo que el backend. */
export const MAX_HASHTAGS = 30;
export const MAX_LARGO_HASHTAG = 50;

/**
 * Un hashtag como lo guarda el backend: sin '#', sin espacios ni signos, solo
 * letras, números y '_' de cualquier idioma. "" si no queda nada.
 */
export function limpiarHashtag(texto: string): string {
  return texto
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{N}_]/gu, "")
    .slice(0, MAX_LARGO_HASHTAG);
}

/** Suma `nuevos` a `lista`, limpios y sin repetir (sin importar mayúsculas), hasta el tope. */
export function sumarHashtags(lista: string[], nuevos: string[]): string[] {
  const salida = [...lista];
  const vistos = new Set(lista.map((h) => h.toLocaleLowerCase()));
  for (const crudo of nuevos) {
    const h = limpiarHashtag(crudo);
    if (!h || vistos.has(h.toLocaleLowerCase()) || salida.length >= MAX_HASHTAGS) continue;
    vistos.add(h.toLocaleLowerCase());
    salida.push(h);
  }
  return salida;
}

/**
 * La descripción con los hashtags al final ("#a #b"), sin repetir los que ya
 * están escritos en el texto.
 */
export function conHashtags(descripcion: string, hashtags: string[]): string {
  const texto = descripcion.trim();
  const escritos = new Set(
    Array.from(texto.matchAll(/#([\p{L}\p{M}\p{N}_]+)/gu), (m) => m[1].normalize("NFC").toLocaleLowerCase()),
  );
  const faltan = hashtags.filter((h) => !escritos.has(h.toLocaleLowerCase()));
  if (!faltan.length) return texto;
  const sufijo = faltan.map((h) => `#${h}`).join(" ");
  return texto ? `${texto}\n\n${sufijo}` : sufijo;
}

/**
 * Los ajustes de publicación de la marca. Si el backend todavía no los tiene
 * (o fallan), quedan los de fábrica: sin hashtags y todo marcado.
 */
export function useAjustesPublicacion(marcaId: string | undefined) {
  const q = useQuery(AJUSTES_PUBLICACION, {
    variables: { marcaId },
    skip: !marcaId,
    errorPolicy: "all",
  });
  const ajustes: AjustesPublicacion | null = q.data?.ajustesPublicacion ?? null;
  return {
    ajustes,
    hashtags: ajustes?.hashtags ?? [],
    destinosApagados: ajustes?.destinosApagados ?? [],
    cargando: q.loading,
  };
}
