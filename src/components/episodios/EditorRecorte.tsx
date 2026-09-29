"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useHls } from "@/lib/use-hls";
import {
  ajustarRegion,
  GANCHO,
  LIENZOS,
  medidasSubtitulo,
  panelesDe,
  posicionEn,
  posicionesEfectivas,
  REGION_MINIMA,
  type DisenoClip,
  type Encuadre,
  type FormatoClip,
  type PosicionEfectiva,
  type Region,
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

/** Colores de los recuadros, uno por panel, como en la vista previa. */
const COLORES = ["#0FED9D", "#A78BFA"];

/**
 * El recorte de un clip, como se trabaja en los editores de video: el cuadro
 * entero del episodio con los recuadros encima, que se arrastran y se
 * agrandan, y al lado la vista previa de cómo sale.
 *
 * Un solo `<video>` para las dos cosas. La vista previa no es otro video
 * sincronizado —que se desfasaría—: es un canvas que copia, cuadro a cuadro,
 * cada recuadro del mismo video a su panel. Y los recuadros salen de
 * `posicionesEfectivas`, la misma cuenta que usa el render, así que lo que se
 * ve es lo que sale en el MP4.
 *
 * Los cambios de encuadre en el tiempo son "posiciones": desde tal segundo del
 * clip, estos recuadros. Mover un recuadro edita la posición que rige donde
 * está parado el video.
 */
export function EditorRecorte({
  url,
  desde,
  hasta,
  formato,
  diseno,
  encuadre,
  posicionesGuardadas,
  onCambiarPosiciones,
  lineas,
  gancho,
  estilo,
  puedeEditar,
  debajoDeLaVista,
}: {
  url: string;
  /** Segundos del episodio. */
  desde: number;
  hasta: number;
  formato: FormatoClip;
  diseno: DisenoClip;
  /** El encuadre viejo: vale si no hay posiciones guardadas. */
  encuadre: Encuadre;
  /** Las guardadas, tal cual. Acá se vuelven efectivas con el tamaño real del video. */
  posicionesGuardadas: { desdeSeg: number; regiones: Region[] }[];
  /** Devuelve siempre la lista entera, ya efectiva. */
  onCambiarPosiciones: (p: PosicionEfectiva[]) => void;
  lineas: LineaSubtitulo[];
  gancho: { texto: string; activo: boolean; seg: number };
  estilo: EstiloClip;
  puedeEditar: boolean;
  debajoDeLaVista?: ReactNode;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const cuadro = useRef<HTMLDivElement>(null);
  const lienzoRef = useRef<HTMLCanvasElement>(null);
  const [fuente, setFuente] = useState({ ancho: 1280, alto: 720 });
  const [t, setT] = useState(desde);
  const [sonando, setSonando] = useState(false);
  const [anchoVista, setAnchoVista] = useState(0);
  const vista = useRef<HTMLDivElement>(null);
  useHls(video, url);

  const duracion = hasta - desde;
  const posiciones = posicionesEfectivas(
    { formato, diseno, encuadre, posiciones: posicionesGuardadas },
    fuente,
    duracion,
  );
  const tc = Math.min(Math.max(0, t - desde), duracion);
  const paneles = panelesDe(formato, diseno);
  const lienzo = LIENZOS[formato];
  const activa = posicionEn(posiciones, tc);
  const indiceActiva = posiciones.indexOf(activa);

  // Lo último, para leerlo desde el bucle de dibujo sin reiniciarlo.
  const estado = useRef({ posiciones, paneles, lienzo, desde, hasta });
  estado.current = { posiciones, paneles, lienzo, desde, hasta };

  useLayoutEffect(() => {
    const el = vista.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setAnchoVista(el.clientWidth));
    obs.observe(el);
    setAnchoVista(el.clientWidth);
    return () => obs.disconnect();
  }, [formato]);

  // Al cambiar el inicio, al principio del clip.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    el.currentTime = desde;
    setT(desde);
  }, [desde]);

  // Un solo bucle: lee el tiempo, hace el loop del tramo y dibuja la vista.
  useEffect(() => {
    let id = 0;
    const paso = () => {
      const v = video.current;
      const c = lienzoRef.current;
      const e = estado.current;
      if (v) {
        if (!v.paused && (v.currentTime >= e.hasta || v.currentTime < e.desde - 0.5)) {
          v.currentTime = e.desde;
        }
        setT(v.currentTime);
      }
      if (v && c && v.readyState >= 2 && v.videoWidth) {
        const ctx = c.getContext("2d");
        if (ctx) {
          const escala = c.width / e.lienzo.ancho;
          const pos = posicionEn(e.posiciones, v.currentTime - e.desde);
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, c.width, c.height);
          e.paneles.forEach((panel, i) => {
            const r = pos.regiones[i];
            if (!r) return;
            ctx.drawImage(
              v,
              r.x * v.videoWidth,
              r.y * v.videoHeight,
              r.ancho * v.videoWidth,
              r.alto * v.videoHeight,
              panel.x * escala,
              panel.y * escala,
              panel.ancho * escala,
              panel.alto * escala,
            );
          });
        }
      }
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, []);

  function alternar() {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < desde || v.currentTime >= hasta) v.currentTime = desde;
      void v.play().catch(() => setSonando(false));
    } else {
      v.pause();
    }
  }

  function ir(segDelClip: number) {
    const v = video.current;
    if (v) v.currentTime = desde + Math.min(Math.max(0, segDelClip), duracion - 0.05);
  }

  // ---- Arrastrar recuadros ----

  function cambiarRegion(i: number, r: Region) {
    const nuevas = posiciones.map((p, k) =>
      k === indiceActiva
        ? { ...p, regiones: p.regiones.map((x, j) => (j === i ? ajustarRegion(r, fuente, paneles[i]) : x)) }
        : p,
    );
    onCambiarPosiciones(nuevas);
  }

  function empezarArrastre(e: React.PointerEvent, i: number, modo: "mover" | "agrandar") {
    if (!puedeEditar) return;
    e.preventDefault();
    e.stopPropagation();
    const caja = cuadro.current?.getBoundingClientRect();
    if (!caja) return;
    const inicial = activa.regiones[i];
    const x0 = e.clientX;
    const y0 = e.clientY;
    // ancho / alto que tiene que tener la región, en fracciones.
    const k = (paneles[i].ancho / paneles[i].alto) * (fuente.alto / fuente.ancho);

    const mover = (ev: PointerEvent) => {
      const dx = (ev.clientX - x0) / caja.width;
      const dy = (ev.clientY - y0) / caja.height;
      if (modo === "mover") {
        cambiarRegion(i, { ...inicial, x: inicial.x + dx, y: inicial.y + dy });
      } else {
        // Desde la esquina de abajo a la derecha, con la de arriba a la
        // izquierda quieta y la proporción del panel.
        const ancho = Math.min(1 - inicial.x, Math.max(REGION_MINIMA, inicial.ancho + dx));
        const alto = Math.min(1 - inicial.y, ancho / k);
        const anchoFinal = alto * k;
        cambiarRegion(i, { x: inicial.x, y: inicial.y, ancho: anchoFinal, alto });
      }
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  /** Un cambio de encuadre donde está parado el video, copiando el actual. */
  function nuevaPosicion() {
    const seg = Math.round(tc * 100) / 100;
    if (posiciones.some((p) => Math.abs(p.desdeSeg - seg) < 0.2)) return;
    const nuevas = [...posiciones, { desdeSeg: seg, regiones: activa.regiones.map((r) => ({ ...r })) }].sort(
      (a, b) => a.desdeSeg - b.desdeSeg,
    );
    onCambiarPosiciones(nuevas);
  }

  function quitarPosicion(i: number) {
    if (i === 0) return;
    onCambiarPosiciones(posiciones.filter((_, k) => k !== i));
  }

  // ---- Subtítulos y gancho sobre la vista previa ----

  const k = anchoVista / lienzo.ancho;
  const altoVista = (anchoVista * lienzo.alto) / lienzo.ancho;
  const linea = lineas.find((l) => tc >= l.desde && tc < l.hasta);
  let palabraActiva = 0;
  linea?.palabras.forEach((p, i) => {
    if (p.desde <= tc) palabraActiva = i;
  });
  const { cuerpo, margenAbajo } = medidasSubtitulo(lienzo, diseno);
  const contorno = Math.max(3, Math.round(cuerpo * 0.14));
  const verGancho = gancho.activo && gancho.texto.trim() && tc < gancho.seg;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {/* ---- El cuadro entero, con los recuadros ---- */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">Posicioná el recorte</p>
          <p className="text-xs text-white/40">
            {puedeEditar ? "Arrastrá el recuadro para moverlo; la esquina, para agrandarlo." : ""}
          </p>
        </div>
        <div
          ref={cuadro}
          className="relative w-full touch-none select-none overflow-hidden rounded-lg bg-black"
          style={{ aspectRatio: `${fuente.ancho} / ${fuente.alto}` }}
        >
          <video
            ref={video}
            playsInline
            onPlay={() => setSonando(true)}
            onPause={() => setSonando(false)}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.videoWidth && v.videoHeight) setFuente({ ancho: v.videoWidth, alto: v.videoHeight });
              v.currentTime = desde;
            }}
            className="absolute inset-0 h-full w-full"
          />
          {/* Lo que queda afuera, oscurecido: una máscara con un agujero por recuadro. */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
            <defs>
              <mask id="fuera-del-recorte">
                <rect x="0" y="0" width="1" height="1" fill="white" />
                {activa.regiones.map((r, i) => (
                  <rect key={i} x={r.x} y={r.y} width={r.ancho} height={r.alto} fill="black" />
                ))}
              </mask>
            </defs>
            <rect x="0" y="0" width="1" height="1" fill="rgba(0,0,0,0.55)" mask="url(#fuera-del-recorte)" />
          </svg>
          {activa.regiones.map((r, i) => (
            <div
              key={i}
              onPointerDown={(e) => empezarArrastre(e, i, "mover")}
              className={`absolute ${puedeEditar ? "cursor-move" : ""}`}
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.ancho * 100}%`,
                height: `${r.alto * 100}%`,
                border: `2px solid ${COLORES[i]}`,
              }}
            >
              <span
                className="absolute left-1 top-1 rounded px-1 text-[10px] font-semibold text-black"
                style={{ background: COLORES[i] }}
              >
                {paneles.length > 1 ? (paneles[i].y > 0 || paneles[i].x > 0 ? "Abajo" : "Arriba") : formato === "VERTICAL" ? "9:16" : formato === "CUADRADO" ? "1:1" : "16:9"}
              </span>
              {puedeEditar && (
                <div
                  onPointerDown={(e) => empezarArrastre(e, i, "agrandar")}
                  className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-black"
                  style={{ background: COLORES[i] }}
                />
              )}
            </div>
          ))}
        </div>

        {/* ---- Transporte y posiciones ---- */}
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={alternar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0FED9D] text-black"
            title={sonando ? "Pausa" : "Reproducir"}
          >
            {sonando ? "❚❚" : "▶"}
          </button>
          <div className="relative h-8 flex-1">
            <input
              type="range"
              min={0}
              max={duracion}
              step={0.01}
              value={tc}
              onChange={(e) => ir(parseFloat(e.target.value))}
              className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2"
            />
            {posiciones.map((p, i) => (
              <span
                key={i}
                className="pointer-events-none absolute top-0 h-2 w-0.5 bg-amber-300"
                style={{ left: `${(p.desdeSeg / duracion) * 100}%` }}
              />
            ))}
          </div>
          <span className="w-24 shrink-0 text-right text-xs tabular-nums text-white/50">
            {tc.toFixed(1)} / {duracion.toFixed(1)} s
          </span>
        </div>

        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-white/50">
              Posiciones del recorte · {posiciones.length}
            </p>
            {puedeEditar && (
              <button
                onClick={nuevaPosicion}
                className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:bg-white/5"
                title="Desde este segundo, otro encuadre. Arranca igual al actual: movelo después."
              >
                + Cambiar encuadre aquí ({tc.toFixed(1)} s)
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {posiciones.map((p, i) => {
              const fin = i + 1 < posiciones.length ? posiciones[i + 1].desdeSeg : duracion;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs tabular-nums ${
                    i === indiceActiva ? "border-amber-300 text-white" : "border-white/15 text-white/60"
                  }`}
                >
                  <button onClick={() => ir(p.desdeSeg)}>
                    {p.desdeSeg.toFixed(1)}–{fin.toFixed(1)} s
                  </button>
                  {puedeEditar && i > 0 && (
                    <button onClick={() => quitarPosicion(i)} className="text-white/40 hover:text-red-400" title="Quitar">
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---- La vista previa ---- */}
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-sm font-medium">
            Vista previa ({formato === "VERTICAL" ? "9:16" : formato === "CUADRADO" ? "1:1" : "16:9"})
          </p>
          <div
            ref={vista}
            onClick={alternar}
            className="relative mx-auto cursor-pointer overflow-hidden rounded-lg bg-black"
            style={{
              aspectRatio: `${lienzo.ancho} / ${lienzo.alto}`,
              maxHeight: "62vh",
              maxWidth: `calc(62vh * ${lienzo.ancho / lienzo.alto})`,
            }}
          >
            <canvas
              ref={lienzoRef}
              width={Math.max(1, Math.round(anchoVista * 2))}
              height={Math.max(1, Math.round(altoVista * 2))}
              className="absolute inset-0 h-full w-full"
            />
            {verGancho && (
              <div
                className="pointer-events-none absolute inset-x-0 text-center uppercase leading-[1.1]"
                style={{
                  top: GANCHO.centroY * altoVista,
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
                  <span key={`${p.desde}-${i}`} style={i === palabraActiva ? { color: estilo.colorResaltado } : undefined}>
                    {i > 0 ? " " : ""}
                    {p.texto}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {debajoDeLaVista}
      </div>
    </div>
  );
}
