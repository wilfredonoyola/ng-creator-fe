/**
 * Modelo del montaje: recortar un fragmento de un video ajeno y componerlo
 * dentro de un lienzo nuevo, con espacio propio arriba y abajo para titulares.
 *
 * ESTE ARCHIVO ES EL CONTRATO CON EL BACKEND. Todo lo que dibuja el preview
 * sale de acá, y el backend aplica exactamente las mismas reglas sobre los
 * mismos datos. Si el preview y el render se desincronizan, es porque alguien
 * puso lógica de layout en un componente en vez de acá.
 *
 * REGLA DE UNIDADES:
 * - Lo que depende del video original va en FRACCIONES (0..1). El navegador lo
 *   muestra a un tamaño CSS que no tiene nada que ver con el real, así que
 *   guardar píxeles de pantalla daría un resultado distinto en cada monitor.
 * - Lo que depende del lienzo va en PÍXELES DEL LIENZO, porque el lienzo sí es
 *   explícito y lo conocen los dos lados: el preview dibuja a 324 de ancho y
 *   multiplica por 1080/324.
 */

export type TipoFondo = "SOLIDO" | "DESENFOQUE";

export interface Recorte {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface Lienzo {
  ancho: number;
  alto: number;
  fps: number;
}

export interface UbicacionVideo {
  /** 1 = el recorte ocupa todo el ancho del lienzo. */
  escala: number;
  centroX: number;
  centroY: number;
}

export interface Fondo {
  tipo: TipoFondo;
  color: string;
  desenfoque: number;
}

export interface Texto {
  contenido: string;
  destacadas: string[];
  tamano: number;
  peso: number;
  color: string;
  colorDestacado: string;
  colorContorno: string;
  grosorContorno: number;
  interlineado: number;
  centroY: number;
}

export interface Montaje {
  trim: { desdeSeg: number; hastaSeg: number };
  recorte: Recorte;
  lienzo: Lienzo;
  video: UbicacionVideo;
  fondo: Fondo;
  textoSuperior: Texto;
  textoInferior: Texto;
}

/** Formatos de salida. El alto sale del ancho para no arrastrar dos números. */
export const FORMATOS = [
  { id: "9:16", etiqueta: "9:16", ancho: 1080, alto: 1920 },
  { id: "4:5", etiqueta: "4:5", ancho: 1080, alto: 1350 },
  { id: "1:1", etiqueta: "1:1", ancho: 1080, alto: 1080 },
  { id: "16:9", etiqueta: "16:9", ancho: 1920, alto: 1080 },
] as const;

/** Proporciones a las que se puede atar el rectángulo de recorte. */
export const PROPORCIONES = [
  { id: "libre", etiqueta: "Libre", valor: null },
  { id: "1:1", etiqueta: "1:1", valor: 1 },
  { id: "4:5", etiqueta: "4:5", valor: 4 / 5 },
  { id: "9:16", etiqueta: "9:16", valor: 9 / 16 },
  { id: "16:9", etiqueta: "16:9", valor: 16 / 9 },
] as const;

export function textoVacio(centroY: number): Texto {
  return {
    contenido: "",
    destacadas: [],
    tamano: 62,
    peso: 900,
    color: "#FFFFFF",
    colorDestacado: "#FF3B30",
    colorContorno: "#000000",
    grosorContorno: 6,
    interlineado: 1.15,
    centroY,
  };
}

/**
 * Punto de partida: el recorte arranca cubriendo el video entero.
 *
 * Es lo correcto aunque casi siempre se ajuste: mostrarlo completo deja ver qué
 * hay que sacar. Un recorte inicial más chico esconde justo lo que se viene a
 * decidir.
 */
export function montajeInicial(): Montaje {
  return {
    trim: { desdeSeg: 0, hastaSeg: 0 },
    recorte: { x: 0, y: 0, ancho: 1, alto: 1 },
    lienzo: { ancho: 1080, alto: 1920, fps: 30 },
    video: { escala: 1, centroX: 0.5, centroY: 0.5 },
    fondo: { tipo: "SOLIDO", color: "#111111", desenfoque: 40 },
    textoSuperior: textoVacio(0.12),
    textoInferior: textoVacio(0.88),
  };
}

// ---- Layout ----

/** Dónde y de qué tamaño queda el recorte dentro del lienzo, en px del lienzo. */
export function ubicacionEnLienzo(m: Montaje, aspectoFuente: number) {
  // El recorte hereda su proporción del video original: una fracción de ancho
  // sobre un video 9:16 no mide lo mismo que sobre uno 16:9.
  const proporcionRecorte =
    (m.recorte.ancho * aspectoFuente) / Math.max(m.recorte.alto, 0.0001);

  const ancho = m.lienzo.ancho * Math.max(m.video.escala, 0.05);
  const alto = ancho / Math.max(proporcionRecorte, 0.0001);

  return {
    ancho,
    alto,
    x: m.lienzo.ancho * m.video.centroX - ancho / 2,
    y: m.lienzo.alto * m.video.centroY - alto / 2,
  };
}

// ---- Texto ----

/**
 * Avance medio de un glifo en mayúsculas y peso alto, como fracción del cuerpo.
 *
 * TIENE que ser idéntico al `ANCHO_GLIFO` de `montaje-texto.ts` en el backend:
 * es lo que decide dónde corta la línea, y si difieren el preview muestra dos
 * líneas donde el video va a tener tres.
 */
export const ANCHO_GLIFO = 0.55;
export const FRACCION_ANCHO_UTIL = 0.9;

/** Misma regla de corte que el backend. Ver la advertencia de arriba. */
export function cortarEnLineas(
  texto: string,
  tamano: number,
  anchoLienzo: number,
): string[] {
  const maxCaracteres = Math.max(
    1,
    Math.floor((anchoLienzo * FRACCION_ANCHO_UTIL) / (tamano * ANCHO_GLIFO)),
  );

  const lineas: string[] = [];
  let actual = "";

  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const tentativa = actual ? `${actual} ${palabra}` : palabra;
    if (tentativa.length <= maxCaracteres) {
      actual = tentativa;
    } else {
      if (actual) lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);

  return lineas;
}

/** Compara palabras sin acentos, sin puntuación y sin mayúsculas. */
export function normalizarPalabra(palabra: string): string {
  return palabra
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Las líneas de un bloque, ya con su posición y sus palabras marcadas.
 *
 * El preview dibuja esto como SVG con los mismos atributos que usa el backend
 * (`paint-order`, `stroke-linejoin`), no como texto HTML con
 * `-webkit-text-stroke`: ese centra el trazo sobre el contorno de la letra en
 * vez de dibujarlo detrás, y con 6-8px de grosor el texto se ve distinto.
 */
export function lineasDeTexto(texto: Texto, lienzo: Lienzo) {
  if (!texto.contenido.trim()) return [];

  const lineas = cortarEnLineas(
    texto.contenido.toUpperCase(),
    texto.tamano,
    lienzo.ancho,
  );
  const altoLinea = texto.tamano * texto.interlineado;
  const yPrimera =
    lienzo.alto * texto.centroY -
    (lineas.length * altoLinea) / 2 +
    texto.tamano * 0.85;

  const destacadas = new Set(
    texto.destacadas.map(normalizarPalabra).filter(Boolean),
  );

  return lineas.map((linea, i) => ({
    y: yPrimera + i * altoLinea,
    palabras: linea.split(" ").map((palabra) => ({
      texto: palabra,
      destacada: destacadas.has(normalizarPalabra(palabra)),
    })),
  }));
}

/** Las palabras del texto, para poder marcarlas tocándolas. */
export function palabrasDe(texto: string): string[] {
  const vistas = new Set<string>();
  return texto
    .split(/\s+/)
    .filter(Boolean)
    .filter((p) => {
      const clave = normalizarPalabra(p);
      if (!clave || vistas.has(clave)) return false;
      vistas.add(clave);
      return true;
    });
}
