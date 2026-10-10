import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { estaCortado, siguienteTiempoVisible, type Corte } from "@/lib/cortes";

/**
 * Dónde está parado el video, en segundos del episodio. Es un almacén aparte
 * y no un estado de la página: cambia en cada cuadro mientras suena, y así
 * solo se vuelve a dibujar lo que lo mira (la vista previa, el cabezal de la
 * línea de tiempo), no el editor entero.
 */
export interface Reloj {
  get: () => number;
  set: (t: number) => void;
  subscribe: (cb: () => void) => () => void;
}

function crearReloj(inicial: number): Reloj {
  let t = inicial;
  const oyentes = new Set<() => void>();
  return {
    get: () => t,
    set: (nuevo) => {
      if (nuevo === t) return;
      t = nuevo;
      oyentes.forEach((cb) => cb());
    },
    subscribe: (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
  };
}

/** El segundo del episodio donde está el video. Vuelve a dibujar en cada cambio. */
export function useTiempo(reloj: Reloj): number {
  return useSyncExternalStore(reloj.subscribe, reloj.get, reloj.get);
}

export interface Reproductor {
  /** El único `<video>` del editor: lo monta el escenario. */
  video: RefObject<HTMLVideoElement>;
  reloj: Reloj;
  sonando: boolean;
  /** La proporción del video de la vista previa (no la resolución de la fuente). */
  fuente: { ancho: number; alto: number };
  alternar: () => void;
  /** Lleva el video a un segundo del episodio; si cae en un corte, al final del corte. */
  irAlEpisodio: (t: number) => void;
  /** Para el `<video>`: lo que hace falta escuchar. */
  eventos: {
    onPlay: () => void;
    onPause: () => void;
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  };
}

/**
 * Reproduce el tramo del clip: un solo bucle lee el tiempo, hace el loop del
 * tramo y salta los cortes. La vista previa dibuja con su propio bucle sobre
 * el mismo `<video>`.
 */
export function useReproductor({ desde, hasta, cortes }: { desde: number; hasta: number; cortes: Corte[] }): Reproductor {
  const video = useRef<HTMLVideoElement>(null);
  const reloj = useMemo(() => crearReloj(desde), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [sonando, setSonando] = useState(false);
  const [fuente, setFuente] = useState({ ancho: 1280, alto: 720 });
  // Lo último, para leerlo desde el bucle sin reiniciarlo.
  const tramo = useRef({ desde, hasta, cortes });
  tramo.current = { desde, hasta, cortes };

  // Al cambiar el inicio, al principio del clip.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const inicio = siguienteTiempoVisible(desde, tramo.current.cortes);
    el.currentTime = inicio;
    reloj.set(inicio);
  }, [desde, reloj]);

  useEffect(() => {
    let id = 0;
    const paso = () => {
      const v = video.current;
      const e = tramo.current;
      if (v) {
        // Los cortes se saltan: si el video entra en uno (o está por entrar,
        // un cuadro antes), va al final del corte. Mientras un salto no
        // termina no se pide otro, para no trabar el HLS.
        if (!v.paused && !v.seeking) {
          const ahora = v.currentTime;
          let destino: number | null = null;
          if (ahora >= e.hasta || ahora < e.desde - 0.5) destino = siguienteTiempoVisible(e.desde, e.cortes);
          else if (estaCortado(ahora + 0.03, e.cortes)) {
            destino = siguienteTiempoVisible(ahora + 0.03, e.cortes);
            if (destino >= e.hasta) destino = siguienteTiempoVisible(e.desde, e.cortes);
          }
          if (destino !== null && Math.abs(destino - ahora) > 0.01) v.currentTime = destino;
        }
        reloj.set(v.currentTime);
      }
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [reloj]);

  const alternar = useCallback(() => {
    const v = video.current;
    if (!v) return;
    const { desde: d, hasta: h, cortes: c } = tramo.current;
    if (v.paused) {
      if (v.currentTime < d || v.currentTime >= h) v.currentTime = siguienteTiempoVisible(d, c);
      else if (estaCortado(v.currentTime, c)) v.currentTime = siguienteTiempoVisible(v.currentTime, c);
      void v.play().catch(() => setSonando(false));
    } else {
      v.pause();
    }
  }, []);

  const irAlEpisodio = useCallback(
    (t: number) => {
      const v = video.current;
      if (!v) return;
      const { desde: d, hasta: h, cortes: c } = tramo.current;
      const destino = siguienteTiempoVisible(Math.min(Math.max(t, d), h), c);
      v.currentTime = destino >= h ? siguienteTiempoVisible(d, c) : destino;
      reloj.set(v.currentTime);
    },
    [reloj],
  );

  const eventos = useMemo(
    () => ({
      onPlay: () => setSonando(true),
      onPause: () => setSonando(false),
      onLoadedMetadata: (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const v = e.currentTarget;
        if (v.videoWidth && v.videoHeight) setFuente({ ancho: v.videoWidth, alto: v.videoHeight });
        v.currentTime = tramo.current.desde;
      },
    }),
    [],
  );

  return { video, reloj, sonando, fuente, alternar, irAlEpisodio, eventos };
}
