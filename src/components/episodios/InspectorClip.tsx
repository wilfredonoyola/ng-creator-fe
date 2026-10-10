"use client";

import { useCallback, useEffect, useState } from "react";

const CLAVE = "ng:editor-clip:pestana";

/**
 * La herramienta abierta del editor de clips: la que se abre con `#texto`,
 * `#formato`… en la dirección, o si no la última que se usó (localStorage, si
 * se puede). Antes eran las pestañas del inspector; el nombre quedó.
 */
export function usePestanaInspector<T extends string>(ids: readonly T[], porDefecto: T) {
  const [pestana, setPestana] = useState<T>(porDefecto);
  const valida = useCallback((v: string | null | undefined): v is T => !!v && (ids as readonly string[]).includes(v), [ids]);

  useEffect(() => {
    const deLaDireccion = () => {
      const h = window.location.hash.replace(/^#/, "");
      if (valida(h)) {
        setPestana(h);
        return true;
      }
      return false;
    };
    if (!deLaDireccion()) {
      try {
        const guardada = window.localStorage.getItem(CLAVE);
        if (valida(guardada)) setPestana(guardada);
      } catch {
        // Sin almacenamiento (privado, bloqueado): arranca en la de siempre.
      }
    }
    window.addEventListener("hashchange", deLaDireccion);
    return () => window.removeEventListener("hashchange", deLaDireccion);
  }, [valida]);

  const elegir = useCallback((p: T) => {
    setPestana(p);
    try {
      window.localStorage.setItem(CLAVE, p);
    } catch {
      // Igual cambia; solo no se recuerda.
    }
  }, []);

  return [pestana, elegir] as const;
}
