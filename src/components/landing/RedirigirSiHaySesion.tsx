"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Si este navegador tiene una sesión guardada (ver lib/auth.ts). */
function tieneSesionGuardada(): boolean {
  try {
    const vence = Number(localStorage.getItem("tokenExpiresAt") ?? 0);
    return Boolean(localStorage.getItem("refreshToken") && vence);
  } catch {
    // Sin localStorage (modo privado): no hay sesión que recordar.
    return false;
  }
}

/**
 * Manda al panel a quien ya tiene sesión. Devuelve true recién cuando se sabe
 * que NO la tiene: hasta entonces la página no debería pintar su formulario,
 * para que no parpadee antes de irse.
 *
 * Se mira en el cliente porque la sesión vive en localStorage.
 */
export function useRedirigirSiHaySesion(): boolean {
  const router = useRouter();
  const [sinSesion, setSinSesion] = useState(false);
  useEffect(() => {
    if (tieneSesionGuardada()) router.replace("/panel");
    else setSinSesion(true);
  }, [router]);
  return sinSesion;
}
