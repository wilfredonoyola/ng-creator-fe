"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type Hls from "hls.js";

/** Lo que la página le puede pedir al reproductor. */
export interface ControlReproductor {
  /** Reproduce solo el tramo `desde`-`hasta` (segundos del episodio) y se frena al final. */
  reproducirTramo: (desde: number, hasta: number) => void;
}

/**
 * El episodio desde Bunny, por HLS.
 *
 * Safari reproduce HLS solo; Chrome y Firefox no, y para esos va hls.js. Se
 * carga recién al montar porque pesa y solo lo usa esta pantalla.
 *
 * Reproducir un clip es saltar a su inicio y frenar en su final: no hay un
 * archivo por clip todavía (eso lo hace el editor, #69). El tope lo vigila
 * `timeupdate`, que avisa unas cuatro veces por segundo, así que el corte cae
 * hasta un cuarto de segundo tarde. Para escuchar si un clip funciona alcanza.
 */
export const ReproductorEpisodio = forwardRef<
  ControlReproductor,
  { url: string; poster?: string | null }
>(function ReproductorEpisodio({ url, poster }, ref) {
  const video = useRef<HTMLVideoElement>(null);
  const tope = useRef<number | null>(null);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    let hls: Hls | null = null;
    let cancelado = false;

    if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = url;
    } else {
      void import("hls.js").then(({ default: HlsJs }) => {
        if (cancelado || !HlsJs.isSupported()) return;
        hls = new HlsJs();
        hls.loadSource(url);
        hls.attachMedia(el);
      });
    }
    return () => {
      cancelado = true;
      hls?.destroy();
    };
  }, [url]);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const vigilar = () => {
      if (tope.current !== null && el.currentTime >= tope.current) {
        el.pause();
        tope.current = null;
      }
    };
    // Si alguien mueve la barra a mano, deja de ser "el clip": sin tope.
    const soltar = () => {
      if (tope.current !== null && el.currentTime > tope.current) tope.current = null;
    };
    el.addEventListener("timeupdate", vigilar);
    el.addEventListener("seeked", soltar);
    return () => {
      el.removeEventListener("timeupdate", vigilar);
      el.removeEventListener("seeked", soltar);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    reproducirTramo(desde, hasta) {
      const el = video.current;
      if (!el) return;
      tope.current = hasta;
      el.currentTime = desde;
      void el.play().catch(() => {
        // El navegador puede negar el play sin un gesto; el usuario le da play.
      });
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
  }));

  return (
    <video
      ref={video}
      controls
      playsInline
      poster={poster ?? undefined}
      className="aspect-video w-full rounded-xl bg-black"
    />
  );
});
