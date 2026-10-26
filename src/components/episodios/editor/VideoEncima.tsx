"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Corte } from "@/lib/cortes";
import { momentoDelVideo, type VideoClip } from "@/lib/videos-clip";
import { useTiempo, type Reproductor } from "./reproductor";

/** Cuánto se puede correr el video de encima del clip mientras suena antes de ponerlo en su lugar. */
const DESFASE_SONANDO_SEG = 0.3;
/** En pausa (recorriendo la línea de tiempo), cuadro a cuadro. */
const DESFASE_QUIETO_SEG = 0.05;

/**
 * Un video sobre el clip en la vista previa (be#246): un `<video>` aparte que
 * sigue al reproductor del clip. En su tramo va al mismo segundo que en el
 * render (`momentoDelVideo`), a la velocidad del clip, y suena o reproduce o
 * pausa junto con él. Se escucha como en el render: Sin sonido, mudo;
 * Mezclado, con su volumen; Solo el video, igual (la voz del clip la calla
 * `useAudioDeVista`).
 *
 * Se mueve y se agranda como una imagen. A pantalla completa cubre todo y no
 * se agarra: deja pasar el toque para reproducir; se elige desde el panel o la
 * línea de tiempo.
 *
 * Si el navegador no lo puede reproducir (un MOV HEVC del iPhone en Chrome),
 * queda un recuadro que avisa que en el render sí sale.
 */
export function VideoEncima({
  video: v,
  indice,
  reproductor,
  clip,
  velocidad,
  anchoVista,
  altoVista,
  elegido,
  puedeEditar,
  onMover,
  onAgrandar,
}: {
  video: VideoClip;
  indice: number;
  reproductor: Reproductor;
  clip: { desde: number; hasta: number; cortes: readonly Corte[]; efectiva: number };
  velocidad: number;
  anchoVista: number;
  altoVista: number;
  elegido: boolean;
  puedeEditar: boolean;
  onMover: (e: React.PointerEvent) => void;
  onAgrandar: (e: React.PointerEvent) => void;
}) {
  const tr = useTranslations("editorVideos");
  const ref = useRef<HTMLVideoElement>(null);
  const [falla, setFalla] = useState(false);
  const t = useTiempo(reproductor.reloj);
  const visible = momentoDelVideo(v, t, clip) !== null;

  // Lo último, para el bucle.
  const ultimo = useRef({ v, clip, velocidad, elegido });
  ultimo.current = { v, clip, velocidad, elegido };

  // Una url nueva puede reproducirse aunque la anterior no.
  useEffect(() => setFalla(false), [v.url]);

  useEffect(() => {
    let id = 0;
    const paso = () => {
      const el = ref.current;
      const principal = reproductor.video.current;
      const e = ultimo.current;
      if (el && principal) {
        const m = momentoDelVideo(e.v, principal.currentTime, e.clip);
        const sonando = !principal.paused && !principal.ended && principal.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA;
        if (el.playbackRate !== e.velocidad) {
          el.defaultPlaybackRate = e.velocidad;
          el.playbackRate = e.velocidad;
        }
        // Fuera de su tramo, quieto; si está elegido se ve su primer cuadro.
        const objetivo = m ?? (e.elegido ? e.v.inicioSeg : null);
        if (m !== null && sonando) {
          if (!el.seeking && Math.abs(el.currentTime - m) > DESFASE_SONANDO_SEG) el.currentTime = m;
          if (el.paused) {
            void el.play().catch(() => {
              // Sin un toque del usuario el navegador no deja sonar: mudo, al menos se ve.
              el.muted = true;
              void el.play().catch(() => undefined);
            });
          }
        } else {
          if (!el.paused) el.pause();
          if (objetivo !== null && !el.seeking && Math.abs(el.currentTime - objetivo) > DESFASE_QUIETO_SEG) el.currentTime = objetivo;
        }
        const conSonido = m !== null && e.v.sonido !== "SIN_SONIDO" && e.v.tieneAudio;
        if (el.muted === conSonido) el.muted = !conSonido;
        // El `volume` del navegador no pasa de 1: más de 100 % se escucha al 100 % (el render sí lo sube).
        const vol = Math.min(1, Math.max(0, e.v.volumen));
        if (Math.abs(el.volume - vol) > 0.001) el.volume = vol;
      }
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => {
      cancelAnimationFrame(id);
      ref.current?.pause(); // eslint-disable-line react-hooks/exhaustive-deps
    };
  }, [reproductor.video]);

  const aspecto = `${Math.max(1, v.anchoVideo)} / ${Math.max(1, v.altoVideo)}`;
  // Fuera de su tramo y sin elegir, montado igual pero oculto: así está
  // cargado cuando le toca y no parpadea al aparecer.
  const oculto = !visible && !elegido;
  const completa = v.pantallaCompleta;
  const media = falla ? (
    <div className="flex h-full w-full items-center justify-center bg-black/70 p-2 text-center text-[10px] leading-tight text-white/80">
      {tr("seVeraEnElRender", { n: indice + 1 })}
    </div>
  ) : (
    <video
      ref={ref}
      src={v.url}
      muted
      playsInline
      preload="auto"
      draggable={false}
      onError={() => setFalla(true)}
      onLoadedMetadata={(e) => {
        // Algunos navegadores cargan un HEVC sin poder mostrarlo: sin cuadro, como si fallara.
        if (!e.currentTarget.videoWidth) setFalla(true);
      }}
      className={`pointer-events-none block h-full w-full select-none ${completa ? "object-cover" : "object-contain"}`}
    />
  );

  return (
    <div
      onPointerDown={completa ? undefined : onMover}
      onClick={completa ? undefined : (e) => e.stopPropagation()}
      className={`group absolute ${oculto ? "invisible" : ""} ${completa ? "pointer-events-none inset-0" : puedeEditar ? "cursor-move" : ""} ${
        elegido ? "outline-dashed outline-2 outline-offset-2 outline-ng-azul" : ""
      } ${visible ? "" : "opacity-40"}`}
      style={
        completa
          ? undefined
          : {
              left: v.centroX * anchoVista,
              top: v.centroY * altoVista,
              width: v.ancho * anchoVista,
              aspectRatio: aspecto,
              transform: "translate(-50%, -50%)",
            }
      }
    >
      {media}
      {puedeEditar && !completa && (
        <span
          onPointerDown={onAgrandar}
          className={`absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-ng-tinta bg-ng-azul ${
            elegido ? "block" : "hidden group-hover:block"
          }`}
        />
      )}
    </div>
  );
}
