import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { AVISOS_PORTADA, VISTA_PORTADA_MARCA } from "@/graphql/operations";
import type { PosicionLogo } from "@/lib/plantilla-clip";
import { disenoParaEnviar, type CaraDeCuadro, type DisenoPortada } from "@/lib/diseno-portada";

/**
 * La portada de marca (ng-creator-be#239): todas las portadas de una marca con
 * el mismo diseño (un cuadro limpio del clip, el título y el logo). La dibuja
 * el backend (portada-marca.ts) y la vista previa es esa misma imagen.
 */

export type EstiloPortada = "DOS_COLORES" | "CAJA" | "LIMPIO";

export interface PlantillaPortada {
  activa: boolean;
  estilo: EstiloPortada;
  fuente: string;
  /** Centro del título en fracción del alto (0,15–0,85). */
  posicionY: number;
  /** Cuánto más grande o chico que el tamaño de siempre (0,6–1,6). */
  tamano: number;
  mayusculas: boolean;
  logoActivo: boolean;
  logoPosicion: PosicionLogo;
  /** Ancho del logo en fracción del ancho (0,08–0,4). */
  logoTamano: number;
  /**
   * El diseño del editor (be#244). Sin el campo, el servidor conserva el
   * guardado; null lo borra y vuelve al diseño simple de arriba.
   */
  diseno?: DisenoPortada | null;
}

export const PLANTILLA_PORTADA_POR_DEFECTO: PlantillaPortada = {
  activa: false,
  estilo: "DOS_COLORES",
  fuente: "ANTON",
  posicionY: 0.72,
  tamano: 1,
  mayusculas: true,
  logoActivo: true,
  logoPosicion: "ABAJO_DERECHA",
  logoTamano: 0.2,
};

export const ESTILOS_PORTADA: readonly EstiloPortada[] = ["DOS_COLORES", "CAJA", "LIMPIO"];

/** Las letras que se ofrecen para la portada: las de impacto primero. */
export const FUENTES_PORTADA = ["ANTON", "BEBAS", "MONTSERRAT_BLACK", "INTER_TIGHT_BOLD", "PLUS_JAKARTA_BOLD", "INSTRUMENT_SERIF"] as const;

/** Hasta cuántas letras el título: más no se lee en la grilla del perfil. */
export const TEXTO_PORTADA_MAX = 120;

/** Un cuadro limpio del clip (sin textos encima), en segundos del MP4. */
export interface CuadroPortada {
  seg: number;
  url: string;
  /** Cuánto sirve de portada, de 0 a 1 (be#249); null en los clips de antes. */
  puntaje?: number | null;
  /** Cuántas caras se encontraron; null si no se midió. */
  caras?: number | null;
  /** La cara principal, para centrar en ella. */
  cara?: CaraDeCuadro | null;
}

/**
 * Lo que llega de GraphQL, sin `__typename` y sin el diseño: tal cual para el
 * input. El diseño va aparte (`disenoDePlantilla`) y se manda solo al cambiarlo.
 */
export function plantillaParaGuardar(p: PlantillaPortada & { __typename?: string }): PlantillaPortada {
  const { __typename: _, diseno: _d, ...resto } = p;
  return resto;
}

/** El diseño guardado en la plantilla, listo para mandar; null si usa el simple. */
export function disenoDePlantilla(p: PlantillaPortada | null | undefined): DisenoPortada | null {
  return p?.diseno ? disenoParaEnviar(p.diseno) : null;
}

/** El de más puntaje (be#249); null si ninguno se midió (los clips de antes). */
export function mejorCuadro<T extends CuadroPortada>(cuadros: T[]): T | null {
  const medidos = cuadros.filter((c) => c.puntaje != null);
  if (!medidos.length) return null;
  return medidos.reduce((mejor, c) => (c.puntaje! > mejor.puntaje! ? c : mejor));
}

/**
 * El cuadro más cerca del segundo elegido (el backend arma con ese). Sin
 * segundo, el de más puntaje o, en los clips de antes, uno del medio: igual
 * que `cuadroMasCerca` del backend (portada-marca.ts).
 */
export function cuadroMasCerca<T extends CuadroPortada>(cuadros: T[], seg: number | null): T | null {
  if (!cuadros.length) return null;
  if (seg == null) return mejorCuadro(cuadros) ?? cuadros[Math.floor((cuadros.length - 1) / 2)];
  return cuadros.reduce((mejor, c) => (Math.abs(c.seg - seg) < Math.abs(mejor.seg - seg) ? c : mejor));
}

/**
 * El título de la portada si no se escribe otro: el primero de la IA (be#249),
 * el gancho o el título del clip. Igual que `textoDePortada` del backend.
 */
export function textoPorDefectoPortada(clip: { titulo: string; gancho?: string | null; titulosPortada?: string[] | null }): string {
  return clip.titulosPortada?.[0]?.trim() || clip.gancho?.trim() || clip.titulo;
}

/** Lo que la revisión de la portada encuentra (be#249); los graves no dejan programar. */
export type CodigoAvisoPortada =
  | "TITULO_VACIO"
  | "TITULO_FUERA_GRILLA"
  | "TEXTO_FUERA_GRILLA"
  | "LOGO_FUERA_GRILLA"
  | "TITULO_LARGO"
  | "CARA_CHICA"
  | "SIN_CARA";

export interface AvisoPortada {
  codigo: CodigoAvisoPortada;
  grave: boolean;
  /** La capa del aviso, para elegirla en el editor. */
  capaId?: string | null;
}

/**
 * La revisión de la portada de una publicación, pedida 600 ms después del
 * último cambio (no dibuja: es rápida). Mientras llega la nueva quedan los
 * avisos anteriores, para que el botón no parpadee.
 */
export function useAvisosPortada(
  variables: {
    marcaId: string;
    clipId?: string | null;
    texto?: string | null;
    seg?: number | null;
    diseno?: DisenoPortada | null;
  },
  skip = false,
): { avisos: AvisoPortada[]; graves: AvisoPortada[]; revisando: boolean } {
  const clave = JSON.stringify({ ...variables, diseno: variables.diseno ? disenoParaEnviar(variables.diseno) : null });
  const [pedidas, setPedidas] = useState(clave);
  useEffect(() => {
    const id = setTimeout(() => setPedidas(clave), 600);
    return () => clearTimeout(id);
  }, [clave]);
  const q = useQuery(AVISOS_PORTADA, {
    variables: JSON.parse(pedidas) as typeof variables,
    skip: skip || !variables.marcaId || !variables.clipId,
    fetchPolicy: "cache-first",
  });
  const avisos: AvisoPortada[] = skip ? [] : (q.data?.avisosPortada ?? q.previousData?.avisosPortada ?? []);
  return { avisos, graves: avisos.filter((a) => a.grave), revisando: !skip && (q.loading || pedidas !== clave) };
}

/**
 * La vista previa, pedida 400 ms después del último cambio (armarla tarda un
 * segundo). Mientras llega la nueva queda la anterior.
 */
export function useVistaPortada(
  variables: {
    marcaId: string;
    clipId?: string | null;
    texto?: string | null;
    seg?: number | null;
    plantilla?: PlantillaPortada | null;
    /** Un diseño propio (el de la publicación): manda sobre la plantilla. */
    diseno?: DisenoPortada | null;
  },
  skip = false,
): { imagen: string | null; cargando: boolean; error: boolean } {
  const clave = JSON.stringify(variables);
  const [pedidas, setPedidas] = useState(clave);
  useEffect(() => {
    const id = setTimeout(() => setPedidas(clave), 400);
    return () => clearTimeout(id);
  }, [clave]);
  const q = useQuery(VISTA_PORTADA_MARCA, {
    variables: JSON.parse(pedidas) as typeof variables,
    skip: skip || !variables.marcaId,
    fetchPolicy: "cache-first",
  });
  const imagen: string | null = q.data?.vistaPortadaMarca ?? q.previousData?.vistaPortadaMarca ?? null;
  return { imagen, cargando: q.loading || pedidas !== clave, error: Boolean(q.error) };
}
