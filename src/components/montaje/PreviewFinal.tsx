"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  geometriaCamara,
  guionDeCamara,
  lineasDeTexto,
  ubicacionEnLienzo,
  type Montaje,
} from "@/lib/montaje";

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
  urlsPorRuta,
  duracionBase,
  sonido = false,
}: {
  montaje: Montaje;
  src: string | null;
  aspectoFuente: number;
  registrarVideo: (v: HTMLVideoElement | null) => void;
  /** Dónde mirar cada grabación, por ruta. Sin URL no se dibuja nada. */
  urlsPorRuta?: Record<string, string>;
  duracionBase?: number;
  /**
   * Si se escucha. El preview es la unica fuente de audio de la pantalla.
   *
   * No suena el video del editor: ese sigue corriendo durante una pausa, cuando
   * justamente NO tiene que oirse nada del original. Acá el sonido acompaña a lo
   * que se ve, que es de lo que se trata escuchar antes de generar.
   */
  sonido?: boolean;
}) {
  const { lienzo, recorte, fondo } = montaje;
  const ubic = ubicacionEnLienzo(montaje, aspectoFuente);

  const pctAncho = (n: number) => `${(n / lienzo.ancho) * 100}%`;
  const pctAlto = (n: number) => `${(n / lienzo.alto) * 100}%`;

  const lienzoRef = useRef<HTMLDivElement>(null);
  const circulo = useRef<HTMLDivElement>(null);
  /** Un <video> por grabación distinta, por ruta. */
  const camaras = useRef<Map<string, HTMLVideoElement>>(new Map());

  const guion = useMemo(
    () =>
      montaje.camara && duracionBase
        ? guionDeCamara(montaje.momentos, duracionBase)
        : [],
    [montaje.camara, montaje.momentos, duracionBase],
  );

  /**
   * Las grabaciones distintas que hacen falta dibujar.
   *
   * Se monta un <video> por cada una en vez de cambiarle el `src` a uno solo:
   * cambiar la fuente obliga al navegador a recargar, y en un preview eso es un
   * parpadeo negro justo en el corte entre dos momentos.
   */
  const fuentes = useMemo(() => {
    const rutas: string[] = [];
    for (const m of guion) {
      const r = m.origenStoragePath ?? montaje.camara?.origenStoragePath;
      if (r && urlsPorRuta?.[r] && !rutas.includes(r)) rutas.push(r);
    }
    return rutas;
  }, [guion, montaje.camara, urlsPorRuta]);

  /**
   * Mueve el círculo siguiendo al video base, cuadro a cuadro.
   *
   * Va por `requestAnimationFrame` y escribiendo estilos a mano en vez de por
   * estado de React: un fundido de 0.3s pasa por unos veinte cuadros, y
   * re-renderizar el panel entero en cada uno para mover un div es tirar
   * trabajo a la basura.
   *
   * Las PAUSAS son la parte que no se puede aproximar. En el render el video
   * base se CONGELA y el círculo crece; si acá siguiera corriendo, el preview
   * mostraría una duración que no es la que dice "Duración final" y el momento
   * más importante —la persona hablando sobre la imagen quieta— se vería mal.
   * Así que se pausan los videos base de verdad, se deja correr la toma, y se
   * los suelta al terminar.
   */
  useEffect(() => {
    const marco = circulo.current;
    if (!marco || !montaje.camara || !guion.length) return;

    const bases = () =>
      Array.from(
        lienzoRef.current?.querySelectorAll<HTMLVideoElement>(
          "video[data-base]",
        ) ?? [],
      );

    // Pausas ya reproducidas en esta pasada, para no repetirlas al volver a
    // cruzar el mismo segundo. Se limpian si alguien retrocede o el video
    // vuelve a empezar.
    const hechas = new Set<string>();
    let enPausa: { m: (typeof guion)[number]; hasta: number } | null = null;
    let anterior = 0;
    let vivo = true;

    const camDe = (m: (typeof guion)[number]) => {
      const r = m.origenStoragePath ?? montaje.camara?.origenStoragePath;
      return r ? (camaras.current.get(r) ?? null) : null;
    };

    /** Solo una grabación a la vista; el resto ocultas y quietas. */
    const soloEsta = (activo: HTMLVideoElement | null) => {
      camaras.current.forEach((v) => {
        const suya = v === activo;
        v.style.display = suya ? "block" : "none";
        if (!suya && !v.paused) v.pause();
      });
    };

    const ocultar = () => {
      marco.style.opacity = "0";
      soloEsta(null);
    };

    const colocar = (pausa: boolean, opacidad: number) => {
      const g = geometriaCamara(montaje.camara!, lienzo, pausa);
      marco.style.left = `${(g.x / lienzo.ancho) * 100}%`;
      marco.style.top = `${(g.y / lienzo.alto) * 100}%`;
      marco.style.width = `${(g.ancho / lienzo.ancho) * 100}%`;
      marco.style.height = `${(g.alto / lienzo.alto) * 100}%`;
      // En pausa la cámara ocupa el lienzo entero y no va recortada en círculo.
      marco.style.borderRadius = g.redonda ? "9999px" : "0";
      marco.style.opacity = String(opacidad);
    };

    const paso = () => {
      if (!vivo) return;
      const base = bases()[0];

      if (enPausa) {
        // El congelado corre en tiempo real, no en tiempo de video: el base
        // esta detenido y no hay `currentTime` que consultar.
        if (performance.now() >= enPausa.hasta) {
          hechas.add(enPausa.m.id);
          enPausa = null;
          ocultar();
          bases().forEach((v) => void v.play().catch(() => {}));
        } else {
          colocar(true, 1);
        }
        requestAnimationFrame(paso);
        return;
      }

      if (!base) {
        ocultar();
        requestAnimationFrame(paso);
        return;
      }

      const t = base.currentTime;
      if (t < anterior - 0.3) hechas.clear(); // retrocedio o volvio a empezar
      anterior = t;

      // Una pausa se dispara al cruzar su segundo, y solo con el video andando:
      // arrastrando la aguja uno esta buscando un cuadro, no mirando.
      const pausa = guion.find(
        (m) =>
          m.tipo === "PAUSA" &&
          !hechas.has(m.id) &&
          t >= m.desdeSeg &&
          t < m.desdeSeg + 0.4,
      );
      if (pausa && !base.paused) {
        const cam = camDe(pausa);
        if (!cam) {
          requestAnimationFrame(paso);
          return;
        }
        bases().forEach((v) => v.pause());
        soloEsta(cam);
        cam.currentTime = pausa.tramo.desde;
        void cam.play().catch(() => {});
        enPausa = { m: pausa, hasta: performance.now() + pausa.duracionSeg * 1000 };
        colocar(true, 1);
        requestAnimationFrame(paso);
        return;
      }

      const ap = guion.find(
        (m) =>
          m.tipo === "APARICION" &&
          t >= m.desdeSeg &&
          t <= m.desdeSeg + m.duracionSeg,
      );
      if (!ap) {
        // Con el video detenido el circulo no cae en ningun momento y el panel
        // se veia igual que antes: sin nada. Peor todavia, el slider de tamaño
        // no daba ninguna respuesta, que es justo para lo que se mira acá.
        //
        // Asi que quieto se dibuja como GUIA, apagado, para que se lea "va a ir
        // aca" y no "esto esta pasando ahora". Andando manda la linea de tiempo.
        if (base.paused) {
          const enPunto = guion.find(
            (m) => m.tipo === "PAUSA" && Math.abs(t - m.desdeSeg) < 0.4,
          );
          // La guía muestra la toma del momento mas cercano, o la primera que
          // haya: sirve para acomodar tamaño y encuadre, no para ser exacta.
          soloEsta(camDe(enPunto ?? guion[0]));
          colocar(Boolean(enPunto), 0.55);
          camaras.current.forEach((v) => !v.paused && v.pause());
        } else {
          ocultar();
        }
        requestAnimationFrame(paso);
        return;
      }

      // El mismo fundido de 0.3s que aplica el render sobre el alfa.
      const dentro = t - ap.desdeSeg;
      const restante = ap.duracionSeg - dentro;
      const opacidad = Math.min(1, Math.min(dentro, restante) / 0.3);

      const cam = camDe(ap);
      if (!cam) {
        ocultar();
        requestAnimationFrame(paso);
        return;
      }
      soloEsta(cam);

      const objetivo = ap.tramo.desde + dentro;
      // Solo se corrige si se fue lejos: reescribir `currentTime` en cada cuadro
      // hace que el video tartamudee en vez de reproducirse.
      if (Math.abs(cam.currentTime - objetivo) > 0.35) cam.currentTime = objetivo;
      // La toma sigue al base: si alguien detiene el preview o arrastra la
      // aguja, el circulo se queda quieto en vez de seguir hablando solo.
      if (base.paused && !cam.paused) cam.pause();
      else if (!base.paused && cam.paused) void cam.play().catch(() => {});

      colocar(false, Math.max(0, opacidad));
      requestAnimationFrame(paso);
    };

    // Safari no pinta un cuadro hasta que se busca uno: sin este empujón la
    // guía se ve como un círculo negro hasta la primera reproducción.
    const primerCuadro = (e: Event) => {
      const v = e.target as HTMLVideoElement;
      if (v.currentTime === 0) v.currentTime = 0.05;
    };
    const todas = [...camaras.current.values()];
    todas.forEach((v) => {
      v.addEventListener("loadeddata", primerCuadro);
      if (v.readyState >= 2 && v.currentTime === 0) v.currentTime = 0.05;
    });

    const id = requestAnimationFrame(paso);
    return () => {
      vivo = false;
      cancelAnimationFrame(id);
      todas.forEach((v) => v.removeEventListener("loadeddata", primerCuadro));
      // Si el componente se va en medio de una pausa, los videos base quedarian
      // detenidos para siempre.
      if (enPausa) bases().forEach((v) => void v.play().catch(() => {}));
    };
  }, [urlsPorRuta, montaje.camara, guion, lienzo, fuentes]);

  return (
    <div
      ref={lienzoRef}
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
          data-base
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
            data-base
            src={src}
            // El unico que lleva el audio del video base: el fondo desenfocado
            // es una copia del mismo archivo y sonarian los dos encimados.
            muted={!sonido}
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

      {/* La cámara. Va debajo de los titulares y encima del video, que es el
          orden del render: el círculo tapa la imagen, el texto tapa al círculo.
          Arranca invisible; quien la muestra y la mueve es el bucle de arriba. */}
      {fuentes.length > 0 && montaje.camara && (
        <div
          ref={circulo}
          className="pointer-events-none absolute overflow-hidden"
          style={{ opacity: 0, borderRadius: "9999px" }}
        >
          {fuentes.map((ruta) => (
            <video
              key={ruta}
              ref={(v) => {
                if (v) camaras.current.set(ruta, v);
                else camaras.current.delete(ruta);
              }}
              src={urlsPorRuta?.[ruta]}
              muted={!sonido}
              playsInline
              preload="auto"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ display: "none" }}
            />
          ))}
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
