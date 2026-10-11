/**
 * El audio del editor (Tanda 2, be#173): la biblioteca de sonidos y lo que el
 * clip guarda de ellos (volumen de la voz, velocidad, música y efectos).
 *
 * Los tiempos de los efectos van en el TIEMPO ORIGINAL del clip, como los
 * textos y las imágenes: si caen en un corte, no suenan. La música arranca con
 * el MP4 y no se acelera.
 */

export type TipoSonido = "MUSICA" | "EFECTO";

/** Un sonido de la biblioteca. Sin `marcaId` es de Clipfine. */
export interface Sonido {
  _id: string;
  tipo: TipoSonido;
  titulo: string;
  categoria?: string | null;
  url: string;
  duracionSeg: number;
  marcaId?: string | null;
  fuente?: string | null;
  createdAt?: string;
}

/** La música de fondo del clip. */
export interface MusicaClip {
  sonidoId: string;
  url: string;
  titulo: string;
  /** 0 a 1. */
  volumen: number;
  /** Baja sola cuando hablan. */
  bajarAlHablar: boolean;
}

/** Un efecto de sonido en un segundo del clip (tiempo original). */
export interface EfectoClip {
  id: string;
  sonidoId: string;
  url: string;
  titulo: string;
  enSeg: number;
  duracionSeg: number;
  /** 0 a 2. */
  volumen: number;
}

/** Lo mismo que valida el backend. */
export const VOLUMEN_VOZ_MAX = 2;
export const VOLUMEN_EFECTO_MAX = 2;
export const VOLUMEN_MUSICA_POR_DEFECTO = 0.25;
export const MAXIMO_EFECTOS = 20;
export const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

/** Lo que acepta POST /uploads/sonido. */
export const SONIDO_MAX_BYTES = 60 * 1024 * 1024;
export const MUSICA_MAX_SEG = 15 * 60;
export const EFECTO_MAX_SEG = 30;

/** Lo que dura el MP4 con la velocidad (la cuenta de `duracionFinalSeg`). */
export const duracionFinal = (efectiva: number, velocidad: number) => efectiva / (velocidad || 1);

/** 1.5 → "1.5x"; 0.75 → "0.75x". */
export const textoVelocidad = (v: number) => `${Number(v.toFixed(2))}x`;

/** Un id para un efecto nuevo: solo tiene que ser único dentro del clip. */
export const idEfecto = () => `ef-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Agrupa por categoría, en orden alfabético; los sin categoría van al final (clave ""). */
export function porCategoria(sonidos: readonly Sonido[]): [string, Sonido[]][] {
  const grupos = new Map<string, Sonido[]>();
  for (const s of sonidos) {
    const c = s.categoria?.trim() ?? "";
    const lista = grupos.get(c) ?? [];
    lista.push(s);
    grupos.set(c, lista);
  }
  return Array.from(grupos.entries())
    .map(([c, lista]) => [c, [...lista].sort((a, b) => a.titulo.localeCompare(b.titulo))] as [string, Sonido[]])
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
}

/** Busca sin mirar mayúsculas ni tildes, en el título, la categoría y la fuente. */
export function filtrarSonidos(sonidos: readonly Sonido[], texto: string): Sonido[] {
  const limpio = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const q = limpio(texto.trim());
  if (!q) return [...sonidos];
  return sonidos.filter((s) => limpio(`${s.titulo} ${s.categoria ?? ""} ${s.fuente ?? ""}`).includes(q));
}

/** El título a partir del nombre del archivo: "mi-cancion_final.mp3" → "mi cancion final". */
export const tituloDeArchivo = (nombre: string) =>
  nombre
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .slice(0, 120);
