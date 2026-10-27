import { grafemas } from "@/lib/emojis";
import { anchoTexto, legibleSobre, partirParejo, vertical, HEX, type FuenteEstilo, type Tema } from "@/lib/estilos-texto";
import type { EstiloPortada } from "@/lib/portada-marca";

/**
 * El diseño de una portada armado en el editor (ng-creator-be#244): un fondo y
 * capas encima, en fracciones del lienzo para que no dependa del tamaño. Lo
 * dibuja el backend (diseno-portada.ts) para lo que se publica; acá está lo
 * mismo para la vista en vivo del editor, con las mismas medidas del texto.
 */

export type TipoFondoPortada = "CUADRO" | "IMAGEN" | "COLOR";
export type TipoCapaPortada = "TEXTO" | "IMAGEN" | "LOGO" | "FORMA";

export interface FondoPortada {
  tipo: TipoFondoPortada;
  url?: string | null;
  color?: string | null;
  mejorar: boolean;
  /** Un velo negro encima, de 0 a 0,7. */
  oscurecer: number;
  /** De 0 a 1. */
  desenfoque: number;
  /**
   * Fondo CUADRO (be#249): acercado y corrido para que la cara salga del mismo
   * tamaño y a la misma altura en todas las portadas (`ventanaDeCara`).
   */
  centrarCara?: boolean | null;
}

export interface CapaPortada {
  id: string;
  tipo: TipoCapaPortada;
  /** El centro, en fracción del ancho y del alto. */
  x: number;
  y: number;
  /** En fracción del ancho. Texto: hasta dónde llega el renglón. */
  ancho: number;
  /** Solo la forma: en fracción del alto. */
  alto?: number | null;
  /** En grados, a favor del reloj. */
  rotacion: number;
  opacidad: number;
  texto?: string | null;
  /** El texto es el título de cada clip: `texto` es solo el de muestra. */
  titulo?: boolean | null;
  estilo?: EstiloPortada | null;
  fuente?: FuenteEstilo | null;
  /** El cuerpo de la letra en fracción del ancho. */
  tamano?: number | null;
  mayusculas?: boolean | null;
  color?: string | null;
  color2?: string | null;
  url?: string | null;
  /** La imagen es el cuadro elegido del clip. */
  cuadro?: boolean | null;
  sinFondo?: boolean | null;
  contorno?: boolean | null;
  mejorar?: boolean | null;
  /** Radio de las puntas, en fracción del lado más corto (0,5 = píldora). */
  radio?: number | null;
}

export interface DisenoPortada {
  fondo: FondoPortada;
  /** De abajo hacia arriba: la última tapa a las demás. */
  capas: CapaPortada[];
}

export const MAXIMO_CAPAS_PORTADA = 15;
export const ANCHO_PORTADA = 1080;
export const ALTO_PORTADA = 1920;
/** El cuerpo del título de la plantilla vieja con tamaño 1, en fracción del ancho. */
export const CUERPO_PLANTILLA = 0.12;

/** Los rangos del backend (diseno-portada.dto.ts). */
export const RANGOS = {
  posicion: [-0.5, 1.5],
  ancho: [0.02, 2],
  alto: [0.005, 2],
  tamano: [0.02, 0.4],
  oscurecer: [0, 0.7],
  radio: [0, 0.5],
} as const;

const RENGLONES_TITULO = 3;
const RENGLONES_TEXTO = 8;
const ACHICAR_PARA_DOS = 0.82;
const MARGEN_VERTICAL = 0.05;

export const entre = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const colorValido = (c: string | null | undefined): string | null => (c && HEX.test(c) ? c : null);

/** Una cara del cuadro en fracciones del cuadro: su caja y la línea de los ojos (be#249). */
export interface CaraDeCuadro {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  ojosY: number;
}

/** Centrar en la cara: el alto de la cara y dónde van los ojos, en fracción del lienzo (como el backend). */
const CARA_CENTRADA = 0.25;
const OJOS_CENTRADOS = 0.32;
/** Hasta cuánto se acerca: más, y un cuadro de video se ve pixelado. */
const ZOOM_MAXIMO = 2.5;

/**
 * La parte del cuadro que queda con `centrarCara`, en fracciones: la misma
 * cuenta que `ventanaDeCara` del backend (diseno-portada.ts), para que la
 * vista en vivo se vea como lo que se publica.
 */
export function ventanaDeCara(cara: CaraDeCuadro): { x: number; y: number; ancho: number; alto: number } {
  const zoom = entre(CARA_CENTRADA / Math.max(0.01, cara.alto), 1, ZOOM_MAXIMO);
  const lado = 1 / zoom;
  const x = entre(cara.x + cara.ancho / 2 - lado / 2, 0, 1 - lado);
  const y = entre(cara.ojosY - OJOS_CENTRADOS * lado, 0, 1 - lado);
  return { x, y, ancho: lado, alto: lado };
}

/**
 * La franja que se ve en la grilla del perfil (be#249), en fracción del alto:
 * TikTok e Instagram muestran el centro 3:4 de la portada. Todo, si el lienzo
 * es más ancho que 3:4.
 */
export function franjaDeGrilla(lienzo: Lienzo): { desde: number; hasta: number } {
  const visible = Math.min(lienzo.alto, (lienzo.ancho * 4) / 3);
  const margen = (lienzo.alto - visible) / 2 / lienzo.alto;
  return { desde: margen, hasta: 1 - margen };
}

/** Un id para una capa nueva: el backend acepta hasta 40 letras. */
export const nuevoIdCapa = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/**
 * Lo que llega de GraphQL listo para mandar como input: sin `__typename` en
 * ningún nivel (Apollo los agrega y el input los rechaza).
 */
export function disenoParaEnviar(d: DisenoPortada): DisenoPortada {
  const sin = <T extends object>(o: T): T => {
    const { __typename: _, ...resto } = o as T & { __typename?: string };
    return resto as T;
  };
  return { fondo: sin(d.fondo), capas: d.capas.map((c) => sin(c)) };
}

/** Para comparar dos diseños (lo guardado y lo editado). */
export const claveDiseno = (d: DisenoPortada | null | undefined) => (d ? JSON.stringify(disenoParaEnviar(d)) : "");

/** El diseño sin nada: el cuadro del clip y el título abajo. */
export const DISENO_INICIAL: DisenoPortada = {
  fondo: { tipo: "CUADRO", mejorar: true, oscurecer: 0, desenfoque: 0 },
  capas: [],
};

// ---- El texto, medido como el backend ----

/** Sin emojis (el render no los dibuja en la portada) ni lo que rompe el ASS, con los renglones del Enter. */
export function textoLimpio(texto: string): string {
  const sinEmojis = grafemas(texto)
    .filter((g) => !g.emoji)
    .map((g) => g.g)
    .join("");
  return sinEmojis
    .replace(/[{}\\]/g, "")
    .split("\n")
    .map((r) => r.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** El texto que dibuja una capa: el título del clip si es la del título. */
export function textoDeCapa(capa: Pick<CapaPortada, "texto" | "titulo" | "mayusculas">, titulo: string): string {
  const crudo = capa.titulo ? titulo || capa.texto || "" : capa.texto || "";
  return textoLimpio(capa.mayusculas !== false ? crudo.toLocaleUpperCase("es") : crudo);
}

interface Pieza {
  texto: string;
  ancho: number;
  salto?: boolean;
}

const anchoRenglon = (r: Pieza[], espacio: number) => r.reduce((s, p) => s + p.ancho, 0) + espacio * Math.max(0, r.length - 1);

function enDos(piezas: Pieza[], espacio: number): Pieza[][] {
  let mejor = 1;
  let menor = Infinity;
  for (let k = 1; k < piezas.length; k++) {
    const ancho = Math.max(anchoRenglon(piezas.slice(0, k), espacio), anchoRenglon(piezas.slice(k), espacio));
    if (ancho < menor) {
      menor = ancho;
      mejor = k;
    }
  }
  return [piezas.slice(0, mejor), piezas.slice(mejor)];
}

/** Los renglones y el cuerpo de un texto (copiado de `renglonesEnAncho` del backend, igual). */
export function renglonesEnAncho(
  texto: string,
  fuente: FuenteEstilo,
  base: number,
  anchoMax: number,
  esTitulo: boolean,
): { renglones: string[]; cuerpo: number } {
  const conEnter = texto.includes("\n");
  const palabras = texto.split("\n").flatMap((r) => r.split(" ").map((p, i) => ({ p, salto: i === 0 })));
  const maximo = esTitulo ? RENGLONES_TITULO : RENGLONES_TEXTO;
  let cuerpo = Math.max(8, Math.round(base));
  let renglones: Pieza[][] = [];
  let espacio = 0;
  for (let i = 0; i < 14; i++) {
    espacio = anchoTexto(" ", fuente, cuerpo);
    const piezas = palabras.map(({ p, salto }, k) => ({ texto: p, ancho: anchoTexto(p, fuente, cuerpo), salto: k > 0 && salto }));
    renglones = partirParejo(piezas, espacio, anchoMax);
    const masAncho = Math.max(...renglones.map((r) => anchoRenglon(r, espacio)));
    const entra = esTitulo
      ? renglones.length <= 2 || (renglones.length <= maximo && cuerpo <= base * ACHICAR_PARA_DOS)
      : renglones.length <= maximo;
    if ((entra && masAncho <= anchoMax) || cuerpo <= 8) break;
    cuerpo = Math.max(8, Math.round(cuerpo * 0.9));
  }
  if (esTitulo && renglones.length === 1 && !conEnter && palabras.length > 1) renglones = enDos(renglones[0], espacio);
  return { renglones: renglones.map((r) => r.map((p) => p.texto).join(" ")), cuerpo };
}

export interface Lienzo {
  ancho: number;
  alto: number;
}

export interface RenglonDibujado {
  texto: string;
  /** El centro del renglón (la caja) y la línea de base de la letra, en px del lienzo. */
  y: number;
  base: number;
  ancho: number;
  color: string;
}

/** Cómo se dibuja una capa de texto, en px del lienzo: lo mismo que `eventosDeTexto` del backend. */
export interface TextoDibujado {
  fuente: FuenteEstilo;
  estilo: EstiloPortada;
  cuerpo: number;
  x: number;
  /** El centro del bloque (ya dentro de los márgenes). */
  centro: number;
  altoLetra: number;
  relleno: number;
  renglones: RenglonDibujado[];
  /** Solo CAJA: el color de las cajas. */
  colorCaja: string;
  /** El grosor del contorno (0 en LIMPIO y CAJA) y de su sombra. */
  contorno: number;
  contornoSombra: number;
  desenfoqueSombra: number;
  opacidadSombra: number;
  opacidad: number;
  /** La caja que ocupa todo el bloque, para elegirlo y moverlo. */
  anchoBloque: number;
  altoBloque: number;
}

export function medirTexto(capa: CapaPortada, titulo: string, tema: Tema, lienzo: Lienzo): TextoDibujado | null {
  const limpio = textoDeCapa(capa, titulo);
  if (!limpio) return null;
  const fuente = (capa.fuente ?? "ANTON") as FuenteEstilo;
  const estilo = capa.estilo ?? "DOS_COLORES";
  const mayusculas = capa.mayusculas !== false;
  const opacidad = entre(capa.opacidad ?? 1, 0, 1);
  const base = lienzo.ancho * entre(capa.tamano ?? CUERPO_PLANTILLA, 0.02, 0.4);
  const anchoMax = lienzo.ancho * entre(capa.ancho, 0.1, 1.5);
  const { renglones, cuerpo } = renglonesEnAncho(limpio, fuente, base, anchoMax, !!capa.titulo);
  const v = vertical(fuente, cuerpo, 0, mayusculas);
  const altoLetra = v.abajo - v.arriba;
  const corrimiento = (v.arriba + v.abajo) / 2;
  const caja = estilo === "CAJA";
  const relleno = caja ? altoLetra * 0.22 : 0;
  const paso = caja ? altoLetra + relleno * 2 + altoLetra * 0.14 : altoLetra * 1.14;
  const altoBloque = (renglones.length - 1) * paso + altoLetra + relleno * 2;
  const margen = lienzo.alto * MARGEN_VERTICAL;
  const centro = entre(lienzo.alto * capa.y, margen + altoBloque / 2, lienzo.alto - margen - altoBloque / 2);
  const x = lienzo.ancho * capa.x;
  const color1 = colorValido(capa.color);
  const color2 = colorValido(capa.color2) ?? tema.colorPrimario;
  const principal = color1 ?? tema.colorTexto;
  const limpia = estilo === "LIMPIO";
  const dibujados = renglones.map((texto, i) => {
    const y = centro - ((renglones.length - 1) * paso) / 2 + i * paso;
    const color = caja
      ? color1 ?? legibleSobre(color2, tema)
      : estilo === "DOS_COLORES" && (i > 0 || renglones.length === 1)
        ? color2
        : principal;
    // libass centra la caja del renglón en y - corrimiento: la base sale de ahí.
    return { texto, y, base: vertical(fuente, cuerpo, y - corrimiento, mayusculas).base, ancho: anchoTexto(texto, fuente, cuerpo), color };
  });
  const contorno = caja || limpia ? 0 : Math.max(2, Math.round(cuerpo * 0.045));
  const masAncho = Math.max(...dibujados.map((r) => r.ancho));
  return {
    fuente,
    estilo,
    cuerpo,
    x,
    centro,
    altoLetra,
    relleno,
    renglones: dibujados,
    colorCaja: color2,
    contorno,
    contornoSombra: caja || limpia ? 0 : Math.max(2, Math.round(cuerpo * 0.05)),
    desenfoqueSombra: cuerpo * (limpia ? 0.16 : 0.08),
    opacidadSombra: (limpia ? 0.9 : 0.55) * opacidad,
    opacidad,
    anchoBloque: masAncho + (caja ? altoLetra * 0.8 : contorno * 2),
    altoBloque: altoBloque + contorno * 2,
  };
}

/** El lienzo: el del cuadro si el fondo es el cuadro y se sabe su forma; si no, 9:16. */
export function lienzoDe(diseno: DisenoPortada, aspectoCuadro: number | null | undefined): Lienzo {
  if (diseno.fondo.tipo === "CUADRO" && aspectoCuadro && aspectoCuadro > 0) {
    return { ancho: ANCHO_PORTADA, alto: Math.round((ANCHO_PORTADA * aspectoCuadro) / 2) * 2 };
  }
  return { ancho: ANCHO_PORTADA, alto: ALTO_PORTADA };
}

/** Las capas nuevas, con lo de siempre. */
export function capaNueva(
  tipo: TipoCapaPortada,
  extra: Partial<CapaPortada> = {},
): CapaPortada {
  const base: CapaPortada = { id: nuevoIdCapa(), tipo, x: 0.5, y: 0.5, ancho: 0.5, rotacion: 0, opacidad: 1 };
  switch (tipo) {
    case "TEXTO":
      return { ...base, ancho: 0.86, estilo: "DOS_COLORES", fuente: "ANTON", tamano: 0.1, mayusculas: true, ...extra };
    case "FORMA":
      return { ...base, ancho: 0.6, alto: 0.08, radio: 0.2, ...extra };
    case "LOGO":
      return { ...base, x: 0.82, y: 0.92, ancho: 0.2, ...extra };
    default:
      return { ...base, ancho: 0.6, ...extra };
  }
}

/** Si el diseño usa el título de cada clip. */
export const usaTitulo = (d: DisenoPortada) => d.capas.some((c) => c.tipo === "TEXTO" && c.titulo);
