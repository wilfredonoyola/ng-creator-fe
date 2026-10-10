"use client";

import { useEffect, useState } from "react";
import { hayMarcaDeSesion } from "@/lib/marca-sesion";

/**
 * Muestra una cosa u otra según si este navegador tiene sesión en el panel
 * (ver lib/marca-sesion.ts). La landing ya no redirige a quien la tiene: lo
 * deja mirar y le ofrece "Ir a la app".
 *
 * Arranca con lo de sin sesión, que es lo que trae el HTML del servidor, y
 * cambia al montarse: así no hay diferencia de hidratación.
 */
export function SegunSesion({ conSesion, sinSesion }: { conSesion: React.ReactNode; sinSesion: React.ReactNode }) {
  const [hay, setHay] = useState(false);
  useEffect(() => setHay(hayMarcaDeSesion()), []);
  return <>{hay ? conSesion : sinSesion}</>;
}
