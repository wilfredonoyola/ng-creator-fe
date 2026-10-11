import { ARTICULOS } from "@/contenido/ayuda";
import type { IdSeccion } from "@/components/landing/funciones";
import { conDatos } from "@/lib/datos-producto";

/**
 * La wiki de ayuda (www.clipfine.io/ayuda). Los artículos son Markdown en
 * src/contenido/ayuda/{es,en}; scripts/ayuda.mjs los junta en
 * src/contenido/ayuda/index.ts. Los lee la página, el buscador y el índice
 * JSON que usa el MCP para contestar en ChatGPT y Claude.
 */

/** En el orden en que se muestran. Los nombres están en messages/ayuda.json. */
export const CATEGORIAS_AYUDA = ["primeros-pasos", "equipo", "clips", "editor", "revision", "publicar", "metricas", "planes", "app"] as const;
export type CategoriaAyuda = (typeof CATEGORIAS_AYUDA)[number];

export type ArticuloAyuda = {
  slug: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaAyuda;
  orden: number;
  /** Las secciones de /features que explica. */
  funciones: IdSeccion[];
  /** Markdown, sin la cabecera. */
  cuerpo: string;
};

export const ENLACE_AYUDA = "/ayuda";

const idioma = (locale: string): "es" | "en" => (locale === "en" ? "en" : "es");

/** Con los {{datos}} ya reemplazados (precios, correo de soporte…). */
const RESUELTOS = {
  es: ARTICULOS.es.map(resolver),
  en: ARTICULOS.en.map(resolver),
};
function resolver(a: ArticuloAyuda): ArticuloAyuda {
  return { ...a, titulo: conDatos(a.titulo), descripcion: conDatos(a.descripcion), cuerpo: conDatos(a.cuerpo) };
}

export const articulosAyuda = (locale: string): ArticuloAyuda[] => RESUELTOS[idioma(locale)];

/** Las guías de una sección de /features. */
export const guiasDeFuncion = (locale: string, id: IdSeccion) =>
  articulosAyuda(locale).filter((a) => a.funciones.includes(id));

export const articuloAyuda = (locale: string, slug: string) => articulosAyuda(locale).find((a) => a.slug === slug);

export const porCategoria = (locale: string, categoria: string) =>
  articulosAyuda(locale).filter((a) => a.categoria === categoria);
