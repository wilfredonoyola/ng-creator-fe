/**
 * Una publicación de la cola (ng-creator-be#59), o una de antes que el backend
 * lee con la misma forma.
 */
export interface Publicacion {
  _id: string;
  marcaId: string;
  red: string;
  cuentaId: string;
  cuentaNombre?: string | null;
  expedienteId?: string | null;
  formato: string;
  /** Lo que va abajo del video. Solo lo piden las pantallas que lo muestran. */
  descripcion?: string | null;
  portadaUrl?: string | null;
  /**
   * PROGRAMADA es de nuestra cola: se puede cancelar o mover. AGENDADA_EN_RED
   * es lo que ya tiene Meta: sale solo y no se toca desde acá.
   */
  estado: EstadoPublicacion;
  publicarEn: string;
  intentos: number;
  error?: string | null;
  postId?: string | null;
  permalink?: string | null;
  publicadaEn?: string | null;
  portadaAplicada?: boolean | null;
  portadaError?: string | null;
  createdAt: string;
  creadoPor?: { nombre: string } | null;
  canceladoPor?: { nombre: string } | null;
}

export type EstadoPublicacion =
  | "PROGRAMADA"
  | "SUBIENDO"
  | "PROCESANDO"
  | "PUBLICADA"
  | "FALLIDA"
  | "CANCELADA"
  | "AGENDADA_EN_RED";

/** Lo que un proceso tiene entre manos ahora mismo. */
export const EN_CURSO: EstadoPublicacion[] = ["SUBIENDO", "PROCESANDO"];

/**
 * Una fecha como la pide `<input type="datetime-local">`: hora LOCAL, sin zona.
 *
 * `toISOString().slice(0, 16)` parece lo mismo y no lo es: da la hora UTC, así
 * que fuera de UTC el mínimo del input quedaba corrido tantas horas como la
 * zona.
 */
export function aInputLocal(fecha: Date): string {
  const dosDigitos = (n: number) => String(n).padStart(2, "0");
  return (
    `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-` +
    `${dosDigitos(fecha.getDate())}T${dosDigitos(fecha.getHours())}:` +
    `${dosDigitos(fecha.getMinutes())}`
  );
}

/** Las redes con su nombre y un color propio, para reconocerlas sin leer. */
export const REDES: Record<string, { nombre: string; sigla: string; clase: string }> = {
  FACEBOOK: { nombre: "Facebook", sigla: "f", clase: "bg-[#1877F2] text-white" },
  INSTAGRAM: {
    nombre: "Instagram",
    sigla: "IG",
    clase: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white",
  },
  YOUTUBE: { nombre: "YouTube", sigla: "▶", clase: "bg-[#FF0000] text-white" },
  TIKTOK: { nombre: "TikTok", sigla: "♪", clase: "bg-black text-white ring-1 ring-white/20" },
};

/**
 * Cómo se dice cada estado, y con qué color. `texto` es el español; una
 * pantalla traducida usa la clave del estado (`estados.PUBLICADA`) en su
 * namespace y toma de acá solo la clase.
 */
export const ESTADOS_PUBLICACION: Record<EstadoPublicacion, { texto: string; clase: string }> = {
  PROGRAMADA: { texto: "Programada", clase: "bg-indigo-400/15 text-indigo-300" },
  AGENDADA_EN_RED: { texto: "Agendada", clase: "bg-indigo-400/15 text-indigo-300" },
  SUBIENDO: { texto: "Subiendo", clase: "bg-sky-500/15 text-sky-300" },
  PROCESANDO: { texto: "Publicando", clase: "bg-sky-500/15 text-sky-300" },
  PUBLICADA: { texto: "Publicada", clase: "bg-ng-teal/15 text-ng-teal" },
  FALLIDA: { texto: "Falló", clase: "bg-red-500/15 text-red-400" },
  CANCELADA: { texto: "Cancelada", clase: "bg-white/10 text-white/50" },
};

/** "18:00". Las horas del calendario van en 24 h: no hay a. m. que confundir. */
export function horaCorta(fecha: Date, locale: string): string {
  return fecha.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** "vie 3, 18:00" ("Fri 3, 18:00" en inglés). */
export function diaYHora(fecha: Date, locale: string): string {
  const dia = fecha.toLocaleDateString(locale, { weekday: "short" }).replace(".", "");
  return `${dia} ${fecha.getDate()}, ${horaCorta(fecha, locale)}`;
}

/**
 * En qué zona están las horas que se muestran: las del navegador. "America/
 * El_Salvador (GMT-6)". El equipo puede estar en países distintos, y una hora
 * sin zona es una hora que alguien lee mal.
 */
export function zonaHoraria(locale: string): string {
  try {
    const zona = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const corta = new Intl.DateTimeFormat(locale, { timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    return corta ? `${zona.replace(/_/g, " ")} (${corta})` : zona.replace(/_/g, " ");
  } catch {
    return locale === "es" ? "la hora de este dispositivo" : "this device's time";
  }
}
