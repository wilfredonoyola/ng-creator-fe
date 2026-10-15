/**
 * Los emojis de los textos del clip, como los dibuja el render (ver
 * emojis-texto.ts en ng-creator-be): cada emoji es el PNG de Noto Color Emoji
 * de la misma versión, del mismo lado y en el mismo lugar. Así el editor
 * muestra el emoji que sale en el video, no el del sistema de quien mira.
 */
import { METRICAS } from "@/lib/metricas-fuentes";
import type { FuenteEstilo } from "@/lib/estilos-texto";

const SEGMENTADOR = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Lo que se ve como emoji: 😂, ❤️ (con U+FE0F), 1️⃣ y las banderas. © o ™ sueltos son letras. */
const EMOJI = /\p{Emoji_Presentation}|️|⃣|\p{Regional_Indicator}/u;

export const tieneEmoji = (texto: string): boolean => EMOJI.test(texto);

/** El texto en grafemas (lo que se ve como un carácter), marcando los emojis. */
export function grafemas(texto: string): { g: string; emoji: boolean }[] {
  return [...SEGMENTADOR.segment(texto)].map(({ segment }) => ({ g: segment, emoji: EMOJI.test(segment) }));
}

/** El emoji mide 1,15 em y avanza 1,25 em, con aire a los costados (igual en el render). */
export const LADO_EMOJI = 1.15;
export const AVANCE_EMOJI = 1.25;

/** El em de una letra a un cuerpo de libass (`\fs` mide asc + desc win, no el em). */
export function emDe(fuente: FuenteEstilo, cuerpo: number): number {
  const m = METRICAS[fuente] ?? METRICAS.NUNITO;
  return (m.upem * cuerpo) / (m.ascWin + m.descWin);
}

/** La mitad de la mayúscula sobre la base, en em: ahí se centra el emoji. */
export function mitadMayusculaEm(fuente: FuenteEstilo): number {
  const m = METRICAS[fuente] ?? METRICAS.NUNITO;
  return m.altoMayuscula / m.upem / 2;
}

const VERSION_NOTO_EMOJI = "v2.047";
const INDICADOR_A = 0x1f1e6;

/**
 * El PNG de Noto del emoji, el mismo archivo que baja el render
 * (`archivoEmoji`): los códigos en hexa unidos por `_`, sin U+FE0F, y las
 * banderas en `third_party/region-flags`.
 */
export function urlEmoji(emoji: string): string {
  const codigos = [...emoji].map((c) => c.codePointAt(0)!).filter((c) => c !== 0xfe0f);
  const archivo =
    codigos.length === 2 && codigos.every((c) => c >= INDICADOR_A && c <= INDICADOR_A + 25)
      ? `third_party/region-flags/png/${codigos.map((c) => String.fromCharCode(65 + c - INDICADOR_A)).join("")}.png`
      : `png/512/emoji_u${codigos.map((c) => c.toString(16).padStart(4, "0")).join("_")}.png`;
  return `https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@${VERSION_NOTO_EMOJI}/${archivo}`;
}
