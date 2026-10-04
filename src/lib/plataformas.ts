/**
 * Lo que cada red le pone encima a un video 9:16: los botones de la derecha,
 * el usuario y la descripción abajo y la barra de arriba. Sirve para ver en la
 * vista previa qué tapa cada una y dejar el gancho, los subtítulos y el logo
 * donde se lean.
 *
 * Todo va en píxeles de un lienzo de 1080x1920, como el render. Las medidas
 * son aproximadas (cada red cambia su interfaz seguido y depende del
 * teléfono); alcanzan para ver el problema, no son una regla al píxel. La app
 * tiene una copia en src/lib/plataformas.ts: si se cambia una, la otra.
 *
 * Los textos que se ven (pestañas, "Seguir", "Compartir", los números con
 * formato) van como claves de `estilosInterfaz` y se traducen al dibujar.
 */

export type Plataforma = "TIKTOK" | "REELS" | "SHORTS" | "FACEBOOK";

/** Los íconos genéricos, sin logos de nadie: cada lado los dibuja con su lucide. */
export type IconoInterfaz =
  | "corazon"
  | "comentario"
  | "guardar"
  | "compartir"
  | "enviar"
  | "pulgar"
  | "pulgarAbajo"
  | "remix"
  | "mas";

/** Un texto de la interfaz de muestra: su clave en los mensajes (`estilosInterfaz.textos`). */
export type TextoInterfaz =
  | "siguiendo"
  | "paraTi"
  | "reels"
  | "seguir"
  | "suscribirme"
  | "compartir"
  | "noMeGusta"
  | "remix"
  | "n12_4k"
  | "n1024"
  | "n8_1k"
  | "n12k";

export interface InterfazPlataforma {
  nombre: string;
  /** Lo que tapa la barra de arriba. */
  arriba: number;
  /** Lo que tapan el usuario, la descripción y el audio. */
  abajo: number;
  /** Lo que tapa la columna de botones. */
  derecha: number;
  izquierda: number;
  /** Las pestañas o el título de arriba. */
  titulo: TextoInterfaz[];
  /** La columna de la derecha, de arriba abajo, con su número (tal cual, o una clave si cambia con el idioma). */
  botones: { icono: IconoInterfaz; texto?: string; clave?: TextoInterfaz }[];
  /** Dónde arranca la columna de botones (su borde de arriba). */
  botonesDesde: number;
  /** El botón al lado del nombre ("Seguir", "Suscribirme"), si lleva. */
  seguir?: TextoInterfaz;
  /** Si lleva la línea del audio abajo. */
  audio: boolean;
  /** El disco o el cuadrado del audio, abajo de los botones. */
  discoAudio: "disco" | "cuadrado" | null;
}

export const PLATAFORMAS: Record<Plataforma, InterfazPlataforma> = {
  TIKTOK: {
    nombre: "TikTok",
    arriba: 150,
    abajo: 380,
    derecha: 150,
    izquierda: 60,
    titulo: ["siguiendo", "paraTi"],
    botones: [
      { icono: "corazon", clave: "n12_4k" },
      { icono: "comentario", texto: "318" },
      { icono: "guardar", clave: "n1024" },
      { icono: "compartir", clave: "compartir" },
    ],
    botonesDesde: 900,
    audio: true,
    discoAudio: "disco",
  },
  REELS: {
    nombre: "Reels",
    arriba: 210,
    abajo: 420,
    derecha: 130,
    izquierda: 60,
    titulo: ["reels"],
    botones: [
      { icono: "corazon", clave: "n12_4k" },
      { icono: "comentario", texto: "318" },
      { icono: "enviar", texto: "96" },
      { icono: "mas" },
    ],
    botonesDesde: 1060,
    seguir: "seguir",
    audio: true,
    discoAudio: "cuadrado",
  },
  SHORTS: {
    nombre: "Shorts",
    arriba: 190,
    abajo: 400,
    derecha: 160,
    izquierda: 60,
    titulo: [],
    botones: [
      { icono: "pulgar", clave: "n8_1k" },
      { icono: "pulgarAbajo", clave: "noMeGusta" },
      { icono: "comentario", texto: "214" },
      { icono: "compartir", clave: "compartir" },
      { icono: "remix", clave: "remix" },
    ],
    botonesDesde: 860,
    seguir: "suscribirme",
    audio: false,
    discoAudio: "cuadrado",
  },
  FACEBOOK: {
    nombre: "Facebook",
    arriba: 180,
    abajo: 400,
    derecha: 140,
    izquierda: 60,
    titulo: ["reels"],
    botones: [
      { icono: "pulgar", clave: "n12k" },
      { icono: "comentario", texto: "318" },
      { icono: "compartir", texto: "96" },
      { icono: "mas" },
    ],
    botonesDesde: 1020,
    seguir: "seguir",
    audio: true,
    discoAudio: null,
  },
};

export const LISTA_PLATAFORMAS = Object.keys(PLATAFORMAS) as Plataforma[];

/**
 * El usuario de muestra: el nombre de la marca, sin espacios ni tildes. Sin
 * nombre, `porDefecto` (el componente lo pasa traducido).
 */
export function usuarioDeMuestra(nombreMarca: string | undefined, porDefecto = "tumarca"): string {
  const limpio = (nombreMarca ?? porDefecto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_.]/g, "")
    .toLowerCase();
  return limpio || porDefecto;
}
