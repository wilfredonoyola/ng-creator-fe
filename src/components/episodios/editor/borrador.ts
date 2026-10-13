import type { DisenoClip, Encuadre, FondoClip, FormatoClip, ImagenClip, ImagenClipServidor, Region, SubtituloClip, Texto } from "@/lib/clip-encuadre";
import type { EstiloTexto } from "@/lib/estilos-texto";
import { normalizarCortes, type Corte } from "@/lib/cortes";
import type { EfectoClip, MusicaClip } from "@/lib/sonidos";
import { disenosDeTexto, textoNuevo } from "@/components/episodios/PanelTextos";

/** Lo que se edita de un clip: lo que se guarda solo y se deshace. */
export interface Borrador {
  desdeSeg: number;
  hastaSeg: number;
  titulo: string;
  formato: FormatoClip;
  encuadre: Encuadre;
  diseno: DisenoClip;
  fondo: FondoClip;
  /** Cada tramo con su diseño (be#105, etapa 2); sin diseño, el del clip. */
  posiciones: { desdeSeg: number; regiones: Region[]; diseno?: DisenoClip | null }[];
  subtitulosActivos: boolean;
  /** Letra, tamaño y altura propios (null = los de siempre). */
  subtitulo: SubtituloClip | null;
  correcciones: { desde: number; texto: string }[];
  gancho: string;
  ganchoActivo: boolean;
  ganchoSeg: number;
  textos: Texto[];
  /** Hasta tres imágenes encima del video; el recorte lo hace el servidor. */
  imagenes: ImagenClip[];
  /** Si lleva el logo y la llamada a la acción de la plantilla de la marca (be#117). */
  plantillaActiva: boolean;
  /** El estilo de texto de este clip (be#132). Null = el de la marca. */
  estiloTexto: EstiloTexto | null;
  /** Lo que se quita del medio del clip, en segundos del episodio (normalizado). */
  cortes: Corte[];
  /** El volumen de la voz (Tanda 2): 0 la silencia, hasta 2. */
  volumenClip: number;
  /** 0.5 a 2: se aplica al final, sobre el clip armado. */
  velocidad: number;
  /** La música de fondo, o null. La url y el título los pone el servidor; acá sirven para escucharla. */
  musica: MusicaClip | null;
  /** Los efectos de sonido, en el tiempo original del clip. */
  efectos: EfectoClip[];
}

/** El clip como llega de Apollo (las operaciones no tienen tipos generados). */
type ClipServidor = any;

/**
 * El borrador sale del clip UNA vez, al abrir el editor. Después manda lo que
 * se edita acá: pisarlo con cada respuesta del servidor borraría lo que se
 * está tipeando.
 */
export function borradorDelClip(clip: ClipServidor, colorResaltado: string): Borrador {
  const textos: Texto[] = (clip.textos ?? []).map((t: Texto) => ({
    contenido: t.contenido,
    destacadas: [...t.destacadas],
    fuente: t.fuente,
    fuenteElegida: t.fuenteElegida ?? false,
    tamano: t.tamano,
    color: t.color,
    colorDestacado: t.colorDestacado,
    efecto: t.efecto,
    colorEfecto: t.colorEfecto,
    mayusculas: t.mayusculas,
    centroX: t.centroX,
    centroY: t.centroY,
    ancho: t.ancho,
    desdeSeg: t.desdeSeg,
    hastaSeg: t.hastaSeg ?? null,
  }));
  // El gancho de la primera versión pasa a ser el primer texto, con el
  // diseño "Impacto": desde acá, todo texto sobre el clip es uno de estos.
  if (!textos.length && clip.ganchoActivo && clip.gancho?.trim()) {
    textos.push({
      ...textoNuevo(disenosDeTexto(colorResaltado)[0].estilo, clip.gancho.trim(), 0.15),
      hastaSeg: clip.ganchoSeg ?? 3,
    });
  }
  return {
    desdeSeg: clip.desdeSeg,
    hastaSeg: clip.hastaSeg,
    titulo: clip.titulo,
    formato: clip.formato,
    encuadre: {
      centroX: clip.encuadre.centroX,
      centroY: clip.encuadre.centroY,
      zoom: clip.encuadre.zoom,
    },
    diseno: clip.diseno,
    fondo: clip.fondo ?? "DESENFOCADO",
    posiciones: clip.posiciones.map((p: { desdeSeg: number; regiones: Region[]; diseno?: DisenoClip | null }) => ({
      desdeSeg: p.desdeSeg,
      diseno: p.diseno ?? null,
      regiones: p.regiones.map(({ x, y, ancho, alto }) => ({ x, y, ancho, alto })),
    })),
    subtitulosActivos: clip.subtitulosActivos,
    subtitulo: clip.subtitulo
      ? {
          fuente: clip.subtitulo.fuente,
          tamano: clip.subtitulo.tamano,
          centroY: clip.subtitulo.centroY,
          efecto: clip.subtitulo.efecto,
          mayusculas: clip.subtitulo.mayusculas,
        }
      : null,
    correcciones: clip.correcciones.map((c: { desde: number; texto: string }) => ({
      desde: c.desde,
      texto: c.texto,
    })),
    gancho: clip.gancho ?? "",
    ganchoActivo: clip.ganchoActivo,
    ganchoSeg: clip.ganchoSeg,
    textos,
    imagenes: (clip.imagenes ?? []).map((im: ImagenClipServidor) => ({
      id: im.id,
      url: im.url,
      sinFondo: im.sinFondo,
      contorno: im.contorno,
      centroX: im.centroX,
      centroY: im.centroY,
      ancho: im.ancho,
      desdeSeg: im.desdeSeg,
      hastaSeg: im.hastaSeg ?? null,
    })),
    plantillaActiva: clip.plantillaActiva ?? true,
    estiloTexto: clip.estiloTexto ?? null,
    cortes: normalizarCortes(clip.cortes ?? [], clip.desdeSeg, clip.hastaSeg),
    volumenClip: clip.volumenClip ?? 1,
    velocidad: clip.velocidad ?? 1,
    musica: clip.musica
      ? {
          sonidoId: clip.musica.sonidoId,
          url: clip.musica.url,
          titulo: clip.musica.titulo,
          volumen: clip.musica.volumen,
          bajarAlHablar: clip.musica.bajarAlHablar,
        }
      : null,
    efectos: (clip.efectos ?? []).map((ef: EfectoClip) => ({
      id: ef.id,
      sonidoId: ef.sonidoId,
      url: ef.url,
      titulo: ef.titulo,
      enSeg: ef.enSeg,
      duracionSeg: ef.duracionSeg,
      volumen: ef.volumen,
    })),
  };
}

/** El input de actualizarClipEpisodio: el borrador entero, como lo espera el backend. */
export function inputDelBorrador(b: Borrador) {
  return {
    desdeSeg: b.desdeSeg,
    hastaSeg: b.hastaSeg,
    titulo: b.titulo,
    formato: b.formato,
    encuadre: b.encuadre,
    diseno: b.diseno,
    fondo: b.fondo,
    posiciones: b.posiciones,
    subtitulosActivos: b.subtitulosActivos,
    subtitulo: b.subtitulo,
    correcciones: b.correcciones,
    gancho: b.gancho,
    // Los textos reemplazan al gancho viejo: si no, borrar todos los
    // textos haría reaparecer el gancho en el render.
    ganchoActivo: false,
    ganchoSeg: b.ganchoSeg,
    textos: b.textos.map((t) => ({ ...t, hastaSeg: t.hastaSeg ?? null })),
    // La lista entera; quitar el fondo lo encola el servidor al guardar.
    imagenes: b.imagenes.map(({ id, url, sinFondo, contorno, centroX, centroY, ancho, desdeSeg, hastaSeg }) => ({
      id,
      url,
      sinFondo,
      contorno,
      centroX,
      centroY,
      ancho,
      desdeSeg,
      hastaSeg: hastaSeg ?? null,
    })),
    plantillaActiva: b.plantillaActiva,
    // null = el de la marca.
    estiloTexto: b.estiloTexto,
    // La lista entera: reemplaza la guardada.
    cortes: b.cortes,
    volumenClip: b.volumenClip,
    velocidad: b.velocidad,
    // null la saca. La url y el título los copia el servidor del Sonido.
    musica: b.musica ? { sonidoId: b.musica.sonidoId, volumen: b.musica.volumen, bajarAlHablar: b.musica.bajarAlHablar } : null,
    efectos: b.efectos.map(({ id, sonidoId, enSeg, volumen }) => ({ id, sonidoId, enSeg, volumen })),
  };
}
