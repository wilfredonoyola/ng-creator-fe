/**
 * Reglas del análisis de rendimiento.
 *
 * La regla central es de honestidad estadística, no de diseño: un promedio
 * sobre pocas publicaciones no es evidencia de nada. En el historial real de
 * una de las páginas, la hora con MEJOR score promedio tenía 9 publicaciones,
 * mientras que la de las 9 de la mañana tenía 268. Mostrar las dos igual haría
 * cambiar la rutina de trabajo por nueve posts.
 */

export interface Tramo {
  clave: number;
  posts: number;
  scorePromedio: number;
  reaccionesPromedio: number;
  comentariosPromedio: number;
  compartidosPromedio: number;
}

export const COLOR_SERIE = "#0FED9D";
/** Validado: separación CVD 20.9 y contraste ≥3:1 sobre el fondo de la app. */
export const COLOR_POCA_MUESTRA = "#8A8A8A";

/** Nunca se considera confiable un tramo con menos de esto, mida lo que mida. */
const MINIMO_ABSOLUTO = 10;

/**
 * Cuántas publicaciones necesita un tramo para que su promedio cuente.
 *
 * Se calcula contra la mediana y no con un número fijo porque depende del
 * volumen de cada página: 10 posts son muchos en una página chica y ruido en
 * una con miles.
 */
export function umbralDeMuestra(tramos: Tramo[]): number {
  const conteos = tramos.map((t) => t.posts).sort((a, b) => a - b);
  if (!conteos.length) return MINIMO_ABSOLUTO;
  const mediana = conteos[Math.floor(conteos.length / 2)];
  return Math.max(MINIMO_ABSOLUTO, Math.round(mediana * 0.25));
}

export function esConfiable(tramo: Tramo, umbral: number): boolean {
  return tramo.posts >= umbral;
}

/**
 * El mejor tramo, contando SOLO los que tienen muestra suficiente.
 *
 * Es la diferencia entre una recomendación y una casualidad.
 */
export function mejorTramo(tramos: Tramo[], umbral: number): Tramo | null {
  const confiables = tramos.filter((t) => esConfiable(t, umbral));
  if (!confiables.length) return null;
  return confiables.reduce((a, b) =>
    b.scorePromedio > a.scorePromedio ? b : a,
  );
}

export const DIAS = [
  "",
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const DIAS_CORTOS = ["", "Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function etiquetaHora(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

/** Variación entre dos períodos, en porcentaje. null cuando no hay con qué comparar. */
export function variacion(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return ((actual - anterior) / anterior) * 100;
}
