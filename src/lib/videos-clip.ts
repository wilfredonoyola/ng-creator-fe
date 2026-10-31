import { aTiempoDeSalida, aTiempoDelEpisodio, duracionEfectiva, type Corte } from "@/lib/cortes";

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
export const TOPE_VIDEO_CLIP_MB = 500;
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

/**
 * El tramo del clip en el episodio (segundos del episodio) con sus cortes:
 * con eso se pasa del tiempo original del clip a la salida y de vuelta.
 */
export interface TramoDelClip {
  desde: number;
  hasta: number;
  cortes: readonly Corte[];
}

/** Lo mínimo que puede durar un video recortado (en la línea de tiempo o en el panel). */
export const MINIMO_VIDEO_SEG = 0.3;

type TiemposVideo = Pick<VideoClip, "desdeSeg" | "hastaSeg" | "inicioSeg" | "duracionSeg">;

const decimas = (n: number) => Math.round(n * 10) / 10;
const largoDe = (c: TramoDelClip) => Math.max(0, c.hasta - c.desde);
/** Segundo del clip original → segundo de la salida (sin los cortes). */
const aSalida = (segClip: number, c: TramoDelClip) => aTiempoDeSalida(c.desde + Math.max(0, segClip), c.desde, c.cortes);
/** La inversa: segundo de la salida → segundo del clip original. */
const aClip = (segSalida: number, c: TramoDelClip) => aTiempoDelEpisodio(segSalida, c.desde, c.hasta, c.cortes) - c.desde;

/**
 * Dónde se le acaba el archivo, en segundos del clip original. El video corre
 * de corrido en la salida (como en `momentoDelVideo`): si hay un corte en el
 * medio, termina más tarde en el tiempo original. Puede quedar después del
 * final del clip. La velocidad no cambia la cuenta: el video de encima va a la
 * misma velocidad que el clip.
 */
export function finDelArchivo(v: TiemposVideo, c: TramoDelClip): number {
  const efectiva = duracionEfectiva(c.desde, c.hasta, c.cortes);
  const fin = aSalida(v.desdeSeg, c) + Math.max(0, v.duracionSeg - v.inicioSeg);
  return fin >= efectiva ? largoDe(c) + (fin - efectiva) : aClip(fin, c);
}

/** Hasta dónde se ve, en segundos del clip original, con los cortes: lo que dibuja la línea de tiempo. */
export function finVisible(v: TiemposVideo, c: TramoDelClip): number {
  const pedido = v.hastaSeg && v.hastaSeg > v.desdeSeg ? v.hastaSeg : Infinity;
  return Math.min(finDelArchivo(v, c), pedido, largoDe(c));
}

/** Sin tope propio si llega (casi) a donde llegaría solo: así no queda un `hastaSeg` de más. */
function conFin<T extends TiemposVideo>(v: T, hasta: number, c: TramoDelClip): T {
  const natural = Math.min(finDelArchivo({ ...v, hastaSeg: null }, c), largoDe(c));
  return { ...v, hastaSeg: hasta >= natural - 0.05 ? null : decimas(hasta) };
}

export type ModoRecorte = "mover" | "inicio" | "fin";

/**
 * Un arrastre en la línea de tiempo, como en CapCut. `corrida` son los
 * segundos del clip que se movió el puntero desde que se agarró (`v` es como
 * estaba al agarrarlo).
 *
 * - mover: corre `desdeSeg` (y `hastaSeg` si tiene) sin tocar `inicioSeg`.
 * - inicio: recorta el principio: `desdeSeg` e `inicioSeg` se mueven juntos
 *   (el final queda donde estaba); no va antes del 0 del archivo ni del clip.
 * - fin: recorta el final (`hastaSeg`); no pasa del final del archivo ni del clip.
 */
export function recortarVideo<T extends TiemposVideo>(v: T, modo: ModoRecorte, corrida: number, c: TramoDelClip): T {
  const largo = largoDe(c);
  const fin = finVisible(v, c);
  if (modo === "mover") {
    const d = decimas(Math.min(Math.max(0, v.desdeSeg + corrida), Math.max(0, largo - MINIMO_VIDEO_SEG)));
    const d0 = v.desdeSeg;
    return { ...v, desdeSeg: d, hastaSeg: v.hastaSeg && v.hastaSeg > d0 ? decimas(v.hastaSeg + (d - d0)) : null };
  }
  if (modo === "inicio") {
    const sal0 = aSalida(v.desdeSeg, c);
    // Lo más atrás que puede ir: donde el archivo está en su segundo 0.
    const minimo = sal0 - v.inicioSeg <= 0 ? 0 : aClip(sal0 - v.inicioSeg, c);
    // Si cae en un corte, va adonde ese corte termina: ahí es donde se empieza a ver.
    const pedido = decimas(v.desdeSeg + corrida);
    const visible = aClip(aSalida(pedido, c), c);
    const d = Math.min(Math.max(minimo, Math.abs(visible - pedido) > 0.001 ? visible : pedido), fin - MINIMO_VIDEO_SEG);
    const inicioSeg = Math.max(0, Math.round((v.inicioSeg + aSalida(d, c) - sal0) * 1000) / 1000);
    // El final no se mueve: si no tenía tope, sigue siendo el del archivo (que corre igual que el inicio).
    return { ...v, desdeSeg: Math.max(0, d), inicioSeg };
  }
  const tope = Math.min(finDelArchivo(v, c), largo);
  const h = Math.max(Math.min(tope, fin + corrida), v.desdeSeg + MINIMO_VIDEO_SEG);
  return conFin(v, h, c);
}

/**
 * El tramo del archivo que se usa (segundos del archivo): desde `inicioSeg`
 * hasta donde se deja de ver.
 */
export function tramoDelArchivo(v: TiemposVideo, c: TramoDelClip): { inicio: number; fin: number } {
  const salDesde = aSalida(v.desdeSeg, c);
  const salFin = aSalida(finVisible(v, c), c);
  return { inicio: v.inicioSeg, fin: Math.min(v.duracionSeg, v.inicioSeg + Math.max(0, salFin - salDesde)) };
}

/** Cuánto del archivo entra en el clip desde donde aparece (segundos de salida). */
export function lugarEnElClip(v: TiemposVideo, c: TramoDelClip): number {
  return Math.max(0, duracionEfectiva(c.desde, c.hasta, c.cortes) - aSalida(v.desdeSeg, c));
}

/**
 * Del panel: usar del archivo de `inicio` a `fin` (segundos del archivo). El
 * video sigue apareciendo en el mismo `desdeSeg`; el final pasa al tiempo
 * del clip (hastaSeg = desdeSeg + (fin − inicio), en la salida).
 */
export function conTramoDelArchivo<T extends TiemposVideo>(v: T, inicio: number, fin: number, c: TramoDelClip): T {
  const i = Math.min(Math.max(0, Math.round(inicio * 1000) / 1000), Math.max(0, v.duracionSeg - MINIMO_VIDEO_SEG));
  const f = Math.min(v.duracionSeg, Math.max(fin, i + MINIMO_VIDEO_SEG));
  const conInicio = { ...v, inicioSeg: i };
  if (f >= v.duracionSeg - 0.05) return { ...conInicio, hastaSeg: null };
  return conFin(conInicio, aClip(aSalida(v.desdeSeg, c) + (f - i), c), c);
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
