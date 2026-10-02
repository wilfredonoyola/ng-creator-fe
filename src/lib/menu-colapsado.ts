"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Si el menú lateral va colapsado (una tira de íconos) en una pantalla que lo
 * pide, como el editor de clips. Cada pantalla tiene su clave y su valor de
 * arranque; la elección se recuerda en localStorage, si se puede.
 */
export function useMenuColapsado(clave: string | null, porDefecto = true) {
  const [colapsado, setColapsado] = useState(clave ? porDefecto : false);

  useEffect(() => {
    if (!clave) return;
    try {
      const guardado = window.localStorage.getItem(`ng:menu-colapsado:${clave}`);
      if (guardado === "1" || guardado === "0") setColapsado(guardado === "1");
    } catch {
      // Sin almacenamiento: arranca como pide la pantalla.
    }
  }, [clave]);

  const alternar = useCallback(() => {
    setColapsado((c) => {
      const nuevo = !c;
      if (clave) {
        try {
          window.localStorage.setItem(`ng:menu-colapsado:${clave}`, nuevo ? "1" : "0");
        } catch {
          // Igual cambia; solo no se recuerda.
        }
      }
      return nuevo;
    });
  }, [clave]);

  return { colapsado: Boolean(clave) && colapsado, alternar };
}
