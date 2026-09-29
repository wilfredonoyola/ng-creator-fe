/**
 * Las cuentas del encuadre de un clip de episodio, iguales a las del backend
 * (`src/modules/episodios/clip-render.ts` en ng-creator-be).
 *
 * Tienen que ser LAS MISMAS: la vista previa muestra lo que después renderiza
 * ffmpeg, y si una de las dos cambia, el clip sale distinto de como se vio.
 * Por eso están copiadas tal cual, con los mismos nombres, y cualquier cambio
 * va en los dos lados a la vez. Las líneas de subtítulo NO se copian: llegan
 * calculadas del backend (`lineasSubtitulo`).
 */

export type FormatoClip = "VERTICAL" | "CUADRADO" | "HORIZONTAL";

export interface Lienzo {
  ancho: number;
  alto: number;
}

export const LIENZOS: Record<FormatoClip, Lienzo> = {
  VERTICAL: { ancho: 1080, alto: 1920 },
  CUADRADO: { ancho: 1080, alto: 1080 },
  HORIZONTAL: { ancho: 1920, alto: 1080 },
};

export interface Encuadre {
  centroX: number;
  centroY: number;
  zoom: number;
}

/** Una región del cuadro original, en fracciones (0..1). */
export interface Region {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export const ZOOM_MAXIMO = 4;

const entre = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Qué parte del cuadro original entra en el clip. Ver el backend. */
export function recorteDelCuadro(
  fuente: { ancho: number; alto: number },
  formato: FormatoClip,
  encuadre: Encuadre,
): Region {
  const lienzo = LIENZOS[formato];
  const proporcion = lienzo.ancho / lienzo.alto;
  const zoom = entre(encuadre.zoom || 1, 1, ZOOM_MAXIMO);

  let anchoPx = fuente.ancho;
  let altoPx = fuente.ancho / proporcion;
  if (altoPx > fuente.alto) {
    altoPx = fuente.alto;
    anchoPx = fuente.alto * proporcion;
  }
  const ancho = anchoPx / zoom / fuente.ancho;
  const alto = altoPx / zoom / fuente.alto;

  const x = entre(entre(encuadre.centroX, 0, 1) - ancho / 2, 0, 1 - ancho);
  const y = entre(entre(encuadre.centroY, 0, 1) - alto / 2, 0, 1 - alto);
  return { x, y, ancho, alto };
}

/** Cuerpo y altura del subtítulo en píxeles del lienzo. Ver el backend. */
export function medidasSubtitulo(lienzo: Lienzo): { cuerpo: number; margenAbajo: number } {
  const lado = Math.min(lienzo.ancho, lienzo.alto);
  return {
    cuerpo: Math.round(lado * 0.075),
    margenAbajo: Math.round(lienzo.alto * (lienzo.alto > lienzo.ancho ? 0.22 : 0.1)),
  };
}

/**
 * El gancho, en píxeles del lienzo. Son los valores por defecto del backend
 * (GANCHO_POR_DEFECTO en clips-episodio.service); el tamaño de letra de la
 * marca puede cambiarlos, así que la vista previa del gancho es aproximada en
 * tamaño, no en posición ni en cuándo aparece.
 */
export const GANCHO = { tamano: 64, centroY: 0.2, grosorContorno: 8 };
