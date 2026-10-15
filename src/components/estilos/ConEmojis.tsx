import { AVANCE_EMOJI, grafemas, LADO_EMOJI, mitadMayusculaEm, tieneEmoji, urlEmoji } from "@/lib/emojis";
import type { FuenteEstilo } from "@/lib/estilos-texto";

/**
 * Un texto en HTML con sus emojis como los pone el render: el PNG de Noto,
 * de 1,15 em, avanzando 1,25 em y centrado en la mitad de la mayúscula.
 */
export function ConEmojis({ texto, fuente }: { texto: string; fuente: FuenteEstilo }) {
  if (!tieneEmoji(texto)) return <>{texto}</>;
  const aire = (AVANCE_EMOJI - LADO_EMOJI) / 2;
  // vertical-align mueve el borde de abajo de la imagen desde la base.
  const bajo = mitadMayusculaEm(fuente) - LADO_EMOJI / 2;
  return (
    <>
      {grafemas(texto).map(({ g, emoji }, i) =>
        emoji ? (
          // eslint-disable-next-line @next/next/no-img-element -- el PNG de Noto, el mismo que baja el render
          <img
            key={i}
            src={urlEmoji(g)}
            alt={g}
            draggable={false}
            style={{ display: "inline", width: `${LADO_EMOJI}em`, height: `${LADO_EMOJI}em`, margin: `0 ${aire}em`, verticalAlign: `${bajo}em` }}
          />
        ) : (
          g
        ),
      )}
    </>
  );
}
