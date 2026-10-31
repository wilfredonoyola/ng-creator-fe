import { CUSTOM, PLANES, PRUEBA_DIAS, PRUEBA_HORAS } from "@/components/landing/planes";
import { CONTACTO } from "@/lib/legal";
import { URL_MCP } from "@/lib/sitio";

/**
 * Los datos del producto que se repiten en la wiki, el chat de soporte y el
 * MCP: el correo de soporte, los precios, la prueba. Viven en su lugar
 * (planes.ts, legal.ts) y la wiki los nombra con `{{clave}}` en vez de
 * escribirlos: cambiar un precio en planes.ts cambia todos los artículos.
 *
 * Un `{{…}}` que no está acá no compila: scripts/ayuda.mjs junta los usados en
 * DATOS_USADOS, que tiene que ser de este tipo.
 */
const porPlan = Object.fromEntries(
  PLANES.flatMap((p) => [
    [`plan.${p.clave}.mensual`, String(p.mensual)],
    [`plan.${p.clave}.anual`, String(p.anual)],
    [`plan.${p.clave}.horas`, String(p.horas)],
  ]),
) as Record<`plan.${(typeof PLANES)[number]["clave"]}.${"mensual" | "anual" | "horas"}`, string>;

/** El mayor ahorro del cobro anual, en %, como lo dice la página de precios. */
const ahorroAnual = Math.max(...PLANES.map((p) => Math.round((1 - p.anual / p.mensual) * 100)));

export const DATOS_PRODUCTO = {
  soporte: CONTACTO,
  mcp: URL_MCP,
  "prueba.dias": String(PRUEBA_DIAS),
  "prueba.horas": String(PRUEBA_HORAS),
  "custom.desde": String(CUSTOM.desde),
  "custom.horas": String(CUSTOM.horas),
  ahorroAnual: String(ahorroAnual),
  ...porPlan,
};

export type ClaveDato = keyof typeof DATOS_PRODUCTO;

/** Reemplaza cada `{{clave}}` por su valor. */
export const conDatos = (texto: string) =>
  texto.replace(/\{\{([\w.]+)\}\}/g, (todo, clave: string) => DATOS_PRODUCTO[clave as ClaveDato] ?? todo);
