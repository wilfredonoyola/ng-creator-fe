"use client";

import { useEffect } from "react";

/**
 * Registra el service worker que hace instalable la app.
 *
 * Solo en producción: en desarrollo un worker cacheando la cáscara hace que los
 * cambios no se vean hasta borrar el caché a mano, y se pierde más tiempo
 * peleando con eso que el que ahorra.
 */
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Que falle el registro no rompe nada: la app anda igual, solo deja de
      // ofrecerse para instalar. No vale molestar al usuario con esto.
    });
  }, []);

  return null;
}
