"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Escuchar un sonido antes de elegirlo: un solo reproductor para toda la
 * lista, así tocar otro corta el anterior. `alSonar` avisa cuando empieza uno
 * (el editor pausa el video para que no se mezclen).
 */
export function useEscucha(alSonar?: () => void) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [sonando, setSonando] = useState<string | null>(null);
  const aviso = useRef(alSonar);
  aviso.current = alSonar;
  // Para leerlo desde `alternar` sin recrearlo.
  const sonandoRef = useRef(sonando);
  sonandoRef.current = sonando;

  useEffect(
    () => () => {
      audio.current?.pause();
      audio.current = null;
    },
    [],
  );

  const parar = useCallback(() => {
    audio.current?.pause();
    setSonando(null);
  }, []);

  /** Suena `url` (con la clave `id`); si ya sonaba, la para. */
  const alternar = useCallback((id: string, url: string) => {
    let a = audio.current;
    if (!a) {
      a = new Audio();
      a.preload = "none";
      a.onended = () => setSonando(null);
      a.onerror = () => setSonando(null);
      audio.current = a;
    }
    if (sonandoRef.current === id && !a.paused) {
      a.pause();
      setSonando(null);
      return;
    }
    a.pause();
    a.src = url;
    a.currentTime = 0;
    setSonando(id);
    aviso.current?.();
    void a.play().catch(() => setSonando(null));
  }, []);

  return { sonando, alternar, parar };
}
