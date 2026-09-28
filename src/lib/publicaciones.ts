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
