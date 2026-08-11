"use client";

import { lineasDeTexto, ubicacionEnLienzo, type Montaje } from "@/lib/montaje";

/**
 * Cómo va a quedar el video, compuesto en el navegador.
 *
 * No corre ffmpeg: dibuja la misma composición con CSS y SVG a partir de los
 * mismos datos que después recibe el backend. Procesar el video en cada
 * movimiento de un slider sería inusable.
 *
 * Que coincida con la salida no depende de que este componente "imite" bien:
 * depende de que toda la matemática viva en `lib/montaje.ts` y de que el
 * backend aplique las mismas reglas. Acá solo se pinta.
 *
 * El texto va como SVG y no como HTML con `-webkit-text-stroke` porque ese
 * centra el trazo sobre el contorno de la letra, mientras que el render usa
 * `paint-order="stroke"`, que lo dibuja detrás. Con 6-8px de grosor la
 * diferencia se ve. Acá se usan los mismos atributos que el SVG del servidor.
 */
export function PreviewFinal({
  montaje,
  src,
  aspectoFuente,
  registrarVideo,
}: {
  montaje: Montaje;
  src: string | null;
  aspectoFuente: number;
  registrarVideo: (v: HTMLVideoElement | null) => void;
}) {
  const { lienzo, recorte, fondo } = montaje;
  const ubic = ubicacionEnLienzo(montaje, aspectoFuente);

  const pctAncho = (n: number) => `${(n / lienzo.ancho) * 100}%`;
  const pctAlto = (n: number) => `${(n / lienzo.alto) * 100}%`;

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl"
      style={{
        aspectRatio: `${lienzo.ancho} / ${lienzo.alto}`,
        backgroundColor: fondo.tipo === "SOLIDO" ? fondo.color : "#000",
      }}
    >
      {/* Fondo desenfocado: el cuadro completo ampliado, no el recorte. Es lo
          que da la sensación de que el video llena la pantalla. */}
      {src && fondo.tipo === "DESENFOQUE" && (
        <video
          ref={registrarVideo}
          src={src}
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          // El radio del boxblur de ffmpeg y el de CSS no son la misma escala;
          // /2 lo deja parecido a ojo. El preview del fondo es orientativo.
          style={{ filter: `blur(${fondo.desenfoque / 2}px)` }}
        />
      )}

      {/* El video recortado. La ventana recorta y el video de adentro se agranda
          y se corre para que la región elegida sea justo lo que se ve. */}
      {src && (
        <div
          className="absolute overflow-hidden"
          style={{
            left: pctAncho(ubic.x),
            top: pctAlto(ubic.y),
            width: pctAncho(ubic.ancho),
            height: pctAlto(ubic.alto),
          }}
        >
          <video
            ref={registrarVideo}
            src={src}
            muted
            loop
            playsInline
            className="absolute max-w-none"
            style={{
              width: `${100 / Math.max(recorte.ancho, 0.001)}%`,
              height: `${100 / Math.max(recorte.alto, 0.001)}%`,
              left: `${(-recorte.x * 100) / Math.max(recorte.ancho, 0.001)}%`,
              top: `${(-recorte.y * 100) / Math.max(recorte.alto, 0.001)}%`,
              objectFit: "fill",
            }}
          />
        </div>
      )}

      {!src && (
        <div className="flex h-full items-center justify-center px-6 text-center text-xs text-white/25">
          Cargá un video para ver el resultado
        </div>
      )}

      {/* Los titulares. El viewBox está en píxeles del lienzo, así que los
          valores que salen de lib/montaje.ts entran acá sin convertir nada. */}
      <svg
        viewBox={`0 0 ${lienzo.ancho} ${lienzo.alto}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {[montaje.textoSuperior, montaje.textoInferior].map((texto, i) =>
          lineasDeTexto(texto, lienzo).map((linea, j) => (
            <text
              key={`${i}-${j}`}
              x={lienzo.ancho / 2}
              y={linea.y}
              textAnchor="middle"
              fontFamily="'Arial Black', 'Arial', sans-serif"
              fontSize={texto.tamano}
              fontWeight={texto.peso}
              fill={texto.color}
              stroke={texto.colorContorno}
              strokeWidth={texto.grosorContorno}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              {linea.palabras.map((palabra, k) => (
                <tspan
                  key={k}
                  fill={palabra.destacada ? texto.colorDestacado : texto.color}
                >
                  {k > 0 ? " " : ""}
                  {palabra.texto}
                </tspan>
              ))}
            </text>
          )),
        )}
      </svg>
    </div>
  );
}
