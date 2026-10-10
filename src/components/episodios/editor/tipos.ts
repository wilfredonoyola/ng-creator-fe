import type { PlantillaClip } from "@/lib/plantilla-clip";
import type { EstiloTexto, Tema } from "@/lib/estilos-texto";

export interface LineaSubtitulo {
  desde: number;
  hasta: number;
  palabras: { texto: string; desde: number; hasta: number }[];
}

export interface EstiloClip {
  colorSubtitulo: string;
  colorResaltado: string;
  colorGancho: string;
  colorContornoGancho: string;
  /** El logo de la marca y su plantilla de clips (be#117). */
  logoUrl?: string | null;
  plantilla?: PlantillaClip | null;
  /** Los colores de la marca para los estilos de texto (be#132). */
  tema: Tema;
  /** El estilo de texto de la marca: el de los clips que no eligieron otro. */
  estiloTexto: EstiloTexto;
}

/** Las herramientas del editor, en el orden de la barra. */
export const HERRAMIENTAS = ["editar", "texto", "subtitulos", "superposicion", "formato", "auto"] as const;
export type Herramienta = (typeof HERRAMIENTAS)[number];

/** Una palabra de la transcripción, en segundos del episodio. */
export interface Palabra {
  texto: string;
  desde: number;
  hasta: number;
}

/** "Cortar acá" parte la barra en pedazos para elegir uno; lo que se guarda son los cortes. */
export interface SeleccionCortes {
  puntos: number[];
  elegido: { desdeSeg: number; hastaSeg: number } | null;
}

/** 5423.7 → "1:30:23"; 48.2 → "0:48". */
export function reloj(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

/** 12.34 → "0:12.3": los cortes y los textos son de décimas. */
export function relojFino(seg: number): string {
  const s = Math.max(0, seg);
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
}
