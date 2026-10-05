/**
 * La calidad de un clip: cuánto se agranda la fuente para llenar la salida.
 * El mismo criterio en el backend, la web y la app.
 *
 * Ampliación = el mayor factor de agrandamiento entre los paneles visibles del
 * clip (en todos sus tramos): para cada panel, los píxeles del panel en la
 * salida dividido los píxeles de la fuente que recorta (con el zoom incluido),
 * el mayor entre ancho y alto. El fondo desenfocado no cuenta.
 *
 * Antes de procesar se estima con la resolución del original (la que sabe
 * Bunny, `resolucionOriginal` del episodio) o, si falta, con la del último
 * render; nunca con el HLS de la vista previa. Después de procesar llega
 * medida del MP4 (`calidad` del clip).
 */
import {
  panelesDe,
  posicionesEfectivas,
  type DisenoClip,
  type Encuadre,
  type FormatoClip,
  type PosicionEfectiva,
  type Region,
} from "./clip-encuadre";

export type NivelCalidad = "EXCELENTE" | "BUENA" | "BAJA";

/** Hasta acá es EXCELENTE; hasta BUENA_HASTA, BUENA; más, BAJA. */
export const EXCELENTE_HASTA = 1.4;
export const BUENA_HASTA = 2.0;

/** La que llega del backend (medida) o la estimada en el editor (sin bitrate). */
export interface CalidadClip {
  nivel: NivelCalidad;
  ampliacion: number;
  fuenteAncho: number;
  fuenteAlto: number;
  /** Solo la medida. */
  bitrateKbps?: number | null;
  medidoEn?: string | null;
}

export function nivelDeAmpliacion(ampliacion: number): NivelCalidad {
  if (ampliacion <= EXCELENTE_HASTA) return "EXCELENTE";
  if (ampliacion <= BUENA_HASTA) return "BUENA";
  return "BAJA";
}

/** El mayor agrandamiento entre los paneles de todos los tramos. */
export function ampliacionDePosiciones(
  posiciones: PosicionEfectiva[],
  formato: FormatoClip,
  fuente: { ancho: number; alto: number },
): number {
  let mayor = 0;
  for (const p of posiciones) {
    const paneles = panelesDe(formato, p.diseno);
    paneles.forEach((panel, i) => {
      const r: Region | undefined = p.regiones[i];
      if (!r) return;
      const anchoFuente = r.ancho * fuente.ancho;
      const altoFuente = r.alto * fuente.alto;
      if (anchoFuente <= 0 || altoFuente <= 0) return;
      mayor = Math.max(mayor, panel.ancho / anchoFuente, panel.alto / altoFuente);
    });
  }
  return Math.round(mayor * 100) / 100;
}

/** La estimada, con las mismas cuentas que la vista previa y el render. */
export function calidadEstimada(
  clip: {
    formato: FormatoClip;
    diseno?: DisenoClip | null;
    encuadre?: Encuadre | null;
    posiciones?: { desdeSeg: number; regiones: Region[]; diseno?: DisenoClip | null }[] | null;
  },
  fuente: { ancho: number; alto: number },
  duracionSeg: number,
): CalidadClip {
  return calidadDePosiciones(posicionesEfectivas(clip, fuente, duracionSeg), clip.formato, fuente);
}

/** Igual, si las posiciones ya están calculadas (el editor las tiene). */
export function calidadDePosiciones(
  posiciones: PosicionEfectiva[],
  formato: FormatoClip,
  fuente: { ancho: number; alto: number },
): CalidadClip {
  const ampliacion = ampliacionDePosiciones(posiciones, formato, fuente);
  return { nivel: nivelDeAmpliacion(ampliacion), ampliacion, fuenteAncho: fuente.ancho, fuenteAlto: fuente.alto };
}
