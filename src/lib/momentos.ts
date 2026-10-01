/** Por qué la IA eligió un momento (ng-creator-be#68), dicho para la pantalla. */
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
