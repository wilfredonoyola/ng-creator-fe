"use client";

import { useEffect, useRef, type RefObject } from "react";
import type Hls from "hls.js";

/**
 * Conecta un `<video>` a un HLS de Bunny.
 *
 * Safari reproduce HLS solo; Chrome y Firefox no, y para esos va hls.js, que
 * se carga recién acá porque pesa y solo lo usan las pantallas de episodios.
 * hls.js baja solo los segmentos cerca de donde se está reproduciendo: un clip
 * del minuto 90 no trae la hora y media anterior.
 */
export function useHls(
  video: RefObject<HTMLVideoElement>,
  url: string | null | undefined,
  /**
   * La mayor resolución que ofrece el HLS (con hls.js). El `videoWidth` del
   * `<video>` es la de la calidad que se está bajando, que puede ser menor:
   * la estimación de calidad del clip usa esta.
   */
  onResolucionMaxima?: (r: { ancho: number; alto: number }) => void,
) {
  const avisar = useRef(onResolucionMaxima);
  avisar.current = onResolucionMaxima;
  useEffect(() => {
    const el = video.current;
    if (!el || !url) return;
    let hls: Hls | null = null;
    let cancelado = false;

    // Un MP4 suelto (el de un clip ya renderizado) no necesita hls.js.
    if (!/\.m3u8(\?|$)/.test(url) || el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = url;
    } else {
      void import("hls.js").then(({ default: HlsJs }) => {
        if (cancelado || !HlsJs.isSupported()) return;
        hls = new HlsJs();
        hls.on(HlsJs.Events.MANIFEST_PARSED, (_e, data) => {
          const mayor = data.levels.reduce((m, l) => (l.width * l.height > m.ancho * m.alto ? { ancho: l.width, alto: l.height } : m), { ancho: 0, alto: 0 });
          if (mayor.ancho && mayor.alto) avisar.current?.(mayor);
        });
        hls.loadSource(url);
        hls.attachMedia(el);
      });
    }
    return () => {
      cancelado = true;
      hls?.destroy();
    };
  }, [video, url]);
}
