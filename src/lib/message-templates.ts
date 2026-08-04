export interface MessageTemplate {
  id: string;
  nombre: string;
  texto: string;
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "solicitud_uso",
    nombre: "Solicitud de uso",
    texto: `Hola {nombre}!

Somos el equipo de NG Video Creator y nos encanto tu video. Nos gustaria saber si nos darias permiso para usarlo en nuestras redes sociales.

Te dariamos credito como @{handle} en todas las publicaciones.

Gracias!`,
  },
  {
    id: "solicitud_exclusiva",
    nombre: "Solicitud exclusiva Meta",
    texto: `Hola {nombre}!

Somos NG Video Creator. Nos interesa tu contenido para publicar de forma exclusiva en Meta (Facebook/Instagram).

Esto significa que seriamos los unicos que podrian publicar tu video en estas plataformas, y te dariamos credito siempre.

Te parece bien? Podemos hablar de los detalles.

Gracias!`,
  },
  {
    id: "agradecimiento",
    nombre: "Agradecimiento por permiso",
    texto: `Gracias {nombre}!

Confirmamos que tenemos tu permiso para usar tu contenido. Te avisaremos cuando publiquemos y siempre te daremos credito como @{handle}.

Saludos!`,
  },
  {
    id: "recordatorio",
    nombre: "Recordatorio de solicitud",
    texto: `Hola {nombre}!

Te escribimos hace unos dias para pedirte permiso para usar tu video. Nos gustaria saber si te interesa.

Esperamos tu respuesta!`,
  },
];

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
