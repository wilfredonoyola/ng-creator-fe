/**
 * Los motivos por los que la IA elige un momento (ng-creator-be#68). Cada uno
 * se dice en pantalla con el namespace `episodiosMotivos`:
 * `esMotivo(m) ? t(m) : m`.
 */
export const CLAVES_MOTIVO = [
  "GANCHO_FUERTE",
  "OPINION_POLEMICA",
  "HISTORIA_COMPLETA",
  "FRASE_CITABLE",
  "HUMOR",
  "EMOCION",
  "DATO_SORPRENDENTE",
] as const;
export type Motivo = (typeof CLAVES_MOTIVO)[number];

export function esMotivo(m: string): m is Motivo {
  return (CLAVES_MOTIVO as readonly string[]).includes(m);
}

/**
 * Por qué la IA eligió un momento, en español fijo.
 * @deprecated Usar `esMotivo` + el namespace `episodiosMotivos`.
 */
export const MOTIVOS: Record<string, string> = {
  GANCHO_FUERTE: "Gancho fuerte",
  OPINION_POLEMICA: "Opinión polémica",
  HISTORIA_COMPLETA: "Historia completa",
  FRASE_CITABLE: "Frase citable",
  HUMOR: "Humor",
  EMOCION: "Emoción",
  DATO_SORPRENDENTE: "Dato sorprendente",
};

/** Un segundo del episodio como reloj: 4:05 o 1:02:09. */
export function reloj(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}
