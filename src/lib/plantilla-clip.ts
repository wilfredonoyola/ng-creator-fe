import type { Texto } from "@/lib/clip-encuadre";

/**
 * La plantilla de clips de una marca (ng-creator-be#117): el logo en una
 * esquina y una llamada a la acción al final. Las cuentas son las mismas que
 * las del render (`posicionDelLogo` y `textoDeLlamada` en clip-render.ts del
 * backend): lo que se ve en la vista previa es lo que sale en el MP4.
 */

export type PosicionLogo = "ARRIBA_IZQUIERDA" | "ARRIBA_DERECHA" | "ABAJO_IZQUIERDA" | "ABAJO_DERECHA";

export interface PlantillaClip {
  logoActivo: boolean;
  logoPosicion: PosicionLogo;
  /** Ancho del logo en fracción del ancho del clip (0,08–0,4). */
  logoTamano: number;
  logoOpacidad: number;
  ctaActivo: boolean;
  ctaTexto: string;
  /** Cuántos segundos del final dura la llamada a la acción (2–8). */
  ctaSeg: number;
}

export const PLANTILLA_POR_DEFECTO: PlantillaClip = {
  logoActivo: true,
  logoPosicion: "ARRIBA_DERECHA",
  logoTamano: 0.16,
  logoOpacidad: 0.9,
  ctaActivo: false,
  ctaTexto: "",
  ctaSeg: 3,
};

/** Separación del logo con los bordes, en fracción del ANCHO del clip (arriba, abajo y a los costados). */
export const MARGEN_LOGO = 0.04;

export const POSICIONES_LOGO: { valor: PosicionLogo; etiqueta: string }[] = [
  { valor: "ARRIBA_IZQUIERDA", etiqueta: "Arriba a la izquierda" },
  { valor: "ARRIBA_DERECHA", etiqueta: "Arriba a la derecha" },
  { valor: "ABAJO_IZQUIERDA", etiqueta: "Abajo a la izquierda" },
  { valor: "ABAJO_DERECHA", etiqueta: "Abajo a la derecha" },
];

/** Dónde va el logo en una vista de `ancho` px: estilo absoluto para un `<img>`. */
export function estiloDelLogo(p: Pick<PlantillaClip, "logoPosicion" | "logoTamano" | "logoOpacidad">, ancho: number) {
  const margen = ancho * MARGEN_LOGO;
  const derecha = p.logoPosicion.endsWith("DERECHA");
  const abajo = p.logoPosicion.startsWith("ABAJO");
  return {
    position: "absolute" as const,
    width: ancho * p.logoTamano,
    height: "auto",
    opacity: p.logoOpacidad,
    ...(derecha ? { right: margen } : { left: margen }),
    ...(abajo ? { bottom: margen } : { top: margen }),
    pointerEvents: "none" as const,
  };
}

/** La llamada a la acción como un texto del clip: los últimos segundos, al centro, en caja con el color del gancho. */
export function textoDeLlamada(
  p: Pick<PlantillaClip, "ctaTexto" | "ctaSeg">,
  duracionSeg: number,
  colores: { color: string; colorCaja: string },
): Texto {
  return {
    contenido: p.ctaTexto.trim(),
    destacadas: [],
    fuente: "ANTON",
    tamano: 80,
    color: colores.color,
    colorDestacado: colores.color,
    efecto: "CAJA",
    colorEfecto: colores.colorCaja,
    mayusculas: true,
    centroX: 0.5,
    centroY: 0.42,
    ancho: 0.85,
    desdeSeg: Math.max(0, duracionSeg - p.ctaSeg),
    hastaSeg: duracionSeg,
  };
}

/** Lo que el clip lleva de la plantilla, como lo arma el backend: nada si el clip la apagó. */
export function plantillaDelClip(
  estilo: { logoUrl?: string | null; plantilla?: PlantillaClip | null; colorGancho: string; colorContornoGancho: string },
  plantillaActiva: boolean,
  duracionSeg: number,
): { logo?: { url: string; plantilla: PlantillaClip }; llamada?: Texto } {
  const p = estilo.plantilla;
  if (!plantillaActiva || !p) return {};
  return {
    ...(p.logoActivo && estilo.logoUrl ? { logo: { url: estilo.logoUrl, plantilla: p } } : {}),
    ...(p.ctaActivo && p.ctaTexto.trim()
      ? { llamada: textoDeLlamada(p, duracionSeg, { color: estilo.colorGancho, colorCaja: estilo.colorContornoGancho }) }
      : {}),
  };
}
