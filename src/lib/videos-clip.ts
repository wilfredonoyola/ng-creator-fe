import { aTiempoDeSalida, type Corte } from "@/lib/cortes";

/**
 * Los videos sobre un clip (be#246): como las imágenes, pero con movimiento
 * y, si se quiere, con sonido. Van encima del video y de las imágenes, debajo
 * de los textos, el logo y los subtítulos.
 *
 * Los tiempos (`desdeSeg`, `hastaSeg`) son del clip original, como los de las
 * imágenes; `inicioSeg` es desde qué segundo del archivo arranca. No hace
 * loop: se va al terminar el archivo, al llegar a `hastaSeg` o al final del
 * clip, lo que pase primero.
 */
export type SonidoVideoClip = "SIN_SONIDO" | "MEZCLADO" | "SOLO_VIDEO";

export interface VideoClip {
  /** Lo genera el cliente. */
  id: string;
  url: string;
  centroX: number;
  centroY: number;
  /** Fracción del ancho del lienzo; el alto sale del aspecto del video. */
  ancho: number;
  /** Cubre todo el lienzo (recorta lo que sobra): centro y ancho no cuentan. */
  pantallaCompleta: boolean;
  desdeSeg: number;
  hastaSeg: number | null;
  inicioSeg: number;
  sonido: SonidoVideoClip;
  /** 0 a 2. */
  volumen: number;
  /**
   * Lo que midió el servidor al subirlo. No se manda al guardar (el servidor
   * lo lee de la url): acá sirve para dibujarlo y para los topes del panel.
   */
  duracionSeg: number;
  anchoVideo: number;
  altoVideo: number;
  tieneAudio: boolean;
}

export const MAXIMO_VIDEOS = 3;
export const VIDEO_ANCHO_MIN = 0.05;
export const VIDEO_ANCHO_MAX = 1;
export const VOLUMEN_VIDEO_MAX = 2;

/** Lo que acepta POST /uploads/clip-video. */
export const TOPE_VIDEO_CLIP_MB = 200;
export const EXTENSIONES_VIDEO_CLIP = ["mp4", "mov", "webm", "m4v"];
export const FORMATOS_VIDEO_CLIP = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];

/** Lo que devuelve la subida. */
export interface VideoSubido {
  url: string;
  duracionSeg: number;
  anchoVideo: number;
  altoVideo: number;
  tieneAudio: boolean;
}

/** De pie: más alto que ancho. Va a pantalla completa por defecto. */
export const esVertical = (v: { anchoVideo: number; altoVideo: number }) => v.altoVideo > v.anchoVideo;

function idCorto(): string {
  const c = globalThis.crypto;
  return c?.randomUUID ? c.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
}

/**
 * Un video recién subido: un vertical va a pantalla completa (es lo que se
 * quiere casi siempre: el clip entero pasa a ser ese video); uno horizontal,
 * a la mitad del ancho y en el centro. Sin sonido, desde el principio del
 * clip hasta que termine.
 */
export function videoNuevo(s: VideoSubido, existentes: VideoClip[]): VideoClip {
  const lugares = [0.5, 0.3, 0.7];
  const centroY = lugares[existentes.length % lugares.length];
  return {
    id: idCorto(),
    url: s.url,
    centroX: 0.5,
    centroY,
    ancho: 0.6,
    pantallaCompleta: esVertical(s),
    desdeSeg: 0,
    hastaSeg: null,
    inicioSeg: 0,
    sonido: "SIN_SONIDO",
    volumen: 1,
    duracionSeg: s.duracionSeg,
    anchoVideo: s.anchoVideo,
    altoVideo: s.altoVideo,
    tieneAudio: s.tieneAudio,
  };
}

/**
 * Hasta dónde se ve, en segundos del clip original (sin cortes): su
 * `hastaSeg` si tiene, si no lo que le queda al archivo, y nunca después del
 * clip. La misma cuenta que `finDeVideo` del backend.
 */
export function finDeVideo(v: Pick<VideoClip, "desdeSeg" | "hastaSeg" | "inicioSeg" | "duracionSeg">, duracionClip: number): number {
  const queda = v.desdeSeg + Math.max(0, v.duracionSeg - v.inicioSeg);
  const pedido = v.hastaSeg && v.hastaSeg > v.desdeSeg ? v.hastaSeg : Infinity;
  return Math.min(queda, pedido, duracionClip);
}

/**
 * Dónde está el video en este momento, como lo arma el render: los tiempos
 * pasan a la salida (sin los cortes) y ahí el video corre de corrido, aunque
 * el clip salte un corte. Devuelve el segundo del archivo, o null si no se ve.
 *
 * `t` es el segundo del episodio donde está el reproductor del clip.
 */
export function momentoDelVideo(
  v: Pick<VideoClip, "desdeSeg" | "hastaSeg" | "inicioSeg" | "duracionSeg">,
  t: number,
  clip: { desde: number; hasta: number; cortes: readonly Corte[]; efectiva: number },
): number | null {
  const salida = (segClip: number) => aTiempoDeSalida(clip.desde + segClip, clip.desde, clip.cortes);
  const desdeSal = salida(Math.max(0, v.desdeSeg));
  const pedido = v.hastaSeg && v.hastaSeg > v.desdeSeg ? salida(v.hastaSeg) : Infinity;
  const fin = Math.min(desdeSal + Math.max(0, v.duracionSeg - v.inicioSeg), pedido, clip.efectiva);
  const ts = aTiempoDeSalida(Math.min(Math.max(t, clip.desde), clip.hasta), clip.desde, clip.cortes);
  if (ts < desdeSal || ts >= fin) return null;
  return v.inicioSeg + (ts - desdeSal);
}

/** Cómo viene del servidor (Apollo, sin tipos generados). */
type VideoServidor = Partial<VideoClip> & { url: string; id: string };

/** Del clip guardado al borrador. */
export function videosDelClip(videos: VideoServidor[] | null | undefined): VideoClip[] {
  return (videos ?? []).map((v) => ({
    id: v.id,
    url: v.url,
    centroX: v.centroX ?? 0.5,
    centroY: v.centroY ?? 0.5,
    ancho: v.ancho ?? 0.6,
    pantallaCompleta: v.pantallaCompleta ?? false,
    desdeSeg: v.desdeSeg ?? 0,
    hastaSeg: v.hastaSeg ?? null,
    inicioSeg: v.inicioSeg ?? 0,
    sonido: v.sonido ?? "SIN_SONIDO",
    volumen: v.volumen ?? 1,
    duracionSeg: v.duracionSeg ?? 0,
    anchoVideo: v.anchoVideo ?? 16,
    altoVideo: v.altoVideo ?? 9,
    tieneAudio: v.tieneAudio ?? false,
  }));
}

/** Del borrador al `VideoClipInput`: sin lo que mide el servidor. */
export function videosAlInput(videos: VideoClip[]) {
  return videos.map(({ id, url, centroX, centroY, ancho, pantallaCompleta, desdeSeg, hastaSeg, inicioSeg, sonido, volumen }) => ({
    id,
    url,
    centroX,
    centroY,
    ancho,
    pantallaCompleta,
    desdeSeg,
    hastaSeg: hastaSeg ?? null,
    inicioSeg,
    sonido,
    volumen,
  }));
}
