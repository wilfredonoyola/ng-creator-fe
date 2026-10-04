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
  titulo: string[];
  /** La columna de la derecha, de arriba abajo, con su número. */
  botones: { icono: IconoInterfaz; texto?: string }[];
  /** Dónde arranca la columna de botones (su borde de arriba). */
  botonesDesde: number;
  /** El botón al lado del nombre ("Seguir", "Suscribirme"), si lleva. */
  seguir?: string;
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
    titulo: ["Siguiendo", "Para ti"],
    botones: [
      { icono: "corazon", texto: "12,4 K" },
      { icono: "comentario", texto: "318" },
      { icono: "guardar", texto: "1.024" },
      { icono: "compartir", texto: "Compartir" },
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
    titulo: ["Reels"],
    botones: [
      { icono: "corazon", texto: "12,4 K" },
      { icono: "comentario", texto: "318" },
      { icono: "enviar", texto: "96" },
      { icono: "mas" },
    ],
    botonesDesde: 1060,
    seguir: "Seguir",
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
      { icono: "pulgar", texto: "8,1 K" },
      { icono: "pulgarAbajo", texto: "No me gusta" },
      { icono: "comentario", texto: "214" },
      { icono: "compartir", texto: "Compartir" },
      { icono: "remix", texto: "Remix" },
    ],
    botonesDesde: 860,
    seguir: "Suscribirme",
    audio: false,
    discoAudio: "cuadrado",
  },
  FACEBOOK: {
    nombre: "Facebook",
    arriba: 180,
    abajo: 400,
    derecha: 140,
    izquierda: 60,
    titulo: ["Reels"],
    botones: [
      { icono: "pulgar", texto: "12 K" },
      { icono: "comentario", texto: "318" },
      { icono: "compartir", texto: "96" },
      { icono: "mas" },
    ],
    botonesDesde: 1020,
    seguir: "Seguir",
    audio: true,
    discoAudio: null,
  },
};

export const LISTA_PLATAFORMAS = Object.keys(PLATAFORMAS) as Plataforma[];

/** El usuario de muestra: el nombre de la marca, sin espacios ni tildes. */
export function usuarioDeMuestra(nombreMarca: string | undefined): string {
  const limpio = (nombreMarca ?? "tumarca")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_.]/g, "")
    .toLowerCase();
  return limpio || "tumarca";
}
