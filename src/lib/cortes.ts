/**
 * Los cortes en el medio de un clip: pedazos del tramo que no salen en el MP4.
 *
 * Todo en SEGUNDOS DEL EPISODIO, como `desdeSeg`/`hastaSeg` del clip. Lo que
 * queda son los "tramos", y el "tiempo de salida" es el del clip ya cortado
 * (0 = el primer cuadro del MP4). Textos, encuadres y subtítulos siguen en el
 * tiempo original del clip; el gancho y la llamada a la acción, en el de salida.
 *
 * Funciones puras: las usa el editor y se prueban sin React.
 */

export interface Corte {
  desdeSeg: number;
  hastaSeg: number;
}

/** Un corte más corto que esto no se guarda (el mismo mínimo que el backend). */
export const CORTE_MINIMO_SEG = 0.1;

/** Lo mínimo que tiene que quedar del clip después de cortar. */
export const DURACION_MINIMA_SEG = 1;

const redondo = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Deja los cortes como los espera el backend: dentro del clip, ordenados y sin
 * solaparse (los que se tocan o se pisan se unen). Descarta los muy cortos.
 */
export function normalizarCortes(cortes: readonly Corte[], desde: number, hasta: number): Corte[] {
  const dentro = cortes
    .map((c) => ({
      desdeSeg: redondo(Math.max(desde, Math.min(c.desdeSeg, c.hastaSeg))),
      hastaSeg: redondo(Math.min(hasta, Math.max(c.desdeSeg, c.hastaSeg))),
    }))
    .filter((c) => c.hastaSeg - c.desdeSeg >= CORTE_MINIMO_SEG)
    .sort((a, b) => a.desdeSeg - b.desdeSeg);
  const unidos: Corte[] = [];
  for (const c of dentro) {
    const ultimo = unidos[unidos.length - 1];
    if (ultimo && c.desdeSeg <= ultimo.hastaSeg + 0.001) {
      ultimo.hastaSeg = Math.max(ultimo.hastaSeg, c.hastaSeg);
    } else {
      unidos.push({ ...c });
    }
  }
  return unidos;
}

/** Une dos listas de cortes (p. ej. los actuales y los silencios sugeridos). */
export function unirCortes(a: readonly Corte[], b: readonly Corte[], desde: number, hasta: number): Corte[] {
  return normalizarCortes([...a, ...b], desde, hasta);
}

/** Lo que queda del clip: los pedazos entre los cortes. */
export function tramosDelClip(desde: number, hasta: number, cortes: readonly Corte[]): Corte[] {
  const tramos: Corte[] = [];
  let ini = desde;
  for (const c of normalizarCortes(cortes, desde, hasta)) {
    if (c.desdeSeg > ini) tramos.push({ desdeSeg: ini, hastaSeg: c.desdeSeg });
    ini = Math.max(ini, c.hastaSeg);
  }
  if (hasta > ini) tramos.push({ desdeSeg: ini, hastaSeg: hasta });
  return tramos;
}

/** Cuánto dura el clip ya cortado. */
export function duracionEfectiva(desde: number, hasta: number, cortes: readonly Corte[]): number {
  return tramosDelClip(desde, hasta, cortes).reduce((s, t) => s + (t.hastaSeg - t.desdeSeg), 0);
}

/** El corte en el que cae `t` (segundo del episodio), o null. */
export function estaCortado(t: number, cortes: readonly Corte[]): Corte | null {
  return cortes.find((c) => t >= c.desdeSeg && t < c.hastaSeg) ?? null;
}

/**
 * Adónde saltar si `t` cae en un corte: el final del corte (y del siguiente,
 * si se tocan). Fuera de un corte, `t` tal cual.
 */
export function siguienteTiempoVisible(t: number, cortes: readonly Corte[]): number {
  let r = t;
  for (let c = estaCortado(r, cortes); c; c = estaCortado(r, cortes)) r = c.hastaSeg;
  return r;
}

/**
 * Segundo del episodio → segundo del clip ya cortado (0 = el inicio del MP4).
 * Dentro de un corte da el punto donde ese corte "desaparece".
 */
export function aTiempoDeSalida(tEpisodio: number, desde: number, cortes: readonly Corte[]): number {
  let quitado = 0;
  for (const c of cortes) {
    if (c.hastaSeg <= tEpisodio) quitado += c.hastaSeg - c.desdeSeg;
    else if (c.desdeSeg < tEpisodio) quitado += tEpisodio - c.desdeSeg;
  }
  return Math.max(0, tEpisodio - desde - quitado);
}

/** La inversa: segundo del clip cortado → segundo del episodio (nunca dentro de un corte). */
export function aTiempoDelEpisodio(tSalida: number, desde: number, hasta: number, cortes: readonly Corte[]): number {
  let falta = Math.max(0, tSalida);
  const tramos = tramosDelClip(desde, hasta, cortes);
  for (const t of tramos) {
    const largo = t.hastaSeg - t.desdeSeg;
    if (falta < largo) return t.desdeSeg + falta;
    falta -= largo;
  }
  return tramos.length ? tramos[tramos.length - 1].hastaSeg : desde;
}

/**
 * Los pedazos que se pueden elegir en la barra: los tramos, partidos además en
 * los puntos donde se tocó "Cortar acá".
 */
export function pedazosDelClip(desde: number, hasta: number, cortes: readonly Corte[], puntos: readonly number[]): Corte[] {
  const orden = [...puntos].sort((a, b) => a - b);
  return tramosDelClip(desde, hasta, cortes).flatMap((t) => {
    const dentro = orden.filter((p) => p > t.desdeSeg + CORTE_MINIMO_SEG && p < t.hastaSeg - CORTE_MINIMO_SEG);
    const bordes = [t.desdeSeg, ...dentro, t.hastaSeg];
    return bordes.slice(1).map((h, i) => ({ desdeSeg: bordes[i], hastaSeg: h }));
  });
}

/**
 * Agrega un corte. Devuelve null si dejaría el clip con menos de
 * `DURACION_MINIMA_SEG` (no se puede quitar todo).
 */
export function agregarCorte(cortes: readonly Corte[], nuevo: Corte, desde: number, hasta: number): Corte[] | null {
  const r = normalizarCortes([...cortes, nuevo], desde, hasta);
  return duracionEfectiva(desde, hasta, r) < DURACION_MINIMA_SEG ? null : r;
}
