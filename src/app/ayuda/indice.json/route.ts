import { NextResponse, type NextRequest } from "next/server";
import { ARTICULOS } from "@/contenido/ayuda";
import { ENLACE_AYUDA } from "@/lib/ayuda";
import { URL_SITIO } from "@/lib/sitio";

/**
 * La wiki entera en JSON, para el MCP (ng-creator-be#182): con esto contesta
 * en ChatGPT y Claude sin copiar los artículos. `?idioma=en` para inglés; sin
 * él, español. Lleva el Markdown completo de cada artículo.
 */
export function GET(req: NextRequest) {
  const idioma = req.nextUrl.searchParams.get("idioma") === "en" ? "en" : "es";
  const articulos = ARTICULOS[idioma].map((a) => ({ ...a, url: `${URL_SITIO}${ENLACE_AYUDA}/${a.slug}` }));
  return NextResponse.json(
    { idioma, articulos },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600", "Access-Control-Allow-Origin": "*" } },
  );
}
