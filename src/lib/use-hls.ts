"use client";

import { useEffect, type RefObject } from "react";
import type Hls from "hls.js";

/**
 * Conecta un `<video>` a un HLS de Bunny.
 *
 * Safari reproduce HLS solo; Chrome y Firefox no, y para esos va hls.js, que
 * se carga recién acá porque pesa y solo lo usan las pantallas de episodios.
 * hls.js baja solo los segmentos cerca de donde se está reproduciendo: un clip
 * del minuto 90 no trae la hora y media anterior.
 */
export function useHls(video: RefObject<HTMLVideoElement>, url: string | null | undefined) {
  useEffect(() => {
    const el = video.current;
    if (!el || !url) return;
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
  }, [video, url]);
}
