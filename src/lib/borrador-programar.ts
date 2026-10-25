import type { DisenoPortada } from "@/lib/diseno-portada";

/**
 * Lo que se va llenando en Programar (redes, texto, hashtags, fecha, portada,
 * etiquetas) queda en este navegador: al recargar la página no se pierde.
 * Uno por clip y por lo que se edita (nada programado, lo programado o un
 * reintento), y se borra al programar o guardar.
 */

export type BorradorProgramar = {
  descripcion: string;
  hashtagsClip: string[] | null;
  tituloYoutube: string;
  fecha: string;
  portadaSeg: number | null;
  /** Null = lo que diga la plantilla de la marca. Opcionales: los borradores de antes no los traen. */
  portadaMarca?: boolean | null;
  portadaTexto?: string;
  /** Un diseño propio para la portada de este clip (be#244); null = el de la marca. */
  portadaDiseno?: DisenoPortada | null;
  cambios: [string, boolean][];
  cambiosEtiquetas: [string, boolean][];
  colaboradoresIg: string[];
  colaboradoresFb: string[];
};

/** Un borrador más viejo ya no se recupera: lo más probable es que no sirva. */
const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000;

const clave = (clipId: string, objetivo: string) => `clipfine:programar:${clipId}:${objetivo}`;

export function leerBorradorProgramar(clipId: string, objetivo: string): BorradorProgramar | null {
  try {
    const v = JSON.parse(localStorage.getItem(clave(clipId, objetivo)) ?? "null") as
      | { guardadoEn: number; borrador: BorradorProgramar }
      | null;
    if (!v || Date.now() - v.guardadoEn > VIGENCIA_MS) return null;
    return v.borrador;
  } catch {
    return null;
  }
}

export function guardarBorradorProgramar(clipId: string, objetivo: string, borrador: BorradorProgramar) {
  try {
    localStorage.setItem(clave(clipId, objetivo), JSON.stringify({ guardadoEn: Date.now(), borrador }));
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): la pantalla anda igual.
  }
}

export function borrarBorradorProgramar(clipId: string, objetivo: string) {
  try {
    localStorage.removeItem(clave(clipId, objetivo));
  } catch {
    // Igual que arriba.
  }
}
