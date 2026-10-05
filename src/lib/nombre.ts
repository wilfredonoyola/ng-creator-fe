"use client";

import { useMutation } from "@apollo/client";
import { ACTUALIZAR_MI_NOMBRE, YO } from "@/graphql/operations";

/** Los mismos límites que valida el backend al guardar un nombre. */
export const NOMBRE_MIN = 2;
export const NOMBRE_MAX = 60;

export function nombreValido(nombre: string): boolean {
  const n = nombre.trim();
  return n.length >= NOMBRE_MIN && n.length <= NOMBRE_MAX;
}

/** El mensaje de un error de Apollo (llegan traducidos del backend), o "". */
export function mensajeDeError(e: unknown): string {
  return e instanceof Error ? e.message : "";
}

/**
 * Guarda el nombre de quien está en sesión. La mutación devuelve el `User`, así
 * que Apollo ya actualiza `yo` en la caché; igual se vuelve a pedir `yo` para
 * no depender de eso. Devuelve null si salió bien, o el error.
 */
export function useGuardarMiNombre() {
  const [mutar, { loading }] = useMutation(ACTUALIZAR_MI_NOMBRE, {
    refetchQueries: [{ query: YO }],
    awaitRefetchQueries: true,
  });
  async function guardar(nombre: string): Promise<string | null> {
    try {
      await mutar({ variables: { nombre: nombre.trim() } });
      return null;
    } catch (e) {
      return mensajeDeError(e);
    }
  }
  return { guardar, guardando: loading };
}
