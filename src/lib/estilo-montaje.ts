import { Camara, Lienzo, Montaje, Texto } from "./montaje";

/**
 * El estilo de una página: cómo se ven sus videos.
 *
 * La línea que separa estilo de contenido es la que hace que esto sirva: entra
 * lo que uno decidiría igual en los diez videos de mañana, y queda afuera todo
 * lo que es de ESTE video.
 *
 * Dentro: formato, fondo, volúmenes, subtítulos, la cámara sin su grabación, y
 * la apariencia de los titulares.
 *
 * Fuera, a propósito:
 *
 * - `trim` y `recorte`, que son de este video y de ningún otro.
 * - `video` (dónde cae el recorte en el lienzo), que se deduce del recorte.
 * - El **contenido** de los titulares. Arrancar cada video con el texto del
 *   anterior es peor que arrancar vacío: se publica el titular viejo el día que
 *   alguien no lo pise.
 * - `momentos` y `origenStoragePath` de la cámara: apuntan a grabaciones que
 *   son de un video en particular.
 */
export interface EstiloMontaje {
  /** Para reconocer lo que no se entiende en vez de hidratar basura. */
  version: 1;
  formatoElegido: string | null;
  lienzo: Lienzo;
  fondo: Montaje["fondo"];
  volumenVideo: number;
  subtitulos: Montaje["subtitulos"];
  /** Sin `origenStoragePath`: la grabación es de un video, no del estilo. */
  camara: Omit<Camara, "origenStoragePath"> | null;
  /** Solo la pinta de los titulares, sin lo que dicen. */
  titulares: {
    superior: AparienciaTexto;
    inferior: AparienciaTexto;
  };
}

type AparienciaTexto = Omit<Texto, "contenido" | "destacadas">;

function apariencia(t: Texto): AparienciaTexto {
  const { contenido: _c, destacadas: _d, ...resto } = t;
  return resto;
}

/** Saca de un montaje lo que vale la pena repetir. */
export function extraerEstilo(
  m: Montaje,
  formatoElegido: string | null,
): EstiloMontaje {
  const camara = m.camara
    ? (() => {
        const { origenStoragePath: _o, ...resto } = m.camara;
        return resto;
      })()
    : null;

  return {
    version: 1,
    formatoElegido,
    lienzo: m.lienzo,
    fondo: m.fondo,
    volumenVideo: m.volumenVideo,
    subtitulos: m.subtitulos,
    camara,
    titulares: {
      superior: apariencia(m.textoSuperior),
      inferior: apariencia(m.textoInferior),
    },
  };
}

/**
 * Aplica un estilo sobre un montaje recién nacido.
 *
 * Desconfía del contenido: viene de un JSON que el backend guarda sin mirar.
 * Cada campo se aplica solo si está y tiene la forma esperada, y lo que no, se
 * deja como venía. Un estilo a medias tiene que dar un editor usable, no uno
 * roto — es la diferencia entre "esto no se guardó bien" y "no puedo trabajar".
 *
 * No toca la cámara si el estilo no trae ninguna: apagarla porque el estilo se
 * guardó sin ella sería sorprender a quien acaba de encenderla.
 */
export function aplicarEstilo(base: Montaje, crudo: unknown): Montaje {
  const e = crudo as Partial<EstiloMontaje> | null;
  if (!e || e.version !== 1) return base;

  const m: Montaje = { ...base };

  if (e.lienzo?.ancho && e.lienzo?.alto) m.lienzo = e.lienzo;
  if (e.fondo) m.fondo = e.fondo;
  if (typeof e.volumenVideo === "number") m.volumenVideo = e.volumenVideo;
  if (e.subtitulos && typeof e.subtitulos.activos === "boolean") {
    m.subtitulos = e.subtitulos;
  }
  if (e.camara && typeof e.camara.tamano === "number") {
    m.camara = { ...e.camara };
  }
  if (e.titulares?.superior) {
    m.textoSuperior = { ...m.textoSuperior, ...e.titulares.superior };
  }
  if (e.titulares?.inferior) {
    m.textoInferior = { ...m.textoInferior, ...e.titulares.inferior };
  }
  return m;
}

/** El formato guardado, si el estilo trae uno reconocible. */
export function formatoDelEstilo(crudo: unknown): string | null {
  const e = crudo as Partial<EstiloMontaje> | null;
  if (!e || e.version !== 1) return null;
  return typeof e.formatoElegido === "string" ? e.formatoElegido : null;
}
