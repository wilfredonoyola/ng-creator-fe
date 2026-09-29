/**
 * Las cuentas del encuadre de un clip de episodio, iguales a las del backend
 * (`src/modules/episodios/clip-render.ts` en ng-creator-be).
 *
 * Tienen que ser LAS MISMAS: la vista previa muestra lo que después renderiza
 * ffmpeg, y si una de las dos cambia, el clip sale distinto de como se vio.
 * Por eso están copiadas tal cual, con los mismos nombres, y cualquier cambio
 * va en los dos lados a la vez. Las líneas de subtítulo NO se copian: llegan
 * calculadas del backend (`lineasSubtitulo`).
 */

export type FormatoClip = "VERTICAL" | "CUADRADO" | "HORIZONTAL";

export interface Lienzo {
  ancho: number;
  alto: number;
}

export const LIENZOS: Record<FormatoClip, Lienzo> = {
  VERTICAL: { ancho: 1080, alto: 1920 },
  CUADRADO: { ancho: 1080, alto: 1080 },
  HORIZONTAL: { ancho: 1920, alto: 1080 },
};

export interface Encuadre {
  centroX: number;
  centroY: number;
  zoom: number;
}

/** Una región del cuadro original, en fracciones (0..1). */
export interface Region {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export const ZOOM_MAXIMO = 4;

const entre = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Qué parte del cuadro original entra en el clip. Ver el backend. */
export function recorteDelCuadro(
  fuente: { ancho: number; alto: number },
  formato: FormatoClip,
  encuadre: Encuadre,
): Region {
  const lienzo = LIENZOS[formato];
  const proporcion = lienzo.ancho / lienzo.alto;
  const zoom = entre(encuadre.zoom || 1, 1, ZOOM_MAXIMO);

  let anchoPx = fuente.ancho;
  let altoPx = fuente.ancho / proporcion;
  if (altoPx > fuente.alto) {
    altoPx = fuente.alto;
    anchoPx = fuente.alto * proporcion;
  }
  const ancho = anchoPx / zoom / fuente.ancho;
  const alto = altoPx / zoom / fuente.alto;

  const x = entre(entre(encuadre.centroX, 0, 1) - ancho / 2, 0, 1 - ancho);
  const y = entre(entre(encuadre.centroY, 0, 1) - alto / 2, 0, 1 - alto);
  return { x, y, ancho, alto };
}

/**
 * Cuerpo y altura del subtítulo en píxeles del lienzo. Ver el backend: en
 * DIVIDIDO apilado va en la costura entre los paneles.
 */
export function medidasSubtitulo(
  lienzo: Lienzo,
  diseno: "UNO" | "DIVIDIDO" = "UNO",
): { cuerpo: number; margenAbajo: number } {
  const lado = Math.min(lienzo.ancho, lienzo.alto);
  const cuerpo = Math.round(lado * 0.1);
  if (diseno === "DIVIDIDO" && lienzo.alto >= lienzo.ancho) {
    return { cuerpo, margenAbajo: Math.round(lienzo.alto / 2 - cuerpo * 0.6) };
  }
  return {
    cuerpo,
    margenAbajo: Math.round(lienzo.alto * (lienzo.alto > lienzo.ancho ? 0.22 : 0.1)),
  };
}

/**
 * El gancho, en píxeles del lienzo. Son los valores por defecto del backend
 * (GANCHO_POR_DEFECTO en clips-episodio.service); el tamaño de letra de la
 * marca puede cambiarlos, así que la vista previa del gancho es aproximada en
 * tamaño, no en posición ni en cuándo aparece.
 */
export const GANCHO = { tamano: 64, centroY: 0.2, grosorContorno: 8 };

// ---- Diseño y posiciones en el tiempo (copiado del backend, igual) ----

export type DisenoClip = "UNO" | "DIVIDIDO";

export interface Panel {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export function panelesDe(formato: FormatoClip, diseno: DisenoClip): Panel[] {
  const l = LIENZOS[formato];
  if (diseno !== "DIVIDIDO") return [{ x: 0, y: 0, ancho: l.ancho, alto: l.alto }];
  if (l.alto >= l.ancho) {
    const mitad = Math.floor(l.alto / 2);
    return [
      { x: 0, y: 0, ancho: l.ancho, alto: mitad },
      { x: 0, y: mitad, ancho: l.ancho, alto: l.alto - mitad },
    ];
  }
  const mitad = Math.floor(l.ancho / 2);
  return [
    { x: 0, y: 0, ancho: mitad, alto: l.alto },
    { x: mitad, y: 0, ancho: l.ancho - mitad, alto: l.alto },
  ];
}

export const REGION_MINIMA = 0.05;

export function ajustarRegion(
  region: Region,
  fuente: { ancho: number; alto: number },
  panel: { ancho: number; alto: number },
): Region {
  const k = (panel.ancho / panel.alto) * (fuente.alto / fuente.ancho);
  let ancho = entre(region.ancho || 0, REGION_MINIMA, 1);
  let alto = ancho / k;
  if (alto > 1) {
    alto = 1;
    ancho = k;
  }
  if (alto < REGION_MINIMA) {
    alto = REGION_MINIMA;
    ancho = Math.min(1, alto * k);
  }
  const cx = (region.x || 0) + (region.ancho || 0) / 2;
  const cy = (region.y || 0) + (region.alto || 0) / 2;
  return {
    x: entre(cx - ancho / 2, 0, 1 - ancho),
    y: entre(cy - alto / 2, 0, 1 - alto),
    ancho,
    alto,
  };
}

export function regionPorDefecto(
  fuente: { ancho: number; alto: number },
  panel: { ancho: number; alto: number },
  indice: number,
  total: number,
): Region {
  const cx = total === 1 ? 0.5 : (indice + 0.5) / total;
  const ancho = total === 1 ? 1 : 1 / total;
  return ajustarRegion({ x: cx - ancho / 2, y: 0, ancho, alto: 1 }, fuente, panel);
}

export interface PosicionEfectiva {
  desdeSeg: number;
  regiones: Region[];
}

export function posicionesEfectivas(
  clip: {
    formato: FormatoClip;
    diseno?: DisenoClip | null;
    encuadre?: Encuadre | null;
    posiciones?: { desdeSeg: number; regiones: Region[] }[] | null;
  },
  fuente: { ancho: number; alto: number },
  duracionSeg: number,
): PosicionEfectiva[] {
  const diseno = clip.diseno ?? "UNO";
  const paneles = panelesDe(clip.formato, diseno);
  const defecto = (i: number) =>
    diseno === "UNO" && clip.encuadre
      ? recorteDelCuadro(fuente, clip.formato, clip.encuadre)
      : regionPorDefecto(fuente, paneles[i], i, paneles.length);

  const validas = (clip.posiciones ?? [])
    .filter((p) => Number.isFinite(p.desdeSeg) && p.desdeSeg < duracionSeg)
    .sort((a, b) => a.desdeSeg - b.desdeSeg);
  if (!validas.length) {
    return [{ desdeSeg: 0, regiones: paneles.map((_, i) => defecto(i)) }];
  }

  const salida: PosicionEfectiva[] = [];
  for (const p of validas) {
    const desdeSeg = salida.length ? Math.max(0, p.desdeSeg) : 0;
    const regiones = paneles.map((panel, i) =>
      p.regiones?.[i] ? ajustarRegion(p.regiones[i], fuente, panel) : defecto(i),
    );
    if (salida.length && Math.abs(salida[salida.length - 1].desdeSeg - desdeSeg) < 0.001) {
      salida[salida.length - 1] = { desdeSeg, regiones };
    } else {
      salida.push({ desdeSeg, regiones });
    }
  }
  return salida;
}

export function posicionEn(posiciones: PosicionEfectiva[], t: number): PosicionEfectiva {
  let actual = posiciones[0];
  for (const p of posiciones) if (p.desdeSeg <= t) actual = p;
  return actual;
}

// ---- Textos sobre el clip (copiado del backend, igual) ----

export type FuenteTexto = "NUNITO" | "ANTON" | "BEBAS";
export type EfectoTexto = "NINGUNO" | "CONTORNO" | "SOMBRA" | "CAJA";

/**
 * Nombre de la familia y factor para CSS. libass mide la letra por la altura
 * "win" de la fuente y CSS por el em: sin el factor la vista previa se ve
 * hasta un 70% más grande que el MP4. Ver FUENTES en el backend.
 */
export const FUENTES: Record<FuenteTexto, { familia: string; factorCss: number }> = {
  NUNITO: { familia: "Nunito Black", factorCss: 1000 / 1377 },
  ANTON: { familia: "Anton", factorCss: 2048 / 3550 },
  BEBAS: { familia: "Bebas Neue", factorCss: 1000 / 1300 },
};

export interface Texto {
  contenido: string;
  destacadas: string[];
  fuente: FuenteTexto;
  tamano: number;
  color: string;
  colorDestacado: string;
  efecto: EfectoTexto;
  colorEfecto: string;
  mayusculas: boolean;
  centroX: number;
  centroY: number;
  ancho: number;
  desdeSeg: number;
  hastaSeg?: number | null;
}

export function normalizarPalabra(p: string): string {
  return p
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

export function palabrasDelTexto(t: Pick<Texto, "contenido" | "destacadas" | "mayusculas">) {
  const destacadas = new Set(t.destacadas.map(normalizarPalabra).filter(Boolean));
  const contenido = t.mayusculas ? t.contenido.toLocaleUpperCase("es") : t.contenido;
  return contenido
    .split(/\s+/)
    .filter(Boolean)
    .map((texto) => ({ texto, destacada: destacadas.has(normalizarPalabra(texto)) }));
}

export function medidasEfecto(efecto: EfectoTexto, tamano: number) {
  switch (efecto) {
    case "CONTORNO":
      return { borde: Math.max(3, Math.round(tamano * 0.08)), sombra: 0 };
    case "SOMBRA":
      return { borde: 0, sombra: Math.max(3, Math.round(tamano * 0.07)) };
    case "CAJA":
      return { borde: Math.max(6, Math.round(tamano * 0.22)), sombra: 0 };
    default:
      return { borde: 0, sombra: 0 };
  }
}
