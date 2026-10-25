import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { VISTA_PORTADA_MARCA } from "@/graphql/operations";
import type { PosicionLogo } from "@/lib/plantilla-clip";
import { disenoParaEnviar, type DisenoPortada } from "@/lib/diseno-portada";

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

/** El cuadro más cerca del segundo elegido (el backend arma con ese). */
export function cuadroMasCerca(cuadros: CuadroPortada[], seg: number | null): CuadroPortada | null {
  if (!cuadros.length) return null;
  if (seg == null) return cuadros[Math.floor((cuadros.length - 1) / 2)];
  return cuadros.reduce((mejor, c) => (Math.abs(c.seg - seg) < Math.abs(mejor.seg - seg) ? c : mejor));
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
