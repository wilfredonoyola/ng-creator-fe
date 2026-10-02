"use client";

import { useId } from "react";
import type { Lienzo } from "@/lib/clip-encuadre";
import { FUENTES_ESTILO, type Dibujo, type Giro, type Trozo } from "@/lib/estilos-texto";

/**
 * Lo que arman `dibujarTexto` y `dibujarSubtitulos`, en un SVG con las
 * medidas del lienzo (1080×1920 en vertical): el navegador lo escala al tamaño
 * de la vista, así que todo va en los mismos píxeles que el render.
 *
 * Mismo orden de capas que el ASS: sombras suaves, cajas y texto; cada dibujo
 * encima del anterior (los subtítulos primero, después los textos).
 */
export function CapaDibujos({
  lienzo,
  dibujos,
  className = "pointer-events-none absolute inset-0 h-full w-full",
}: {
  lienzo: Lienzo;
  dibujos: (Dibujo | null | undefined)[];
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const validos = dibujos.filter((d): d is Dibujo => Boolean(d));
  // Un filtro por cada desenfoque distinto.
  const desenfoques = [...new Set(validos.flatMap((d) => d.sombras.map((s) => Math.round(s.desenfoque))))].filter((b) => b > 0);
  return (
    <svg viewBox={`0 0 ${lienzo.ancho} ${lienzo.alto}`} className={className} aria-hidden>
      {desenfoques.length > 0 && (
        <defs>
          {desenfoques.map((b) => (
            // libass: \blur es un desenfoque gaussiano; su desvío es más o menos la mitad.
            <filter key={b} id={`${id}-b${b}`} x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation={b / 2} />
            </filter>
          ))}
        </defs>
      )}
      {validos.map((d, n) =>
        d.opacidad <= 0 ? null : (
          <g key={n} opacity={d.opacidad}>
            {d.sombras.map((s, i) => (
              <TextoSvg key={`s${i}`} t={s} filtro={s.desenfoque >= 0.5 ? `url(#${id}-b${Math.round(s.desenfoque)})` : undefined} />
            ))}
            {d.formas.map((f, i) => (
              <rect
                key={`f${i}`}
                x={f.x}
                y={f.y}
                width={Math.max(0, f.ancho)}
                height={Math.max(0, f.alto)}
                rx={Math.max(0, Math.min(f.radio, f.ancho / 2, f.alto / 2))}
                fill={f.color}
                fillOpacity={f.opacidad}
                transform={girar(f.giro)}
              />
            ))}
            {d.trozos.map((t, i) =>
              t.sombra && t.sombra.opacidad > 0 ? (
                <g key={`d${i}`} opacity={t.sombra.opacidad}>
                  <TextoSvg
                    t={{ ...t, x: t.x + t.sombra.dx, base: t.base + t.sombra.dy, color: t.sombra.color, opacidad: 1, colorContorno: t.sombra.color, opacidadContorno: 1 }}
                  />
                </g>
              ) : null,
            )}
            {d.trozos.map((t, i) => (
              <TextoSvg key={`t${i}`} t={t} />
            ))}
          </g>
        ),
      )}
    </svg>
  );
}

const girar = (g?: Giro) => (g ? `rotate(${-g.grados} ${g.x} ${g.y})` : undefined);

function TextoSvg({ t, filtro }: { t: Trozo; filtro?: string }) {
  if (t.opacidad <= 0 && t.opacidadContorno <= 0) return null;
  const f = FUENTES_ESTILO[t.fuente] ?? FUENTES_ESTILO.NUNITO;
  const escala =
    t.escalaX !== 1 || t.escalaY !== 1
      ? `translate(${t.x} ${t.base}) scale(${t.escalaX} ${t.escalaY}) translate(${-t.x} ${-t.base})`
      : "";
  // Con \frz libass gira en sentido contrario a las agujas del reloj; SVG, a favor.
  const transform = [girar(t.giro), escala].filter(Boolean).join(" ") || undefined;
  return (
    <text
      x={t.x}
      y={t.base}
      transform={transform}
      filter={filtro}
      fontFamily={`"${f.familiaCss}", sans-serif`}
      fontWeight={f.peso}
      fontStyle={f.italica ? "italic" : "normal"}
      // libass mide la letra por la altura "win" de la fuente; CSS, por el em.
      fontSize={t.cuerpo * f.factorCss}
      fill={t.color}
      fillOpacity={t.opacidad}
      stroke={t.contorno > 0 ? t.colorContorno : undefined}
      strokeOpacity={t.contorno > 0 ? t.opacidadContorno : undefined}
      // \bord es lo que crece hacia afuera: el trazo de SVG va mitad y mitad.
      strokeWidth={t.contorno > 0 ? t.contorno * 2 : undefined}
      strokeLinejoin="round"
      paintOrder="stroke fill"
      style={{ letterSpacing: t.interletra ? `${t.interletra}px` : undefined, whiteSpace: "pre" }}
    >
      {t.texto}
    </text>
  );
}
