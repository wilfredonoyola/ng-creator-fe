import { useEffect, useRef } from "react";
import { aTiempoDeSalida, estaCortado, type Corte } from "@/lib/cortes";
import type { EfectoClip, MusicaClip } from "@/lib/sonidos";
import type { Reproductor } from "./reproductor";
import type { Palabra } from "./tipos";

/** Cuánto se puede correr la música del video antes de volver a ponerla en su lugar. */
const DESFASE_MAX_SEG = 0.35;
/** Cuánto baja la música mientras hablan (aproximado: el render usa un compresor). */
const BAJADA_AL_HABLAR = 0.35;
/** Un salto del cabezal más grande que esto es un seek o un corte: no dispara efectos. */
const SALTO_SEG = 0.5;

/** ¿Hay una palabra en este segundo del episodio? Con un margen, para que no suba entre palabra y palabra. */
function hablando(palabras: readonly Palabra[], t: number): boolean {
  return palabras.some((p) => t >= p.desde - 0.15 && t <= p.hasta + 0.35);
}

/**
 * Que la vista previa se escuche como va a salir (Tanda 2):
 *
 * - El video, a la velocidad del clip (sin cambiar el tono) y con el volumen
 *   de la voz (el navegador no pasa de 100 %: el render sí).
 * - La música en un `<audio>` aparte, en loop y en el tiempo del MP4 (no se
 *   acelera): sigue al video al reproducir, pausar, hacer seek o saltar un
 *   corte. Con "bajar cuando hablan", baja donde hay palabras.
 * - Cada efecto suena cuando el cabezal pasa por su segundo (tiempo original;
 *   en un corte no suena).
 *
 * Un solo bucle mira el `<video>` y corrige todo: por eso no se desfasa al
 * cambiar de herramienta ni si el HLS se vuelve a enganchar. Vive en la página
 * del editor, que no se desmonta al cambiar de herramienta.
 */
export function useAudioDeVista(o: {
  reproductor: Reproductor;
  desde: number;
  hasta: number;
  cortes: Corte[];
  volumenClip: number;
  velocidad: number;
  musica: MusicaClip | null;
  efectos: EfectoClip[];
  palabras: Palabra[];
}) {
  const ultimo = useRef(o);
  ultimo.current = o;
  const musicaEl = useRef<HTMLAudioElement | null>(null);
  const efectosEl = useRef(new Map<string, HTMLAudioElement>());
  const { video } = o.reproductor;

  // La música: un `<audio>` por pista elegida.
  const urlMusica = o.musica?.url ?? null;
  useEffect(() => {
    if (!urlMusica) return;
    const a = new Audio(urlMusica);
    a.loop = true;
    a.preload = "auto";
    musicaEl.current = a;
    return () => {
      a.pause();
      a.removeAttribute("src");
      a.load();
      if (musicaEl.current === a) musicaEl.current = null;
    };
  }, [urlMusica]);

  // Los efectos: uno por efecto del clip, ya cargados para que suenen a tiempo.
  const claveEfectos = o.efectos.map((e) => `${e.id}|${e.url}`).join(",");
  useEffect(() => {
    const pool = efectosEl.current;
    const vigentes = new Map(ultimo.current.efectos.map((e) => [e.id, e.url]));
    pool.forEach((a, id) => {
      if (vigentes.get(id) !== a.dataset.url) {
        a.pause();
        pool.delete(id);
      }
    });
    vigentes.forEach((url, id) => {
      if (pool.has(id)) return;
      const a = new Audio(url);
      a.preload = "auto";
      a.dataset.url = url;
      pool.set(id, a);
    });
  }, [claveEfectos]);

  useEffect(() => {
    const pool = efectosEl.current;
    return () => {
      pool.forEach((a) => a.pause());
      pool.clear();
    };
  }, []);

  useEffect(() => {
    let id = 0;
    let antes: number | null = null;
    let volumenMusica = ultimo.current.musica?.volumen ?? 0;
    const paso = () => {
      const v = video.current;
      const e = ultimo.current;
      if (v) {
        // El video: velocidad y volumen. Se corrige en cada cuadro porque el
        // HLS, al engancharse de nuevo, vuelve la velocidad a 1.
        if (v.playbackRate !== e.velocidad) {
          v.defaultPlaybackRate = e.velocidad;
          v.playbackRate = e.velocidad;
        }
        if (!v.preservesPitch) v.preservesPitch = true;
        const volumen = Math.min(1, Math.max(0, e.volumenClip));
        if (Math.abs(v.volume - volumen) > 0.001) v.volume = volumen;
        const mudo = e.volumenClip === 0;
        if (v.muted !== mudo) v.muted = mudo;

        const sonando = !v.paused && !v.ended;
        const t = v.currentTime;

        // La música, en el tiempo del MP4: la salida (sin cortes) dividida por la velocidad.
        const a = musicaEl.current;
        if (a && e.musica) {
          if (sonando) {
            const ts = aTiempoDeSalida(Math.min(Math.max(t, e.desde), e.hasta), e.desde, e.cortes) / e.velocidad;
            if (Number.isFinite(a.duration) && a.duration > 0) {
              const objetivo = ts % a.duration;
              if (Math.abs(a.currentTime - objetivo) > DESFASE_MAX_SEG) a.currentTime = objetivo;
            }
            if (a.paused) void a.play().catch(() => undefined);
          } else if (!a.paused) {
            a.pause();
          }
          const objetivo = e.musica.volumen * (e.musica.bajarAlHablar && hablando(e.palabras, t) ? BAJADA_AL_HABLAR : 1);
          // Suave, como el compresor del render: no salta de golpe.
          volumenMusica += (objetivo - volumenMusica) * 0.12;
          const vm = Math.min(1, Math.max(0, volumenMusica));
          if (Math.abs(a.volume - vm) > 0.002) a.volume = vm;
        }

        // Los efectos: suenan al pasar el cabezal por su segundo.
        const tc = t - e.desde;
        const pool = efectosEl.current;
        if (!sonando) {
          pool.forEach((x) => {
            if (!x.paused) x.pause();
          });
        } else {
          // La ventana que recorrió el cabezal desde el cuadro anterior. Al
          // arrancar o al volver atrás (el loop del tramo, un seek), los que
          // sonaban se cortan y cuenta desde acá.
          const avance = antes === null ? null : tc - antes;
          let desdeVentana: number | null = null;
          if (avance === null || avance < -0.05) {
            if (avance !== null) {
              pool.forEach((x) => {
                if (!x.paused) x.pause();
              });
            }
            desdeVentana = tc - 0.05;
          } else if (avance > 0 && avance < SALTO_SEG) {
            desdeVentana = antes;
          }
          if (desdeVentana !== null) {
            for (const ef of e.efectos) {
              if (ef.enSeg > desdeVentana && ef.enSeg <= tc && !estaCortado(e.desde + ef.enSeg, e.cortes)) {
                const x = pool.get(ef.id);
                if (!x) continue;
                x.volume = Math.min(1, Math.max(0, ef.volumen));
                x.currentTime = 0;
                void x.play().catch(() => undefined);
              }
            }
          }
        }
        antes = sonando ? tc : null;
      }
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => {
      cancelAnimationFrame(id);
      musicaEl.current?.pause();
    };
  }, [video]);
}
