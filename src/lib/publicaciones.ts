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
  /** 'upload-post' o 'propio': por dónde sale. */
  proveedor?: string | null;
  publicarEn: string;
  intentos: number;
  error?: string | null;
  postId?: string | null;
  permalink?: string | null;
  publicadaEn?: string | null;
  portadaAplicada?: boolean | null;
  portadaError?: string | null;
  /**
   * Se programó sin el MP4 al día: el render quedó pedido y la publicación
   * espera a que termine (ng-creator-be#172). Si el render falla, queda FALLIDA.
   */
  esperaVideo?: boolean | null;
  /**
   * Frenada por la revisión de la marca (ng-creator-be#175): no sale hasta que
   * un revisor apruebe el clip, aunque pase la hora.
   */
  esperaAprobacion?: boolean | null;
  /** Salió sin revisar: la marca eligió publicar igual al vencer. */
  sinRevisar?: boolean | null;
  createdAt: string;
  /** El texto como se escribió, con las @menciones sin resolver: para editar lo programado. */
  textoBase?: string | null;
  /** A quiénes se etiquetó (Etiquetas). */
  personaIds?: string[] | null;
  /** Lo propio de la red: título de YouTube, etiquetas y colaboradores. */
  ajustes?: Record<string, unknown> | null;
  portadaSeg?: number | null;
  /** Sale con la portada de marca (ng-creator-be#239). */
  portadaMarca?: boolean | null;
  /** El título de la portada de marca; vacío, el del clip. */
  portadaTexto?: string | null;
  /** Salió, pero con algo menos de lo pedido (p. ej. sin etiquetas que Instagram rechazó). */
  aviso?: string | null;
  /** Falló y se puede volver a mandar la misma ("Editar y reintentar"). */
  puedeReintentar?: boolean | null;
  /** Falló después de pedir que publique: puede que haya salido igual. */
  quizasPublicada?: boolean | null;
  /** Las etiquetas que Instagram rechazó y se sacaron para que saliera igual. */
  etiquetasDescartadas?: { etiquetados: string[]; colaboradores: string[]; motivo?: string | null } | null;
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

/** Ya salió en la red o está saliendo: otra publicación ahí sería un duplicado. */
export const SALIO_O_SALE: EstadoPublicacion[] = ["PUBLICADA", "SUBIENDO", "PROCESANDO", "AGENDADA_EN_RED"];

/** Mismo destino: la misma cuenta en la misma red. */
export const mismoDestino = (a: { red: string; cuentaId: string }, b: { red: string; cuentaId: string }) =>
  a.red === b.red && a.cuentaId === b.cuentaId;

/**
 * Lo que ya salió (o está saliendo) en ese destino, la más reciente. Sirve
 * para no programar dos veces lo mismo sin querer.
 */
export function salidaEn<P extends Pick<Publicacion, "red" | "cuentaId" | "estado" | "publicarEn" | "publicadaEn">>(
  destino: { red: string; cuentaId: string },
  publicaciones: P[],
): P | null {
  const salidas = publicaciones.filter((p) => mismoDestino(p, destino) && SALIO_O_SALE.includes(p.estado));
  const fecha = (p: P) => new Date(p.publicadaEn ?? p.publicarEn).getTime();
  return salidas.sort((a, b) => fecha(b) - fecha(a))[0] ?? null;
}

/**
 * Un intento fallido que ya no importa: en el mismo destino hay otra
 * publicación que salió o está saliendo. No se ofrece reintentarlo (sería
 * publicar dos veces).
 */
export function fallaReemplazada<P extends Pick<Publicacion, "_id" | "red" | "cuentaId" | "estado">>(p: P, todas: P[]): boolean {
  return p.estado === "FALLIDA" && todas.some((o) => o._id !== p._id && mismoDestino(o, p) && SALIO_O_SALE.includes(o.estado));
}

/**
 * Las publicaciones de un clip en el orden en que se leen: por destino, en el
 * orden en que aparece cada uno, y dentro de cada destino primero lo que salió
 * (o sale), después lo pendiente y al final los intentos fallidos.
 */
export function ordenarPorDestino<P extends Pick<Publicacion, "red" | "cuentaId" | "estado">>(publicaciones: P[]): P[] {
  const destinos: string[] = [];
  for (const p of publicaciones) {
    const k = `${p.red}:${p.cuentaId}`;
    if (!destinos.includes(k)) destinos.push(k);
  }
  const peso = (p: P) => (SALIO_O_SALE.includes(p.estado) ? 0 : p.estado === "FALLIDA" ? 2 : p.estado === "CANCELADA" ? 3 : 1);
  return publicaciones
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const d = destinos.indexOf(`${a.p.red}:${a.p.cuentaId}`) - destinos.indexOf(`${b.p.red}:${b.p.cuentaId}`);
      return d || peso(a.p) - peso(b.p) || a.i - b.i;
    })
    .map((x) => x.p);
}

/**
 * Si un error es la red rechazando a una cuenta etiquetada o colaboradora
 * (privada, inexistente, sin invitaciones de colaboración o que no se ve).
 * El texto de Upload-Post es largo y en inglés: se resume y el detalle queda a mano.
 */
export function esRechazoDeEtiquetas(error?: string | null): boolean {
  return /not eligible to be tagged|user[_ ]?tags?\b|collaborat|user not visible/i.test(error ?? "");
}

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
