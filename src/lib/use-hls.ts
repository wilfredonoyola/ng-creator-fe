"use client";

import { useEffect, type RefObject } from "react";
import type Hls from "hls.js";
import { CONFIG_HLS_VISTA_PREVIA, indiceVarianteMasAlta } from "./hls-variante";

/**
 * Conecta un `<video>` a un HLS de Bunny.
 *
 * Safari reproduce HLS solo; Chrome y Firefox no, y para esos va hls.js, que
 * se carga recién acá porque pesa y solo lo usan las pantallas de episodios.
 * hls.js baja solo los segmentos cerca de donde se está reproduciendo: un clip
 * del minuto 90 no trae la hora y media anterior.
 *
 * Arranca en la variante más alta y no baja salvo que la conexión no dé (ver
 * `hls-variante.ts`). Safari elige solo la calidad del HLS nativo.
 */
export function useHls(video: RefObject<HTMLVideoElement>, url: string | null | undefined) {
  useEffect(() => {
    const el = video.current;
    if (!el || !url) return;
    let hls: Hls | null = null;
    let cancelado = false;

    // Un MP4 suelto (el de un clip ya renderizado) no necesita hls.js.
    if (!/\.m3u8(\?|$)/.test(url) || el.canPlayType("application/vnd.apple.mpegurl")) {
      // El HLS de Bunny Stream manda CORS: pedido así, el editor lo puede
      // pasar por Web Audio para subir la voz a más de 100 % (ver audioVista).
      // Un MP4 de otro lado puede no mandarlo, y con CORS no cargaría.
      if (/\.m3u8(\?|$)/.test(url)) el.crossOrigin = "anonymous";
      else el.removeAttribute("crossorigin");
      el.src = url;
    } else {
      void import("hls.js").then(({ default: HlsJs }) => {
        if (cancelado || !HlsJs.isSupported()) return;
        const h = new HlsJs(CONFIG_HLS_VISTA_PREVIA);
        hls = h;
        h.on(HlsJs.Events.MANIFEST_PARSED, (_e, data) => {
          const alta = indiceVarianteMasAlta(data.levels);
          if (alta >= 0) h.startLevel = alta;
        });
        h.loadSource(url);
        h.attachMedia(el);
      });
    }
    return () => {
      cancelado = true;
      hls?.destroy();
    };
  }, [video, url]);
}
