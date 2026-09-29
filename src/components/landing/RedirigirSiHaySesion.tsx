"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Quien ya tiene sesión y entra a creator.ngstudios.co va directo a su panel:
 * la página de producto es para quien todavía no la tiene. Se mira en el
 * cliente porque la sesión vive en localStorage (ver lib/auth.ts).
 */
export function RedirigirSiHaySesion() {
  const router = useRouter();
  useEffect(() => {
    try {
      const vence = Number(localStorage.getItem("tokenExpiresAt") ?? 0);
      if (localStorage.getItem("refreshToken") && vence) router.replace("/panel");
    } catch {
      // Sin localStorage (modo privado): se queda en la página de producto.
    }
  }, [router]);
  return null;
}
