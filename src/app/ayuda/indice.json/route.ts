import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { SECCIONES, namespaceDe } from "@/components/landing/funciones";
import { CUSTOM, PLANES, PRUEBA_DIAS, PRUEBA_HORAS } from "@/components/landing/planes";
import { ENLACE_FUNCIONES } from "@/components/landing/Publica";
import { ENLACE_AYUDA, articulosAyuda, guiasDeFuncion } from "@/lib/ayuda";
import { CONTACTO } from "@/lib/legal";
import { URL_SITIO } from "@/lib/sitio";

/**
 * Todo lo que Clipfine sabe de sí mismo, en un JSON: la fuente de la que leen
 * el chat de soporte y el MCP (ng-creator-be). Sale de los mismos lugares que
 * el sitio (docs/FUENTE-DE-VERDAD.md):
 *
 * - `articulos`: la wiki (/ayuda), con los {{datos}} ya reemplazados.
 * - `funciones`: las secciones de /features, con sus funciones, sus
 *   preguntas y las guías que las explican.
 * - `datos`: soporte, prueba y planes (planes.ts, legal.ts).
 *
 * `?idioma=en` para inglés; sin él, español.
 */
export async function GET(req: NextRequest) {
  const idioma = req.nextUrl.searchParams.get("idioma") === "en" ? "en" : "es";
  const t = await getTranslations({ locale: idioma, namespace: "landingFunciones" });

  const articulos = articulosAyuda(idioma).map((a) => ({ ...a, url: `${URL_SITIO}${ENLACE_AYUDA}/${a.slug}` }));

  const funciones = await Promise.all(
    SECCIONES.map(async (s) => {
      // Cada sección tiene su namespace (features<Seccion>); el tipo no lo puede saber.
      const tf = (await getTranslations({ locale: idioma, namespace: namespaceDe(s.id) as never })) as unknown as {
        has: (k: string) => boolean;
        raw: (k: string) => unknown;
      };
      const preguntas = Object.values((tf.has("preguntas") ? tf.raw("preguntas") : {}) as Record<string, { p: string; r: string }>);
      return {
        id: s.id,
        url: `${URL_SITIO}${ENLACE_FUNCIONES}/${s.id}`,
        titulo: t(`secciones.${s.id}.titulo`),
        texto: t(`secciones.${s.id}.texto`),
        items: s.items.map((i) => ({ titulo: t(`items.${i.clave}.titulo`), texto: t(`items.${i.clave}.texto`) })),
        preguntas: preguntas.map((q) => ({ pregunta: q.p, respuesta: q.r })),
        guias: guiasDeFuncion(idioma, s.id).map((a) => a.slug),
      };
    }),
  );

  const datos = {
    soporte: CONTACTO,
    prueba: { dias: PRUEBA_DIAS, horas: PRUEBA_HORAS },
    planes: [
      ...PLANES.map((p) => ({ plan: p.clave, mensualUsd: p.mensual, anualPorMesUsd: p.anual, horasPorMes: p.horas })),
      { plan: "custom", desdeUsd: CUSTOM.desde, horasPorMes: `${CUSTOM.horas}+` },
    ],
    precios: `${URL_SITIO}/#precios`,
  };

  return NextResponse.json(
    { idioma, articulos, funciones, datos },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600", "Access-Control-Allow-Origin": "*" } },
  );
}
