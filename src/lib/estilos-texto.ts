import {
  medidasSubtitulo,
  palabrasDelTexto,
  type DisenoClip,
  type Lienzo,
  type Texto,
} from "@/lib/clip-encuadre";
import { CARACTERES, METRICAS } from "@/lib/metricas-fuentes";

/**
 * Los estilos de texto de los clips (ng-creator-be#132): la galería de
 * gancho + subtítulos, cada marca con sus colores (su tema).
 *
 * Las definiciones NO se copian: llegan del backend (query `estilosTexto`),
 * que es la misma tabla que usa el render. Lo que sí se copia, igual que las
 * cuentas del encuadre en clip-encuadre.ts, es CÓMO se dibuja cada estilo
 * (`ass-estilos.ts` en el backend): dónde corta cada renglón, dónde va cada
 * palabra, cada píldora y cada caja. Se mide con las mismas métricas de las
 * fuentes que usa el render (metricas-fuentes.ts), así que lo que se ve en la
 * vista previa es lo que sale en el MP4. Cualquier cambio va en los dos lados.
 */

export type EstiloTexto =
  | "POP"
  | "KARAOKE"
  | "PASTILLA"
  | "BESTIA"
  | "MARCA"
  | "EDITORIAL"
  | "ROTULO"
  | "MINIMO"
  | "KEYNOTE";

/** El de los clips de antes y el de una marca que no eligió otro. */
export const ESTILO_TEXTO_POR_DEFECTO: EstiloTexto = "KARAOKE";

export type CategoriaEstiloTexto = "VIRAL" | "PROFESIONAL";
export type EfectoPalabraActiva = "COLOR" | "POP" | "PILDORA" | "SUBRAYADO" | "OPACIDAD" | "APARECER" | "FONDO";
export type TratamientoGancho = "SIN_CAJA" | "CAJA" | "ROTULO" | "BLOQUES" | "LINEA";
export type AlineacionTexto = "CENTRO" | "IZQUIERDA";
export type TokenTema =
  | "PRIMARIO"
  | "SECUNDARIO"
  | "TEXTO"
  | "FONDO"
  | "BLANCO"
  | "NEGRO"
  | "SOBRE_PRIMARIO"
  | "SOBRE_SECUNDARIO";

/** Todas las fuentes de los estilos (las de los textos del editor son NUNITO, ANTON y BEBAS). */
export type FuenteEstilo =
  | "NUNITO"
  | "ANTON"
  | "BEBAS"
  | "MONTSERRAT_BLACK"
  | "MONTSERRAT_EXTRABOLD"
  | "INTER_TIGHT_SEMIBOLD"
  | "INTER_TIGHT_BOLD"
  | "INSTRUMENT_SERIF"
  | "INSTRUMENT_SERIF_ITALICA"
  | "MANROPE_SEMIBOLD"
  | "MANROPE_BOLD"
  | "GEIST_MEDIUM"
  | "GEIST_SEMIBOLD"
  | "PLUS_JAKARTA_BOLD";

/**
 * Cómo pedir cada fuente en CSS: lo mismo que devuelve `fuentesTexto` (y los
 * @font-face de globals.css). `factorCss`: libass mide la letra por la altura
 * "win" y CSS por el em; sin el factor, la vista previa sale más grande.
 */
export const FUENTES_ESTILO: Record<FuenteEstilo, { familiaCss: string; peso: number; italica: boolean; factorCss: number }> = {
  NUNITO: { familiaCss: "Nunito", peso: 900, italica: false, factorCss: 1000 / 1377 },
  ANTON: { familiaCss: "Anton", peso: 400, italica: false, factorCss: 2048 / 3550 },
  BEBAS: { familiaCss: "Bebas Neue", peso: 400, italica: false, factorCss: 1000 / 1300 },
  MONTSERRAT_BLACK: { familiaCss: "Montserrat", peso: 900, italica: false, factorCss: 1000 / 1562 },
  MONTSERRAT_EXTRABOLD: { familiaCss: "Montserrat", peso: 800, italica: false, factorCss: 1000 / 1562 },
  INTER_TIGHT_SEMIBOLD: { familiaCss: "Inter Tight", peso: 600, italica: false, factorCss: 2048 / 2917 },
  INTER_TIGHT_BOLD: { familiaCss: "Inter Tight", peso: 700, italica: false, factorCss: 2048 / 2917 },
  INSTRUMENT_SERIF: { familiaCss: "Instrument Serif", peso: 400, italica: false, factorCss: 1000 / 1300 },
  INSTRUMENT_SERIF_ITALICA: { familiaCss: "Instrument Serif", peso: 400, italica: true, factorCss: 1000 / 1300 },
  MANROPE_SEMIBOLD: { familiaCss: "Manrope", peso: 600, italica: false, factorCss: 2000 / 2732 },
  MANROPE_BOLD: { familiaCss: "Manrope", peso: 700, italica: false, factorCss: 2000 / 2732 },
  GEIST_MEDIUM: { familiaCss: "Geist", peso: 500, italica: false, factorCss: 1000 / 1350 },
  GEIST_SEMIBOLD: { familiaCss: "Geist", peso: 600, italica: false, factorCss: 1000 / 1350 },
  PLUS_JAKARTA_BOLD: { familiaCss: "Plus Jakarta Sans", peso: 700, italica: false, factorCss: 1000 / 1652 },
};

// ---- Las definiciones, como llegan de `estilosTexto` ----

interface TrazoDef<C> {
  fuente: FuenteEstilo;
  mayusculas: boolean;
  escala: number;
  interletra: number;
  alineacion: AlineacionTexto;
  color: C;
  contorno: number;
  colorContorno: C;
  sombraX: number;
  sombraY: number;
  colorSombra: C;
  opacidadSombra: number;
  desenfoqueSombra: number;
}

export interface GanchoDef<C = TokenTema> extends TrazoDef<C> {
  tratamiento: TratamientoGancho;
  interlineado: number;
  colorDestacada: C;
  fuenteDestacada: FuenteEstilo | null;
  escalaDestacada: number;
  colorSegundoTono: C | null;
  opacidadSegundoTono: number;
  colorCaja: C | null;
  opacidadCaja: number;
  radioCaja: number;
  rellenoX: number;
  rellenoY: number;
  colorCaja2: C | null;
  colorTexto2: C | null;
  giro: number;
  colorAcento: C | null;
  conMarca: boolean;
  fuenteMarca: FuenteEstilo | null;
}

export interface SubtitulosDef<C = TokenTema> extends TrazoDef<C> {
  efectoActiva: EfectoPalabraActiva;
  colorActiva: C;
  escalaActiva: number;
  opacidadInactiva: number;
  colorFondoActiva: C | null;
  radioFondoActiva: number;
  colorFranja: C | null;
  opacidadFranja: number;
  animacionMs: number;
}

export interface EstiloTextoDef {
  estilo: EstiloTexto;
  nombre: string;
  descripcion: string;
  categoria: CategoriaEstiloTexto;
  /** Solo KARAOKE: los textos y los subtítulos salen como siempre, con su propio diseño. */
  respetaTextos: boolean;
  gancho: GanchoDef;
  subtitulos: SubtitulosDef;
}

export type GanchoResuelto = GanchoDef<string>;
export type SubtitulosResuelto = SubtitulosDef<string>;

// ---- El tema y los colores concretos (copiado del backend, igual) ----

/** Los colores de la marca, #RRGGBB. La forma de TemaMarca. */
export interface Tema {
  colorPrimario: string;
  colorSecundario: string;
  colorTexto: string;
  colorFondo: string;
}

export const HEX = /^#[0-9a-fA-F]{6}$/;

export const TEMA_POR_DEFECTO: Tema = {
  colorPrimario: "#FFE600",
  colorSecundario: "#FFFFFF",
  colorTexto: "#FFFFFF",
  colorFondo: "#0A0B0E",
};

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** El texto del tema sobre `base`, salvo que no se lea (contraste < 3): entonces el que más contraste haga. */
export function legibleSobre(base: string, tema: Tema): string {
  if (contraste(tema.colorTexto, base) >= 3) return tema.colorTexto;
  return contraste(tema.colorTexto, base) >= contraste(tema.colorFondo, base) ? tema.colorTexto : tema.colorFondo;
}

export function colorDeToken(token: TokenTema, tema: Tema): string {
  switch (token) {
    case "PRIMARIO":
      return tema.colorPrimario;
    case "SECUNDARIO":
      return tema.colorSecundario;
    case "TEXTO":
      return tema.colorTexto;
    case "FONDO":
      return tema.colorFondo;
    case "BLANCO":
      return "#FFFFFF";
    case "NEGRO":
      return "#000000";
    case "SOBRE_PRIMARIO":
      return legibleSobre(tema.colorPrimario, tema);
    case "SOBRE_SECUNDARIO":
      return legibleSobre(tema.colorSecundario, tema);
  }
}

/** El tema con cada color válido; el que no, el del tema por defecto. */
export function temaValido(tema: Partial<Tema> | null | undefined): Tema {
  const color = (v: unknown, def: string) => (typeof v === "string" && HEX.test(v) ? v.toUpperCase() : def);
  return {
    colorPrimario: color(tema?.colorPrimario, TEMA_POR_DEFECTO.colorPrimario),
    colorSecundario: color(tema?.colorSecundario, TEMA_POR_DEFECTO.colorSecundario),
    colorTexto: color(tema?.colorTexto, TEMA_POR_DEFECTO.colorTexto),
    colorFondo: color(tema?.colorFondo, TEMA_POR_DEFECTO.colorFondo),
  };
}

const TOKENS = new Set<string>([
  "PRIMARIO",
  "SECUNDARIO",
  "TEXTO",
  "FONDO",
  "BLANCO",
  "NEGRO",
  "SOBRE_PRIMARIO",
  "SOBRE_SECUNDARIO",
]);

function conColores<T extends object, R>(parte: T, tema: Tema): R {
  const salida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parte)) {
    if (k === "__typename") continue;
    salida[k] = k.startsWith("color") && typeof v === "string" && TOKENS.has(v) ? colorDeToken(v as TokenTema, tema) : v;
  }
  return salida as R;
}

export interface EstiloResuelto {
  def: EstiloTextoDef;
  tema: Tema;
  gancho: GanchoResuelto;
  subtitulos: SubtitulosResuelto;
}

/** Un estilo con los colores de un tema: lo que se dibuja. */
export function resolverEstilo(def: EstiloTextoDef, tema: Partial<Tema> | null | undefined): EstiloResuelto {
  const t = temaValido(tema);
  return {
    def,
    tema: t,
    gancho: conColores<GanchoDef, GanchoResuelto>(def.gancho, t),
    subtitulos: conColores<SubtitulosDef, SubtitulosResuelto>(def.subtitulos, t),
  };
}

// ---- Medir (copiado de ass-estilos.ts, igual) ----

const INDICE = new Map([...CARACTERES].map((c, i) => [c, i]));

const metrica = (fuente: FuenteEstilo) => METRICAS[fuente] ?? METRICAS.NUNITO;

/** Cuánto mide un texto en píxeles del lienzo, como lo mide el render. */
export function anchoTexto(texto: string, fuente: FuenteEstilo, cuerpo: number, interletra = 0): number {
  const m = metrica(fuente);
  const escala = cuerpo / (m.ascWin + m.descWin);
  let unidades = 0;
  let letras = 0;
  for (const c of texto) {
    const i = INDICE.get(c);
    unidades += i === undefined ? m.avanceDefecto : m.avances[i];
    letras++;
  }
  return unidades * escala + interletra * letras;
}

/** Lo vertical de un renglón centrado en `y` (ver el backend). */
export function vertical(fuente: FuenteEstilo, cuerpo: number, y: number, mayusculas: boolean) {
  const m = metrica(fuente);
  const escala = cuerpo / (m.ascWin + m.descWin);
  const base = y - cuerpo / 2 + m.ascWin * escala;
  const em = m.upem * escala;
  return { arriba: base - m.altoMayuscula * escala, abajo: base + (mayusculas ? 0 : em * 0.2), base, em };
}

interface Pieza {
  texto: string;
  ancho: number;
  salto?: boolean;
}

export function partirEnRenglones<T extends Pieza>(piezas: T[], espacio: number, anchoMax: number): T[][] {
  const renglones: T[][] = [];
  let actual: T[] = [];
  let ancho = 0;
  for (const p of piezas) {
    const con = actual.length ? ancho + espacio + p.ancho : p.ancho;
    if (actual.length && (p.salto || con > anchoMax)) {
      renglones.push(actual);
      actual = [p];
      ancho = p.ancho;
    } else {
      actual.push(p);
      ancho = con;
    }
  }
  if (actual.length) renglones.push(actual);
  return renglones;
}

export function partirParejo<T extends Pieza>(piezas: T[], espacio: number, anchoMax: number): T[][] {
  const renglones = partirEnRenglones(piezas, espacio, anchoMax);
  if (renglones.length < 2) return renglones;
  let bajo = Math.max(...piezas.map((p) => p.ancho));
  let alto = anchoMax;
  for (let i = 0; i < 14 && alto - bajo > 1; i++) {
    const medio = (bajo + alto) / 2;
    if (partirEnRenglones(piezas, espacio, medio).length <= renglones.length) alto = medio;
    else bajo = medio;
  }
  return partirEnRenglones(piezas, espacio, alto);
}

const anchoRenglon = (r: Pieza[], espacio: number) =>
  r.reduce((s, p) => s + p.ancho, 0) + espacio * Math.max(0, r.length - 1);

const limpiar = (texto: string) => texto.replace(/[{}\\]/g, "");

// ---- Lo que se dibuja ----

export interface Giro {
  grados: number;
  x: number;
  y: number;
}

/** Un rectángulo (caja, píldora, franja, barra), en píxeles del lienzo. */
export interface Forma {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  radio: number;
  color: string;
  opacidad: number;
  giro?: Giro;
}

/** Un pedazo de texto con una sola letra y un solo color, apoyado en su línea de base. */
export interface Trozo {
  texto: string;
  /** Izquierda y línea de base, en píxeles del lienzo. */
  x: number;
  base: number;
  /** Lo que avanza (ya escalado): para la caja que lo rodea. */
  ancho: number;
  fuente: FuenteEstilo;
  cuerpo: number;
  /** `\fsp`: espacio después de cada letra, en px. */
  interletra: number;
  color: string;
  opacidad: number;
  /** Grosor del contorno en px (`\bord`): 0 = sin contorno. */
  contorno: number;
  colorContorno: string;
  opacidadContorno: number;
  /** Sombra dura, corrida (`\xshad`/`\yshad`): lleva el contorno. */
  sombra: { dx: number; dy: number; color: string; opacidad: number } | null;
  /** `\fscx`/`\fscy`, desde la izquierda y la base. */
  escalaX: number;
  escalaY: number;
  giro?: Giro;
}

/** Una sombra suave: el texto corrido, en el color de la sombra y desenfocado (`\blur`). */
export interface SombraSuave extends Trozo {
  desenfoque: number;
}

export interface Dibujo {
  sombras: SombraSuave[];
  formas: Forma[];
  trozos: Trozo[];
  /** El fundido de entrada y salida de los textos. */
  opacidad: number;
  /** Lo que ocupa, para agarrarlo en el editor. */
  caja: { x: number; y: number; ancho: number; alto: number };
}

/** Lo que mide un trozo hacia arriba y abajo de su base (con su escala vertical). */
function altoDe(fuente: FuenteEstilo, cuerpo: number, escalaY = 1) {
  const m = metrica(fuente);
  const e = (cuerpo / (m.ascWin + m.descWin)) * escalaY;
  return { asc: m.ascWin * e, desc: m.descWin * e };
}

/**
 * La línea de base de un renglón que libass centra en `y` (\an5 / \an4):
 * la caja del renglón va del ascendente más alto al descendente más bajo.
 */
function baseDelRenglon(y: number, partes: { fuente: FuenteEstilo; cuerpo: number; escalaY?: number }[]): number {
  let asc = 0;
  let desc = 0;
  for (const p of partes) {
    const a = altoDe(p.fuente, p.cuerpo, p.escalaY);
    asc = Math.max(asc, a.asc);
    desc = Math.max(desc, a.desc);
  }
  return y - (asc + desc) / 2 + asc;
}

function cajaDe(formas: Forma[], trozos: Trozo[]): Dibujo["caja"] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const f of formas) {
    x0 = Math.min(x0, f.x);
    y0 = Math.min(y0, f.y);
    x1 = Math.max(x1, f.x + f.ancho);
    y1 = Math.max(y1, f.y + f.alto);
  }
  for (const t of trozos) {
    const a = altoDe(t.fuente, t.cuerpo, t.escalaY);
    x0 = Math.min(x0, t.x - t.contorno);
    x1 = Math.max(x1, t.x + t.ancho + t.contorno);
    y0 = Math.min(y0, t.base - a.asc);
    y1 = Math.max(y1, t.base + a.desc);
  }
  if (!Number.isFinite(x0)) return { x: 0, y: 0, ancho: 0, alto: 0 };
  return { x: x0, y: y0, ancho: x1 - x0, alto: y1 - y0 };
}

type Trazo = TrazoDef<string>;

const bordeDe = (t: Trazo, cuerpo: number) => (t.contorno > 0 ? Math.max(1, Math.round(t.contorno * cuerpo)) : 0);
const llevaSombraSuave = (t: Trazo) => t.desenfoqueSombra > 0 && t.opacidadSombra > 0;
const llevaSombraDura = (t: Trazo) => t.desenfoqueSombra === 0 && Boolean(t.sombraX || t.sombraY) && t.opacidadSombra > 0;

// ---- Subtítulos (eventosSubtitulosEstilizados) ----

export interface LineaSubtituloEstilo {
  desde: number;
  hasta: number;
  palabras: { texto: string; desde: number; hasta: number }[];
}

type Estado = "dicha" | "activa" | "futura";

/**
 * Cómo está una palabra en el segundo `ms` desde que empezó a decirse: las
 * etiquetas de `etiquetasPalabra` en el backend, con los `\t` ya resueltos
 * en ese instante (libass los interpola lineal).
 */
function comoVaLaPalabra(s: SubtitulosResuelto, estado: Estado, ms: number) {
  const dur = Math.max(1, s.animacionMs);
  const avance = Math.min(1, Math.max(0, ms / dur));
  const r = { color: estado === "activa" ? s.colorActiva : s.color, op: 1, escalaX: 1, escalaY: 1, sinContorno: false };
  switch (s.efectoActiva) {
    case "POP": {
      if (estado !== "activa") return r;
      const pico = Math.round((s.escalaActiva + 0.08) * 100) / 100;
      const fin = Math.round(s.escalaActiva * 100) / 100;
      const mitad = Math.round(dur / 2);
      const e = ms < mitad ? 1 + (pico - 1) * Math.max(0, ms / mitad) : ms < dur ? pico + (fin - pico) * ((ms - mitad) / (dur - mitad)) : fin;
      return { ...r, escalaX: e, escalaY: e };
    }
    case "OPACIDAD":
      if (estado === "dicha") return r;
      if (estado === "futura") return { ...r, op: s.opacidadInactiva };
      return { ...r, op: s.opacidadInactiva + (1 - s.opacidadInactiva) * avance };
    case "APARECER":
      if (estado === "dicha") return r;
      if (estado === "futura") return { ...r, op: 0 };
      // Aparece subiendo desde la base: el alto crece de 70 a 100.
      return { ...r, op: avance, escalaY: 0.7 + 0.3 * avance };
    default:
      return { ...r, sinContorno: estado === "activa" && (s.efectoActiva === "PILDORA" || s.efectoActiva === "FONDO") };
  }
}

/**
 * La línea de subtítulos que se ve en el segundo `tc` del clip, dibujada con
 * el estilo. Las palabras que faltan decir ocupan su lugar aunque no se vean
 * (APARECER) o se vean tenues (OPACIDAD): el renglón no se reacomoda.
 */
export function dibujarSubtitulos(
  linea: LineaSubtituloEstilo,
  tc: number,
  lienzo: Lienzo,
  diseno: DisenoClip,
  s: SubtitulosResuelto,
  propio?: { tamano: number; centroY: number } | null,
): Dibujo | null {
  if (!linea.palabras.length) return null;
  const medidas = medidasSubtitulo(lienzo, diseno);
  const cuerpo = Math.round((propio ? Math.min(220, Math.max(40, propio.tamano)) : medidas.cuerpo) * s.escala);
  const fsp = s.interletra * cuerpo;
  const margenX = Math.round(lienzo.ancho * 0.07);
  const anchoMax = lienzo.ancho - 2 * margenX;
  const relleno = { x: cuerpo * 0.22, y: cuerpo * 0.16 };
  const pildora = s.efectoActiva === "PILDORA" || s.efectoActiva === "FONDO";
  const extra = pildora ? Math.round(relleno.x * 0.9 * 10) / 10 : 0;
  const espacio = anchoTexto(" ", s.fuente, cuerpo, fsp) + extra;
  const alto = Math.round(cuerpo * 1.08);
  const izquierda = s.alineacion === "IZQUIERDA";
  const aTexto = (t: string) => limpiar(s.mayusculas ? t.toLocaleUpperCase("es") : t);
  const borde = bordeDe(s, cuerpo);

  const piezas = linea.palabras.map((w, i) => {
    const texto = aTexto(w.texto);
    return { texto, ancho: anchoTexto(texto, s.fuente, cuerpo, fsp), i };
  });
  const renglones = partirEnRenglones(piezas, espacio, anchoMax);
  const total = renglones.length * alto;
  const arriba = propio
    ? Math.min(0.95, Math.max(0.05, propio.centroY)) * lienzo.alto - total / 2
    : lienzo.alto - medidas.margenAbajo - total;
  const lugar = renglones.map((r, k) => {
    const ancho = anchoRenglon(r, espacio);
    const x0 = izquierda ? margenX : (lienzo.ancho - ancho) / 2;
    const y = arriba + alto * (k + 0.5);
    let x = x0;
    const xs = r.map((p) => {
      const esta = x;
      x += p.ancho + espacio;
      return esta;
    });
    return { r, ancho, x0, y, xs, v: vertical(s.fuente, cuerpo, y, s.mayusculas) };
  });

  // La palabra que se dice: el evento de la palabra i va desde que empieza
  // (la primera, desde que empieza la línea) hasta que empieza la siguiente.
  let i = 0;
  linea.palabras.forEach((p, j) => {
    if (j > 0 && p.desde <= tc) i = j;
  });
  const desdeActiva = i === 0 ? linea.desde : linea.palabras[i].desde;
  const ms = (tc - desdeActiva) * 1000;
  const estado = (j: number): Estado => (j < i ? "dicha" : j === i ? "activa" : "futura");

  const formas: Forma[] = [];
  if (s.colorFranja && s.opacidadFranja > 0) {
    for (const l of lugar) {
      formas.push({
        x: l.x0 - relleno.x * 1.4,
        y: l.v.arriba - relleno.y * 1.4,
        ancho: l.ancho + relleno.x * 2.8,
        alto: l.v.abajo - l.v.arriba + relleno.y * 2.8,
        radio: cuerpo * 0.14,
        color: s.colorFranja,
        opacidad: s.opacidadFranja,
      });
    }
  }
  if (s.colorFondoActiva) {
    const l = lugar.find((x) => x.r.some((w) => w.i === i));
    if (l) {
      const k = l.r.findIndex((w) => w.i === i);
      const x = l.xs[k];
      const w = l.r[k].ancho;
      formas.push(
        s.efectoActiva === "SUBRAYADO"
          ? { x, y: l.v.base + l.v.em * 0.12, ancho: w, alto: Math.max(4, l.v.em * 0.07), radio: 0, color: s.colorFondoActiva, opacidad: 1 }
          : {
              x: x - relleno.x,
              y: l.v.arriba - relleno.y,
              ancho: w + relleno.x * 2,
              alto: l.v.abajo - l.v.arriba + relleno.y * 2,
              radio: s.radioFondoActiva * cuerpo,
              color: s.colorFondoActiva,
              opacidad: 1,
            },
      );
    }
  }

  const trozos: Trozo[] = [];
  const sombras: SombraSuave[] = [];
  const dura = llevaSombraDura(s);
  const suave = llevaSombraSuave(s);
  for (const l of lugar) {
    // Lo que dibuja libass: el renglón centrado con su ancho real, que con el
    // pop de la palabra activa crece (el espacio que la sigue crece con ella).
    const comos = l.r.map((w) => comoVaLaPalabra(s, estado(w.i), ms));
    const anchoReal = l.r.reduce((suma, w, k) => suma + (w.ancho + (k < l.r.length - 1 ? espacio : 0)) * comos[k].escalaX, 0);
    const base = baseDelRenglon(
      l.y,
      comos.map((c) => ({ fuente: s.fuente, cuerpo, escalaY: c.escalaY })),
    );
    let x = izquierda ? l.x0 : lienzo.ancho / 2 - anchoReal / 2;
    l.r.forEach((w, k) => {
      const c = comos[k];
      const trozo: Trozo = {
        texto: w.texto,
        x,
        base,
        ancho: w.ancho * c.escalaX,
        fuente: s.fuente,
        cuerpo,
        interletra: fsp,
        color: c.color,
        opacidad: c.op,
        contorno: borde,
        colorContorno: s.colorContorno,
        opacidadContorno: c.sinContorno ? 0 : c.op,
        sombra: dura
          ? { dx: Math.round(s.sombraX * cuerpo), dy: Math.round(s.sombraY * cuerpo), color: s.colorSombra, opacidad: c.op * s.opacidadSombra }
          : null,
        escalaX: c.escalaX,
        escalaY: c.escalaY,
      };
      trozos.push(trozo);
      if (suave) {
        sombras.push({
          ...trozo,
          x: trozo.x + s.sombraX * cuerpo,
          base: trozo.base + s.sombraY * cuerpo,
          color: s.colorSombra,
          opacidad: c.op * s.opacidadSombra,
          contorno: 0,
          opacidadContorno: 0,
          sombra: null,
          desenfoque: s.desenfoqueSombra * cuerpo,
        });
      }
      x += (w.ancho + espacio) * c.escalaX;
    });
  }
  return { sombras, formas, trozos, opacidad: 1, caja: cajaDe(formas, trozos) };
}

// ---- Gancho y textos (eventosTextoEstilizado) ----

interface PiezaTexto extends Pieza {
  fuente: FuenteEstilo;
  cuerpo: number;
  destacada: boolean;
  i: number;
}

/** El fundido de los textos (`\fad(120,120)`). */
function fundido(tc: number | undefined, desde: number, hasta: number): number {
  if (tc === undefined) return 1;
  return Math.max(0, Math.min(1, (tc - desde) / 0.12, (hasta - tc) / 0.12));
}

/**
 * Un texto del clip (el gancho, un titular, la llamada a la acción) dibujado
 * con el estilo: su contenido, destacadas, lugar, ancho, tamaño y tiempo; la
 * fuente, los colores y la caja, del estilo. `tc` es el segundo del clip
 * (para el fundido); sin él, se ve entero.
 */
export function dibujarTexto(
  t: Texto,
  g: GanchoResuelto,
  lienzo: Lienzo,
  opciones: { duracionSeg: number; nombreMarca?: string; tc?: number },
): Dibujo | null {
  const palabras = palabrasDelTexto({ contenido: t.contenido, destacadas: t.destacadas, mayusculas: g.mayusculas });
  if (!palabras.length) return null;
  const desde = Math.max(0, t.desdeSeg || 0);
  const hasta = t.hastaSeg && t.hastaSeg > desde ? t.hastaSeg : opciones.duracionSeg || desde + 3600;
  const cuerpo = Math.round(Math.min(400, Math.max(20, t.tamano * g.escala)));
  const fsp = g.interletra * cuerpo;
  const caja = g.tratamiento === "CAJA" || g.tratamiento === "ROTULO" || g.tratamiento === "BLOQUES";
  const relleno = { x: g.rellenoX * cuerpo, y: g.rellenoY * cuerpo };
  const rotulo = g.tratamiento === "ROTULO";
  const barra = rotulo ? Math.max(6, Math.round(cuerpo * 0.1)) : 0;
  const izquierda = g.alineacion === "IZQUIERDA";

  const piezas: PiezaTexto[] = palabras.map((w, i) => {
    const otra = w.destacada && g.fuenteDestacada ? g.fuenteDestacada : null;
    const fuente = otra ?? g.fuente;
    const tam = otra ? Math.round(cuerpo * g.escalaDestacada) : cuerpo;
    const texto = limpiar(w.texto);
    return { texto, ancho: anchoTexto(texto, fuente, tam, fsp), salto: w.salto, fuente, cuerpo: tam, destacada: w.destacada, i };
  });
  const espacio = anchoTexto(" ", g.fuente, cuerpo, fsp);
  const anchoMax = Math.max(cuerpo, lienzo.ancho * Math.min(1, Math.max(0.2, t.ancho)) - (caja ? 2 * relleno.x : 0) - barra);

  let renglones = partirParejo(piezas, espacio, anchoMax);
  const bloques = g.tratamiento === "BLOQUES";
  let corte = Number.POSITIVE_INFINITY;
  if (bloques || g.colorSegundoTono) {
    if (renglones.length >= 2) {
      corte = renglones[Math.ceil(renglones.length / 2)][0].i;
    } else if (piezas.length >= 2) {
      corte = Math.ceil(piezas.length / 2);
      if (bloques) {
        renglones = [
          ...partirParejo(piezas.slice(0, corte), espacio, anchoMax),
          ...partirParejo(piezas.slice(corte), espacio, anchoMax),
        ];
      }
    }
  }
  const segunda = (p: PiezaTexto) => p.i >= corte;

  const alto = cuerpo * g.interlineado;
  const marca = rotulo && opciones.nombreMarca?.trim() ? limpiar(opciones.nombreMarca.trim().toLocaleUpperCase("es")) : "";
  const fuenteMarca = g.fuenteMarca ?? g.fuente;
  const cuerpoMarca = Math.round(cuerpo * 0.42);
  const altoMarca = marca ? cuerpoMarca * 1.5 : 0;
  const separacion = bloques && corte < Number.POSITIVE_INFINITY ? relleno.y * 1.2 : 0;
  const altoTotal = altoMarca + renglones.length * alto + separacion;
  const anchos = renglones.map((r) => anchoRenglon(r, espacio));
  const anchoBloque = Math.max(...anchos, marca ? anchoTexto(marca, fuenteMarca, cuerpoMarca, cuerpoMarca * 0.08) : 0);

  const bordeCuadro = lienzo.ancho * 0.03;
  const media = anchoBloque / 2 + (caja ? relleno.x : 0) + barra;
  const cx = Math.min(
    lienzo.ancho - bordeCuadro - media,
    Math.max(bordeCuadro + media, Math.min(1, Math.max(0, t.centroX)) * lienzo.ancho),
  );
  const cy = Math.min(1, Math.max(0, t.centroY)) * lienzo.alto;
  const izq = cx - anchoBloque / 2 + barra / 2;
  const arriba = cy - altoTotal / 2;

  const lugar = renglones.map((r, k) => {
    const y = arriba + altoMarca + alto * (k + 0.5) + (separacion && r[0].i >= corte ? separacion : 0);
    const x0 = izquierda ? izq : cx - anchos[k] / 2;
    return { r, y, x0, ancho: anchos[k], v: vertical(g.fuente, cuerpo, y, g.mayusculas) };
  });

  const formas: Forma[] = [];
  const enCaja = (l: (typeof lugar)[number][]) => ({
    x: Math.min(...l.map((x) => x.x0)) - relleno.x,
    y: l[0].v.arriba - relleno.y,
    ancho: Math.max(...l.map((x) => x.x0 + x.ancho)) - Math.min(...l.map((x) => x.x0)) + relleno.x * 2,
    alto: l[l.length - 1].v.abajo - l[0].v.arriba + relleno.y * 2,
  });
  const giros = new Map<number, Giro>();

  switch (g.tratamiento) {
    case "CAJA":
      for (const l of lugar) {
        formas.push({ ...enCaja([l]), radio: g.radioCaja * cuerpo, color: g.colorCaja ?? "#000000", opacidad: g.opacidadCaja });
      }
      break;
    case "ROTULO": {
      const c = enCaja(lugar);
      const y0 = marca ? arriba - relleno.y * 0.8 : c.y;
      const alto0 = c.y + c.alto - y0;
      formas.push({ x: c.x - barra, y: y0, ancho: c.ancho + barra, alto: alto0, radio: g.radioCaja * cuerpo, color: g.colorCaja ?? "#000000", opacidad: g.opacidadCaja });
      formas.push({ x: c.x - barra, y: y0, ancho: barra, alto: alto0, radio: 0, color: g.colorAcento ?? "#FFFFFF", opacidad: 1 });
      break;
    }
    case "BLOQUES": {
      const grupos = [lugar.filter((l) => !segunda(l.r[0])), lugar.filter((l) => segunda(l.r[0]))].filter((x) => x.length);
      grupos.forEach((grupo, n) => {
        const c = enCaja(grupo);
        const giro = { grados: n === 0 ? g.giro : -g.giro * 0.8, x: c.x + c.ancho / 2, y: c.y + c.alto / 2 };
        grupo.forEach((l) => giros.set(lugar.indexOf(l), giro));
        formas.push({ ...c, radio: g.radioCaja * cuerpo, color: (n === 0 ? g.colorCaja : g.colorCaja2) ?? "#FFFFFF", opacidad: g.opacidadCaja, giro });
      });
      break;
    }
    case "LINEA": {
      const grueso = Math.max(4, Math.round(cuerpo * 0.06));
      const largo = Math.min(anchoBloque, cuerpo * 1.4);
      const x = izquierda ? izq : cx - largo / 2;
      formas.push({ x, y: lugar[0].v.arriba - cuerpo * 0.38 - grueso, ancho: largo, alto: grueso, radio: grueso / 2, color: g.colorAcento ?? "#FFFFFF", opacidad: 1 });
      break;
    }
    default:
      break;
  }

  const colorDe = (p: PiezaTexto): { color: string; opacidad: number } => {
    if (bloques && segunda(p)) return { color: p.destacada ? g.colorDestacada : (g.colorTexto2 ?? g.color), opacidad: 1 };
    if (bloques) return { color: p.destacada ? (g.colorTexto2 ?? g.color) : g.color, opacidad: 1 };
    if (p.destacada) return { color: g.colorDestacada, opacidad: 1 };
    if (g.colorSegundoTono && segunda(p)) return { color: g.colorSegundoTono, opacidad: g.opacidadSegundoTono };
    return { color: g.color, opacidad: 1 };
  };
  const borde = bordeDe(g, cuerpo);
  const dura = llevaSombraDura(g);
  const suave = llevaSombraSuave(g) && !caja;

  const trozos: Trozo[] = [];
  const sombras: SombraSuave[] = [];
  if (marca) {
    const y = arriba + altoMarca / 2;
    trozos.push({
      texto: marca,
      x: izq,
      base: baseDelRenglon(y, [{ fuente: fuenteMarca, cuerpo: cuerpoMarca }]),
      ancho: anchoTexto(marca, fuenteMarca, cuerpoMarca, cuerpoMarca * 0.08),
      fuente: fuenteMarca,
      cuerpo: cuerpoMarca,
      interletra: cuerpoMarca * 0.08,
      color: g.colorAcento ?? g.color,
      opacidad: 1,
      contorno: 0,
      colorContorno: g.colorContorno,
      opacidadContorno: 0,
      sombra: null,
      escalaX: 1,
      escalaY: 1,
    });
  }
  lugar.forEach((l, k) => {
    const giro = giros.get(k);
    // Lo que dibuja libass: cada espacio con la letra de la palabra anterior,
    // y el renglón centrado (o apoyado a la izquierda) con su ancho real.
    const espacios = l.r.map((p, j) => (j < l.r.length - 1 ? anchoTexto(" ", p.fuente, p.cuerpo, fsp) : 0));
    const anchoReal = l.r.reduce((s, p, j) => s + p.ancho + espacios[j], 0);
    const base = baseDelRenglon(l.y, l.r);
    let x = izquierda ? l.x0 : cx - anchoReal / 2;
    l.r.forEach((p, j) => {
      const { color, opacidad } = colorDe(p);
      const trozo: Trozo = {
        texto: p.texto,
        x,
        base,
        ancho: p.ancho,
        fuente: p.fuente,
        cuerpo: p.cuerpo,
        interletra: fsp,
        color,
        opacidad,
        contorno: borde,
        colorContorno: g.colorContorno,
        opacidadContorno: 1,
        sombra: dura
          ? { dx: Math.round(g.sombraX * cuerpo), dy: Math.round(g.sombraY * cuerpo), color: g.colorSombra, opacidad: g.opacidadSombra }
          : null,
        escalaX: 1,
        escalaY: 1,
        giro,
      };
      trozos.push(trozo);
      if (suave) {
        sombras.push({
          ...trozo,
          x: trozo.x + g.sombraX * cuerpo,
          base: trozo.base + g.sombraY * cuerpo,
          color: g.colorSombra,
          opacidad: g.opacidadSombra * opacidad,
          contorno: 0,
          opacidadContorno: 0,
          sombra: null,
          desenfoque: g.desenfoqueSombra * cuerpo,
        });
      }
      x += p.ancho + espacios[j];
    });
  });

  return { sombras, formas, trozos, opacidad: fundido(opciones.tc, desde, hasta), caja: cajaDe(formas, trozos) };
}

/** La llamada a la acción con el estilo: su letra, en una caja del primario (ganchoDeLlamada). */
export function ganchoDeLlamada(g: GanchoResuelto, tema: Tema): GanchoResuelto {
  const sobre = legibleSobre(tema.colorPrimario, tema);
  return {
    ...g,
    tratamiento: "CAJA",
    alineacion: "CENTRO",
    colorCaja: tema.colorPrimario,
    opacidadCaja: 1,
    radioCaja: Math.max(g.radioCaja, 0.16),
    color: sobre,
    colorDestacada: sobre,
    colorSegundoTono: null,
    fuenteDestacada: null,
    contorno: 0,
    sombraX: 0,
    sombraY: 0,
    opacidadSombra: 0,
    conMarca: false,
    giro: 0,
  };
}

/** Tamaño, altura y ancho del gancho sugerido cuando se dibuja como texto (GANCHO_COMO_TEXTO). */
export const GANCHO_COMO_TEXTO = { tamano: 90, centroX: 0.5, centroY: 0.2, ancho: 0.85 };
