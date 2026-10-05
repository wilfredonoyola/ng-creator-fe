/**
 * Qué calidad pueden esperar los clips verticales de un episodio, por la
 * resolución del original (`Episodio.resolucionOriginal`). Lo que más define
 * la nitidez de un clip es la fuente: se avisa antes de que arme clips.
 *
 * Se calcula con la misma función que el editor (`calidadEstimada`), con el
 * recorte 9:16 por defecto (sin zoom): un 1080p horizontal se agranda 1,78×
 * (Buena), un 1440p 1,33× (Excelente). El texto lo arma la pantalla con la
 * clave `avisoFuente.<nivel>`.
 */
import { calidadEstimada, type NivelCalidad } from "./calidad";

export interface AvisoFuente {
  nivel: NivelCalidad;
  ampliacion: number;
  /** "1080p", "1440p", "4K": el lado corto del original. */
  resolucion: string;
}

/** "1080p" por el lado corto; de 2160 para arriba, "4K". */
export function etiquetaResolucion(ancho: number, alto: number): string {
  const corto = Math.round(Math.min(ancho, alto));
  return corto >= 2160 ? "4K" : `${corto}p`;
}

/** Null mientras no se sabe la resolución (el episodio se está procesando). */
export function avisoFuente(resolucion: { ancho: number; alto: number } | null | undefined): AvisoFuente | null {
  if (!resolucion || !(resolucion.ancho > 0) || !(resolucion.alto > 0)) return null;
  const { nivel, ampliacion } = calidadEstimada({ formato: "VERTICAL" }, resolucion, 1);
  return { nivel, ampliacion, resolucion: etiquetaResolucion(resolucion.ancho, resolucion.alto) };
}
