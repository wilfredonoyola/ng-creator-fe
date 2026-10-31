"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Las secciones del menú que se prenden y apagan en Ajustes → Funciones. Hoy
 * solo "Videos de reacción" (el flujo propio de NG, que ve el admin): apagada
 * por defecto. Se recuerda en este navegador, como el menú colapsado.
 */
export type Funcion = "videosReaccion";

const CLAVE = (f: Funcion) => `ng:funcion:${f}`;
/** Para que el menú se entere en la misma pestaña (el evento `storage` solo llega a las otras). */
const EVENTO = "ng:funciones";

function leer(f: Funcion): boolean {
  try {
    return window.localStorage.getItem(CLAVE(f)) === "1";
  } catch {
    return false;
  }
}

export function useFuncion(f: Funcion): [boolean, (v: boolean) => void] {
  const [prendida, setPrendida] = useState(false);
  useEffect(() => {
    const actualizar = () => setPrendida(leer(f));
    actualizar();
    window.addEventListener(EVENTO, actualizar);
    window.addEventListener("storage", actualizar);
    return () => {
      window.removeEventListener(EVENTO, actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, [f]);
  const cambiar = useCallback(
    (v: boolean) => {
      setPrendida(v);
      try {
        window.localStorage.setItem(CLAVE(f), v ? "1" : "0");
      } catch {
        // Igual cambia en esta pantalla; solo no se recuerda.
      }
      window.dispatchEvent(new Event(EVENTO));
    },
    [f],
  );
  return [prendida, cambiar];
}
