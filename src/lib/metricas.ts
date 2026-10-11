/**
 * Las métricas de lo publicado (ng-creator-be#119): los tipos que devuelve el
 * backend y las reglas para mostrarlas.
 *
 * La regla de fondo: null no es cero. Cada red informa cosas distintas
 * (Facebook da vistas, likes y comentarios y nada más), así que un dato que la
 * red no da se muestra como "—". Un 0 diría que al clip le fue mal en algo que
 * nadie midió.
 */

export type RedMetricas = "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "YOUTUBE";

export interface TotalesMetricas {
  publicaciones: number;
  vistas?: number | null;
  likes?: number | null;
  comentarios?: number | null;
  compartidos?: number | null;
  guardados?: number | null;
  alcance?: number | null;
  seguidoresGanados?: number | null;
  interacciones?: number | null;
  /** Fracción (0-1): interacciones sobre vistas, solo de lo que informa las dos. */
  tasaInteraccion?: number | null;
}

/** Un reparto: orígenes del tráfico, países o tipo de público. */
export interface ParteReparto {
  clave: string;
  fraccion: number;
}

export interface MetricasPublicacion {
  vistas?: number | null;
  likes?: number | null;
  comentarios?: number | null;
  compartidos?: number | null;
  guardados?: number | null;
  alcance?: number | null;
  seguidoresGanados?: number | null;
  tiempoMedioSeg?: number | null;
  /** YouTube: qué parte del video se vio en promedio (0-1). */
  fraccionVista?: number | null;
  /** TikTok: qué parte de las vistas llegó al final (0-1). */
  fraccionCompleta?: number | null;
  minutosVistos?: number | null;
  seguidoresCuenta?: number | null;
  /** TikTok: qué fracción sigue mirando en cada segundo. */
  retencion?: { seg: number; fraccion: number }[] | null;
  origenes?: ParteReparto[] | null;
  paises?: ParteReparto[] | null;
  publico?: ParteReparto[] | null;
}

export interface PublicacionConMetricas {
  _id: string;
  red: RedMetricas;
  cuentaNombre?: string | null;
  permalink?: string | null;
  publicadaEn?: string | null;
  metricasEn?: string | null;
  metricas?: MetricasPublicacion | null;
}

export interface PuntoCurva {
  publicacionId: string;
  red: RedMetricas;
  horas: number;
  vistas?: number | null;
  interacciones?: number | null;
}

export interface MetricasDeClip {
  clipId: string;
  actualizadoEn?: string | null;
  totales: TotalesMetricas;
  publicaciones: PublicacionConMetricas[];
  curva: PuntoCurva[];
}

export interface ClipConMetricas {
  clipId: string;
  episodioId?: string | null;
  titulo?: string | null;
  urlPoster?: string | null;
  /** Lo que la IA predijo (0-100). Los clips hechos a mano no lo tienen. */
  puntuacion?: number | null;
  motivo?: string | null;
  origen?: "IA" | "MANUAL" | null;
  publicadoEn: string;
  redes: RedMetricas[];
  totales: TotalesMetricas;
}

/** Un grupo de clips (por motivo, por puntuación o por hora) y su promedio. */
export interface GrupoRendimiento {
  clave: string;
  /** La muestra: va SIEMPRE al lado del promedio. */
  clips: number;
  vistasPromedio?: number | null;
  tasaInteraccion?: number | null;
}

export interface ResumenRed {
  red: RedMetricas;
  seguidores?: number | null;
  seguidoresCambio?: number | null;
  totales: TotalesMetricas;
}

export interface ResumenMetricas {
  dias: number;
  desde: string;
  hasta: string;
  clips: number;
  actualizadoEn?: string | null;
  totales: TotalesMetricas;
  anterior: TotalesMetricas;
  porRed: ResumenRed[];
  mejores: ClipConMetricas[];
  peores: ClipConMetricas[];
  porMotivo: GrupoRendimiento[];
  porPuntuacion: GrupoRendimiento[];
  porHora: GrupoRendimiento[];
}

/** Los períodos que se ofrecen, en días. El de entrada es el del medio. */
export const PERIODOS_METRICAS = [7, 30, 90] as const;
export const PERIODO_INICIAL = 30;

/** Un período válido a partir de lo que venga en la URL (`?dias=`). */
export function periodoDe(valor: string | null | undefined): number {
  const n = Number(valor);
  return (PERIODOS_METRICAS as readonly number[]).includes(n) ? n : PERIODO_INICIAL;
}

/** Los rangos de puntuación de la IA, del mejor al peor, como los manda el backend. */
export const RANGOS_PUNTUACION = ["90+", "70-89", "50-69", "<50"] as const;

/**
 * Con menos clips que esto, un promedio de grupo es anécdota: se dibuja
 * apagado y no entra en las conclusiones. Más bajo que el del análisis de la
 * página (10) porque acá cada punto es un clip, no un post, y una marca
 * publica decenas por mes, no cientos.
 */
export const MINIMO_CLIPS = 3;

/**
 * El color de cada red en las curvas: el suyo, salvo TikTok (negro sobre el
 * fondo negro no se vería) que va con su celeste. Sin el amarillo de la marca,
 * que en esta pantalla ya marca lo destacado.
 */
export const COLOR_RED: Record<RedMetricas, string> = {
  FACEBOOK: "#1877F2",
  INSTAGRAM: "#F58529",
  YOUTUBE: "#FF3B30",
  TIKTOK: "#25F4EE",
};

/** La zona horaria del navegador: la "mejor hora" es en el reloj de quien mira. */
export function zonaDelNavegador(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Un número entero, o "—" si la red no lo informa. */
export function numero(valor: number | null | undefined, locale: string): string {
  if (valor == null) return "—";
  return Math.round(valor).toLocaleString(locale);
}

/** Un número abreviado (12,3 mil / 12.3K), o "—" si la red no lo informa. */
export function compacto(valor: number | null | undefined, locale: string): string {
  if (valor == null) return "—";
  if (Math.abs(valor) < 10_000) return Math.round(valor).toLocaleString(locale);
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(valor);
}

/** Una fracción (0-1) como porcentaje, o "—". */
export function porcentaje(fraccion: number | null | undefined, locale: string, decimales = 1): string {
  if (fraccion == null) return "—";
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: decimales,
    minimumFractionDigits: 0,
  }).format(fraccion);
}

/**
 * Variación contra el período anterior, en porcentaje. null cuando no hay con
 * qué comparar: sin dato en alguno de los dos, o el anterior en cero (de 0 a
 * 500 no es "+∞ %").
 */
export function cambioPorcentual(
  actual: number | null | undefined,
  anterior: number | null | undefined,
): number | null {
  if (actual == null || !anterior) return null;
  return ((actual - anterior) / anterior) * 100;
}

/** El mejor grupo con muestra suficiente, por vistas promedio. */
export function mejorGrupo(grupos: GrupoRendimiento[]): GrupoRendimiento | null {
  const confiables = grupos.filter((g) => g.clips >= MINIMO_CLIPS && g.vistasPromedio != null);
  if (!confiables.length) return null;
  return confiables.reduce((a, b) => (b.vistasPromedio! > a.vistasPromedio! ? b : a));
}

/**
 * Cuánto se fue en los primeros 3 segundos, de la curva de retención de
 * TikTok: el número que dice si el gancho funcionó.
 */
export function seFueEnTres(retencion: { seg: number; fraccion: number }[] | null | undefined): number | null {
  if (!retencion?.length) return null;
  const inicio = retencion.find((p) => p.seg === 0)?.fraccion ?? 1;
  // El segundo 3, o el último antes de él si la curva es más corta.
  const enTres = [...retencion].filter((p) => p.seg <= 3).sort((a, b) => b.seg - a.seg)[0];
  if (!enTres || enTres.seg === 0 || !inicio) return null;
  return Math.max(0, 1 - enTres.fraccion / inicio);
}

/** Un reparto de varias publicaciones en uno solo, pesado por las vistas de cada una. */
export function juntarRepartos(
  partes: { reparto?: ParteReparto[] | null; vistas?: number | null }[],
): ParteReparto[] {
  const suma = new Map<string, number>();
  let total = 0;
  for (const { reparto, vistas } of partes) {
    if (!reparto?.length) continue;
    const peso = vistas && vistas > 0 ? vistas : 1;
    total += peso;
    for (const p of reparto) suma.set(p.clave, (suma.get(p.clave) ?? 0) + p.fraccion * peso);
  }
  if (!total) return [];
  return [...suma.entries()]
    .map(([clave, s]) => ({ clave, fraccion: s / total }))
    .filter((p) => p.fraccion > 0)
    .sort((a, b) => b.fraccion - a.fraccion);
}

/** "3 h", "2 d": cuánto pasó desde que salió, para el eje de la curva. */
export function etiquetaHoras(horas: number): { n: number; unidad: "h" | "d" } {
  return horas < 48 ? { n: Math.round(horas), unidad: "h" } : { n: Math.round(horas / 24), unidad: "d" };
}
