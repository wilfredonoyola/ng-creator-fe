"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useHls } from "@/lib/use-hls";
import {
  GANCHO,
  LIENZOS,
  medidasSubtitulo,
  recorteDelCuadro,
  type Encuadre,
  type FormatoClip,
} from "@/lib/clip-encuadre";

export interface LineaSubtitulo {
  desde: number;
  hasta: number;
  palabras: { texto: string; desde: number; hasta: number }[];
}

export interface EstiloClip {
  colorSubtitulo: string;
  colorResaltado: string;
  colorGancho: string;
  colorContornoGancho: string;
}

/**
 * La vista previa de un clip: el tramo del episodio, recortado y con gancho y
 * subtítulos, como va a salir del render.
 *
 * Coincide con el MP4 por construcción, no por parecido:
 * - El recorte sale de `recorteDelCuadro`, la misma cuenta que usa ffmpeg.
 * - Las líneas de subtítulo llegan calculadas del backend, del mismo código
 *   que arma el ASS; acá solo se dibujan. La palabra resaltada es la última
 *   que empezó, igual que en el ASS.
 * - Todo se mide en píxeles del lienzo (1080 de ancho) y se escala al tamaño
 *   de pantalla, como en la vista previa del montaje.
 *
 * No carga el episodio entero: hls.js pide solo los segmentos del tramo.
 */
export function VistaPreviaClip({
  url,
  desde,
  hasta,
  formato,
  encuadre,
  lineas,
  gancho,
  estilo,
}: {
  url: string;
  desde: number;
  hasta: number;
  formato: FormatoClip;
  encuadre: Encuadre;
  lineas: LineaSubtitulo[];
  gancho: { texto: string; activo: boolean; seg: number };
  estilo: EstiloClip;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const marco = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [fuente, setFuente] = useState({ ancho: 1280, alto: 720 });
  const [t, setT] = useState(desde);
  const [sonando, setSonando] = useState(false);
  useHls(video, url);

  const lienzo = LIENZOS[formato];
  const alto = (ancho * lienzo.alto) / lienzo.ancho;
  const k = ancho / lienzo.ancho;

  useLayoutEffect(() => {
    const el = marco.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setAncho(el.clientWidth));
    obs.observe(el);
    setAncho(el.clientWidth);
    return () => obs.disconnect();
  }, [formato]);

  // Al cambiar el inicio, a ver el principio del clip.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    el.currentTime = desde;
    setT(desde);
  }, [desde]);

  // El tiempo se lee cuadro a cuadro mientras suena: `timeupdate` avisa unas
  // cuatro veces por segundo, y un subtítulo que cambia de palabra así se ve
  // a los saltos. Al llegar al final vuelve al principio.
  useEffect(() => {
    if (!sonando) return;
    let id = 0;
    const paso = () => {
      const el = video.current;
      if (el) {
        if (el.currentTime >= hasta || el.currentTime < desde - 0.5) el.currentTime = desde;
        setT(el.currentTime);
      }
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [sonando, desde, hasta]);

  function alternar() {
    const el = video.current;
    if (!el) return;
    if (el.paused) {
      if (el.currentTime < desde || el.currentTime >= hasta) el.currentTime = desde;
      void el.play().catch(() => setSonando(false));
    } else {
      el.pause();
    }
  }

  const r = recorteDelCuadro(fuente, formato, encuadre);
  const anchoVideo = ancho / r.ancho;
  const altoVideo = alto / r.alto;

  const tc = t - desde;
  const linea = lineas.find((l) => tc >= l.desde && tc < l.hasta);
  let activa = 0;
  linea?.palabras.forEach((p, i) => {
    if (p.desde <= tc) activa = i;
  });
  const { cuerpo, margenAbajo } = medidasSubtitulo(lienzo);
  const contorno = Math.max(3, Math.round(cuerpo * 0.14));
  const verGancho = gancho.activo && gancho.texto.trim() && tc < gancho.seg;

  return (
    <div>
      <div
        ref={marco}
        onClick={alternar}
        className="relative mx-auto cursor-pointer overflow-hidden rounded-xl bg-black"
        style={{
          aspectRatio: `${lienzo.ancho} / ${lienzo.alto}`,
          maxHeight: "70vh",
          // Con alto tope, el ancho sale de la proporción.
          maxWidth: `calc(70vh * ${lienzo.ancho / lienzo.alto})`,
        }}
      >
        <video
          ref={video}
          playsInline
          muted={false}
          onPlay={() => setSonando(true)}
          onPause={() => setSonando(false)}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth && v.videoHeight) setFuente({ ancho: v.videoWidth, alto: v.videoHeight });
            v.currentTime = desde;
          }}
          className="absolute max-w-none"
          style={{
            width: anchoVideo,
            height: altoVideo,
            left: -r.x * anchoVideo,
            top: -r.y * altoVideo,
            objectFit: "fill",
          }}
        />

        {verGancho && (
          <div
            className="pointer-events-none absolute inset-x-0 text-center uppercase leading-[1.1]"
            style={{
              top: GANCHO.centroY * alto,
              transform: "translateY(-50%)",
              padding: `0 ${lienzo.ancho * 0.05 * k}px`,
              fontFamily: "'Arial Black', 'Arial', sans-serif",
              fontWeight: 900,
              fontSize: GANCHO.tamano * k,
              color: estilo.colorGancho,
              WebkitTextStroke: `${GANCHO.grosorContorno * k}px ${estilo.colorContornoGancho}`,
              paintOrder: "stroke fill",
            }}
          >
            {gancho.texto}
          </div>
        )}

        {linea && (
          <div
            className="pointer-events-none absolute inset-x-0 text-center"
            style={{
              bottom: margenAbajo * k,
              padding: `0 ${60 * k}px`,
              fontFamily: "'Nunito Black', sans-serif",
              fontWeight: 900,
              fontSize: cuerpo * k,
              lineHeight: 1.15,
              color: estilo.colorSubtitulo,
              WebkitTextStroke: `${2 * contorno * k}px #000`,
              paintOrder: "stroke fill",
            }}
          >
            {linea.palabras.map((p, i) => (
              <span key={`${p.desde}-${i}`} style={i === activa ? { color: estilo.colorResaltado } : undefined}>
                {i > 0 ? " " : ""}
                {p.texto}
              </span>
            ))}
          </div>
        )}

        {!sonando && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="rounded-full bg-black/60 px-4 py-2 text-sm text-white">▶ Reproducir</span>
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-xs tabular-nums text-white/45">
        {Math.max(0, tc).toFixed(1)} s de {(hasta - desde).toFixed(1)} s
      </p>
    </div>
  );
}
