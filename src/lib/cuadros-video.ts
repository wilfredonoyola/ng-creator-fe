"use client";

import { useEffect, useState } from "react";

/**
 * Los cuadros de un video para dibujarlo en la línea de tiempo y en el panel
 * de Recortar, como en CapCut. Se sacan en el navegador: un `<video>` oculto
 * que salta a cada segundo y un canvas que guarda el cuadro como JPEG chico.
 *
 * Quedan en memoria por url mientras dure la página: el mismo video en la
 * pista y en el panel se mide una sola vez. Si el navegador no lo puede
 * mostrar (un MOV HEVC del iPhone en Chrome) o el servidor no deja leer los
 * píxeles (CORS), da null y se dibuja un color sólido.
 */
export interface Cuadro {
  /** El segundo del archivo que muestra. */
  seg: number;
  src: string;
}

/** El alto de cada cuadro (el doble de la pista, para pantallas retina). */
const ALTO_PX = 64;
/** Cuánto se espera cada paso (cargar, saltar) antes de darlo por perdido. */
const ESPERA_MS = 12_000;

const memoria = new Map<string, Promise<Cuadro[] | null>>();

/** Cuántos cuadros: uno cada ~2 s, entre 4 y 16. */
export const cuantosCuadros = (duracionSeg: number) => Math.min(16, Math.max(4, Math.ceil(duracionSeg / 2)));

function esperar(video: HTMLVideoElement, evento: "loadeddata" | "seeked"): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const listo = () => {
      limpiar();
      resolver();
    };
    const falla = () => {
      limpiar();
      rechazar(new Error("video"));
    };
    const tope = setTimeout(falla, ESPERA_MS);
    function limpiar() {
      clearTimeout(tope);
      video.removeEventListener(evento, listo);
      video.removeEventListener("error", falla);
    }
    video.addEventListener(evento, listo);
    video.addEventListener("error", falla);
  });
}

async function sacarCuadros(url: string, duracionSeg: number): Promise<Cuadro[] | null> {
  if (typeof document === "undefined") return null;
  const video = document.createElement("video");
  // Sin esto el canvas queda "manchado" y no se puede leer.
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    const cargado = esperar(video, "loadeddata");
    video.src = url;
    await cargado;
    // Algunos navegadores cargan un HEVC sin poder mostrarlo: sin cuadro.
    if (!video.videoWidth || !video.videoHeight) return null;
    const dura = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : duracionSeg;
    const n = cuantosCuadros(dura);
    const canvas = document.createElement("canvas");
    canvas.height = ALTO_PX;
    canvas.width = Math.max(8, Math.round((ALTO_PX * video.videoWidth) / video.videoHeight));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const cuadros: Cuadro[] = [];
    for (let i = 0; i < n; i++) {
      const seg = Math.min(Math.max(0, dura - 0.05), ((i + 0.5) * dura) / n);
      const salto = esperar(video, "seeked");
      video.currentTime = seg;
      await salto;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      cuadros.push({ seg, src: canvas.toDataURL("image/jpeg", 0.7) });
    }
    return cuadros;
  } catch {
    return null;
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

/** Los cuadros de `url`, de memoria si ya se sacaron. */
export function cuadrosDelVideo(url: string, duracionSeg: number): Promise<Cuadro[] | null> {
  let p = memoria.get(url);
  if (!p) {
    p = sacarCuadros(url, duracionSeg);
    memoria.set(url, p);
  }
  return p;
}

export type EstadoCuadros = { estado: "cargando" } | { estado: "listo"; cuadros: Cuadro[] } | { estado: "falla" };

export function useCuadrosDelVideo(url: string, duracionSeg: number): EstadoCuadros {
  const [r, setR] = useState<{ url: string; valor: EstadoCuadros }>({ url, valor: { estado: "cargando" } });
  useEffect(() => {
    let vivo = true;
    void cuadrosDelVideo(url, duracionSeg).then((cuadros) => {
      if (vivo) setR({ url, valor: cuadros?.length ? { estado: "listo", cuadros } : { estado: "falla" } });
    });
    return () => {
      vivo = false;
    };
  }, [url, duracionSeg]);
  return r.url === url ? r.valor : { estado: "cargando" };
}
