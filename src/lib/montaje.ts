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

export type TipoMomento = "APARICION" | "PAUSA";
export type PosicionCamara = "ABAJO_DERECHA" | "ABAJO_CENTRO" | "BANDA_ABAJO";

/**
 * Un momento en el que aparece la cámara propia.
 *
 * `desdeSeg` es siempre un segundo del video BASE, no del resultado final. Si
 * fuera del final, cada pausa correría todos los momentos siguientes y cambiar
 * la duración de una obligaría a recalcular las demás a mano.
 */
export interface Momento {
  id: string;
  tipo: TipoMomento;
  desdeSeg: number;
  duracionSeg: number;
  /**
   * La grabación propia de este momento, si la tiene.
   *
   * Sin esto todos se reparten una sola toma en orden, y eso obliga a grabar de
   * corrido y a ciegas: alargar un momento corre el tramo de todos los que
   * siguen, que empiezan a la mitad de una palabra sin que nadie los tocara.
   */
  origenStoragePath?: string;
}

export interface Camara {
  /** La toma compartida: la que usan los momentos que no traen la suya. */
  origenStoragePath?: string;
  posicion: PosicionCamara;
  tamano: number;
  factorEnPausa: number;
  atenuacionDb: number;
}

export interface Montaje {
  trim: { desdeSeg: number; hastaSeg: number };
  recorte: Recorte;
  lienzo: Lienzo;
  video: UbicacionVideo;
  fondo: Fondo;
  textoSuperior: Texto;
  textoInferior: Texto;
  camara: Camara | null;
  momentos: Momento[];
  /** Subtítulos palabra por palabra, transcritos y quemados en el render. */
  subtitulos: { activos: boolean; video: boolean; camara: boolean };
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
    camara: null,
    momentos: [],
    // Los dos por defecto: quien mira no distingue de dónde sale cada voz, y
    // subtitular solo una mitad se nota como un error.
    subtitulos: { activos: false, video: true, camara: true },
  };
}

/**
 * Encaja el video para que llene justo lo que la banda deja libre.
 *
 * Sin esto quedaba una franja negra entre el video y la banda: el preset subía
 * el video pero no lo dimensionaba contra el alto elegido, así que el resultado
 * dependía de la proporción del recorte y casi nunca cerraba.
 *
 * Escala para CUBRIR y no para entrar: preferimos perder los costados antes que
 * dejar aire. Es la misma decisión que toma el render con la cámara.
 */
export function encajarVideoSobreBanda(
  m: Montaje,
  aspectoFuente: number,
): UbicacionVideo {
  const alturaBanda = m.camara?.posicion === "BANDA_ABAJO" ? m.camara.tamano : 0;
  const libre = Math.max(0.1, 1 - alturaBanda);

  const proporcionRecorte =
    (m.recorte.ancho * aspectoFuente) / Math.max(m.recorte.alto, 0.0001);

  // Cuánto hay que escalar para que el alto del video cubra la zona libre.
  const necesaria =
    (m.lienzo.alto * libre * proporcionRecorte) / m.lienzo.ancho;

  return {
    escala: Math.max(1, necesaria),
    centroX: 0.5,
    // Centrado en la zona libre, no en el lienzo.
    centroY: libre / 2,
  };
}

/**
 * Formatos completos: una decisión en lugar de seis.
 *
 * Antes había que acomodar a mano el lienzo, el fondo, dónde va el video, la
 * forma de la cámara y los momentos —cinco controles repartidos en dos columnas
 * de la pantalla— para llegar a algo que en realidad es UN formato conocido.
 * Elegirlo de una es la diferencia entre un editor y un tablero de perillas.
 *
 * `momentos` recibe la duración del tramo porque un formato que te acompaña todo
 * el video necesita saber cuánto dura.
 */
export const FORMATOS_LISTOS: {
  id: string;
  nombre: string;
  detalle: string;
  /** Qué cambia del montaje. Lo que no está acá se deja como estaba. */
  ajustes: (m: Montaje, aspectoFuente: number) => Partial<Montaje>;
  momentos: (duracion: number) => Omit<Momento, "id">[];
}[] = [
  {
    id: "reaccion",
    nombre: "Reacción",
    detalle:
      "El video arriba y vos abajo, los dos todo el tiempo. Es el formato de comentar una jugada mientras pasa.",
    ajustes: (m, aspecto) => {
      const camara: Camara = {
        ...(m.camara ?? { factorEnPausa: 1.6, atenuacionDb: -12 }),
        posicion: "BANDA_ABAJO",
        tamano: 0.45,
      };
      return {
        camara,
        fondo: { ...m.fondo, tipo: "SOLIDO" },
        // El video llena exactamente lo que la banda deja libre: si quedara
        // centrado o a escala 1, entre los dos aparece una franja negra.
        video: encajarVideoSobreBanda({ ...m, camara }, aspecto),
      };
    },
    momentos: (d) => [{ tipo: "APARICION", desdeSeg: 0, duracionSeg: d }],
  },
  {
    id: "comentario",
    nombre: "Comentario",
    detalle:
      "El video llena la pantalla y vos aparecés en un círculo. Para acotar algo sin taparlo.",
    ajustes: (m) => ({
      video: { ...m.video, escala: 1, centroX: 0.5, centroY: 0.5 },
      camara: {
        ...(m.camara ?? { factorEnPausa: 1.6, atenuacionDb: -12 }),
        posicion: "ABAJO_DERECHA",
        tamano: 0.32,
      },
    }),
    momentos: (d) => [
      { tipo: "APARICION", desdeSeg: 0, duracionSeg: Math.min(5, d) },
    ],
  },
  {
    id: "simple",
    nombre: "Solo el video",
    detalle: "Sin cámara. Solo reencuadrar y publicar.",
    ajustes: (m) => ({
      video: { ...m.video, escala: 1, centroX: 0.5, centroY: 0.5 },
      camara: null,
    }),
    momentos: () => [],
  },
];

/** Lo que Meta admite en un Reel. Con pausas es fácil pasarse sin notarlo. */
export const LIMITE_REEL_SEG = 90;

/**
 * Cuánto va a durar el resultado.
 *
 * Solo las pausas suman: la aparición va encima del video que sigue corriendo.
 * Es la distinción que hace falta ver antes de generar, porque descubrir que te
 * pasaste después de esperar el render son minutos tirados.
 */
export function duracionFinal(base: number, momentos: Momento[]): number {
  const pausas = momentos
    .filter((m) => m.tipo === "PAUSA")
    .reduce((n, m) => n + m.duracionSeg, 0);
  return base + pausas;
}

/**
 * Cuánta toma COMPARTIDA consumen los momentos.
 *
 * Solo cuenta los que no traen grabación propia: esos se reparten una toma
 * corrida y entre todos no pueden pedir más de lo que dura. El que trae su
 * archivo se mide contra el suyo, y ese chequeo lo hace el backend porque acá
 * no sabemos cuánto dura cada uno.
 */
export function grabacionNecesaria(momentos: Momento[]): number {
  return momentos
    .filter((m) => !m.origenStoragePath)
    .reduce((n, m) => n + m.duracionSeg, 0);
}

/**
 * Dónde y de qué tamaño va la cámara, en píxeles del lienzo.
 *
 * Espeja `ubicar()` y el cálculo de diámetro de `montaje-camara.ts` en el
 * backend. Vive acá y no en el preview por la misma razón que el resto: que el
 * dibujo coincida con la salida no puede depender de que un componente "imite"
 * bien, porque el día que el backend cambie el margen nadie va a acordarse de
 * tocar las dos partes.
 *
 * En PAUSA no hay círculo: la cámara toma el lienzo entero. Una aparición es
 * reaccionar sin interrumpir; una pausa es frenar para explicar, y ahí la
 * imagen quieta es lo menos interesante del momento.
 */
export function geometriaCamara(
  camara: Camara,
  lienzo: Lienzo,
  enPausa: boolean,
): { x: number; y: number; ancho: number; alto: number; redonda: boolean } {
  if (enPausa) {
    return {
      x: 0,
      y: 0,
      ancho: lienzo.ancho,
      alto: lienzo.alto,
      redonda: false,
    };
  }

  // La banda no es un círculo más grande: es el formato de reacción, con el
  // video de tercero arriba y quien comenta abajo, los dos visibles todo el
  // tiempo. Sin margen, a todo el ancho, y `tamano` se lee como fracción del
  // ALTO, que es lo que se ajusta cuando definís cuánta pantalla te llevás.
  if (camara.posicion === "BANDA_ABAJO") {
    const alto = par(lienzo.alto * limitar(camara.tamano, 0.15, 0.85));
    return { x: 0, y: lienzo.alto - alto, ancho: lienzo.ancho, alto, redonda: false };
  }

  const diametro = par(lienzo.ancho * limitar(camara.tamano, 0.1, 0.9));
  const margen = Math.round(lienzo.ancho * 0.04);
  const y = Math.max(0, lienzo.alto - diametro - margen);
  const x =
    camara.posicion === "ABAJO_CENTRO"
      ? Math.round((lienzo.ancho - diametro) / 2)
      : lienzo.ancho - diametro - margen;

  return { x, y, ancho: diametro, alto: diametro, redonda: true };
}

/**
 * Los momentos como los ve el backend: filtrados, acotados, en orden, y con el
 * tramo de grabación que le toca a cada uno.
 *
 * El orden importa y no es el de la lista en pantalla: el backend ordena por
 * `desdeSeg` antes de repartir la grabación, así que un momento agregado último
 * pero ubicado primero consume el PRIMER tramo. Reproducir eso acá es la única
 * forma de que el preview muestre el pedazo de toma que va a salir de verdad.
 */
export function guionDeCamara(
  momentos: Momento[],
  duracionBase: number,
): (Momento & { tramo: { desde: number; hasta: number } })[] {
  const ordenados = [...momentos]
    .filter((m) => m.duracionSeg > 0.1)
    .map((m) => ({
      ...m,
      desdeSeg: Math.max(0, Math.min(m.desdeSeg, duracionBase)),
    }))
    .sort((a, b) => a.desdeSeg - b.desdeSeg);

  // El contador corre solo sobre los que comparten la toma. El que trae archivo
  // propio lo usa desde el principio y no mueve el tramo de nadie: es justo lo
  // que hace que agregar o alargar un momento deje de desacomodar a los demás.
  let consumido = 0;
  return ordenados.map((m) => {
    if (m.origenStoragePath) {
      return { ...m, tramo: { desde: 0, hasta: m.duracionSeg } };
    }
    const tramo = { desde: consumido, hasta: consumido + m.duracionSeg };
    consumido += m.duracionSeg;
    return { ...m, tramo };
  });
}

/** El backend redondea a par porque los codecs lo exigen; acá, para coincidir. */
function par(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

function limitar(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Plantillas: un punto de partida, no una jaula. Todo queda editable. */
export const PLANTILLAS: {
  id: string;
  nombre: string;
  detalle: string;
  minimoSeg: number;
  momentos: (base: number) => Omit<Momento, "id">[];
}[] = [
  {
    id: "inicio",
    nombre: "Reacción al inicio",
    detalle: "Aparecés los primeros 5 segundos",
    minimoSeg: 6,
    momentos: () => [{ tipo: "APARICION", desdeSeg: 0, duracionSeg: 5 }],
  },
  {
    id: "pausa20",
    nombre: "Pausa para comentar",
    detalle: "El video se congela a los 20s y hablás 6",
    minimoSeg: 21,
    momentos: () => [{ tipo: "PAUSA", desdeSeg: 20, duracionSeg: 6 }],
  },
  {
    id: "presente",
    nombre: "Presente todo el video",
    detalle: "Tu círculo desde el principio hasta el final",
    minimoSeg: 3,
    momentos: (base) => [
      { tipo: "APARICION", desdeSeg: 0, duracionSeg: base },
    ],
  },
  {
    id: "dos",
    nombre: "Entrada y comentario",
    detalle: "Aparecés 3s al inicio y pausás a los 20",
    minimoSeg: 21,
    momentos: () => [
      { tipo: "APARICION", desdeSeg: 0, duracionSeg: 3 },
      { tipo: "PAUSA", desdeSeg: 20, duracionSeg: 6 },
    ],
  },
];

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
