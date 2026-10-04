/**
 * Las plantillas de mensaje a creators. El nombre y el texto de cada una están
 * en `creators.json` (`plantillas.<clave>.nombre` / `.texto`), en el idioma de
 * la interfaz; el texto se lee con `t.raw` porque sus `{nombre}` y `{handle}`
 * los reemplaza `aplicarTemplate`, no next-intl.
 */
export const MESSAGE_TEMPLATES = [
  { id: "solicitud_uso", clave: "solicitudUso" },
  { id: "solicitud_exclusiva", clave: "solicitudExclusiva" },
  { id: "agradecimiento", clave: "agradecimiento" },
  { id: "recordatorio", clave: "recordatorio" },
] as const;

export type MessageTemplate = (typeof MESSAGE_TEMPLATES)[number];

export function aplicarTemplate(
  template: string,
  datos: { nombre?: string; handle?: string }
): string {
  let resultado = template;

  if (datos.nombre) {
    resultado = resultado.replace(/{nombre}/g, datos.nombre);
  }
  if (datos.handle) {
    resultado = resultado.replace(/{handle}/g, datos.handle);
  }

  return resultado;
}
