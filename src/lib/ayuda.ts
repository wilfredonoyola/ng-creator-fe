import { ARTICULOS } from "@/contenido/ayuda";

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
  /** Markdown, sin la cabecera. */
  cuerpo: string;
};

export const ENLACE_AYUDA = "/ayuda";

const idioma = (locale: string): "es" | "en" => (locale === "en" ? "en" : "es");

export const articulosAyuda = (locale: string): ArticuloAyuda[] => ARTICULOS[idioma(locale)];

export const articuloAyuda = (locale: string, slug: string) => articulosAyuda(locale).find((a) => a.slug === slug);

export const porCategoria = (locale: string, categoria: string) =>
  articulosAyuda(locale).filter((a) => a.categoria === categoria);
