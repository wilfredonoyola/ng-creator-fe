"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useHls } from "@/lib/use-hls";
import {
  ajustarRegion,
  FUENTES,
  LIENZOS,
  llevaFondo,
  medidasEfecto,
  palabrasDelTexto,
  medidasSubtitulo,
  panelesDe,
  posicionEn,
  posicionesEfectivas,
  REGION_MINIMA,
  type DisenoClip,
  type Encuadre,
  type FondoClip,
  type FormatoClip,
  type PosicionEfectiva,
  type Region,
  type Texto,
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
const COLORES = ["#60A5FA", "#A78BFA"];

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
  textos,
  onCambiarTextos,
  textoElegido,
  onElegirTexto,
  estilo,
  puedeEditar,
  debajoDeLaVista,
  duracionEpisodio,
  onCambiarTramo,
  onCambiarFormato,
  onCambiarDiseno,
  fondo = "DESENFOCADO",
  onCambiarFondo,
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
  /** Los textos sobre el clip. Se arrastran en la vista previa para moverlos. */
  textos: Texto[];
  onCambiarTextos: (t: Texto[]) => void;
  /** El que se está editando en el panel: se marca en la vista previa. */
  textoElegido: number | null;
  onElegirTexto: (i: number) => void;
  estilo: EstiloClip;
  puedeEditar: boolean;
  debajoDeLaVista?: ReactNode;
  /** Para la barra del tramo: hasta dónde se puede extender el clip. */
  duracionEpisodio: number;
  onCambiarTramo: (desde: number, hasta: number) => void;
  onCambiarFormato: (f: FormatoClip) => void;
  onCambiarDiseno: (d: DisenoClip) => void;
  /** Alrededor del recuadro en HORIZONTAL y CENTRADO. */
  fondo?: FondoClip;
  onCambiarFondo?: (f: FondoClip) => void;
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
  const conFondo = llevaFondo(formato, diseno);
  const estado = useRef({ posiciones, paneles, lienzo, desde, hasta, desenfocado: conFondo && fondo === "DESENFOCADO" });
  estado.current = { posiciones, paneles, lienzo, desde, hasta, desenfocado: conFondo && fondo === "DESENFOCADO" };

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
          // El fondo desenfocado de HORIZONTAL y CENTRADO: el mismo video
          // cubriendo el lienzo, como en el render (boxblur 20:3, brillo −0.05).
          if (e.desenfocado) {
            const k = Math.max(c.width / v.videoWidth, c.height / v.videoHeight);
            const w = v.videoWidth * k;
            const h = v.videoHeight * k;
            ctx.filter = `blur(${Math.round(c.width / 30)}px) brightness(0.95) saturate(0.9)`;
            ctx.drawImage(v, (c.width - w) / 2, (c.height - h) / 2, w, h);
            ctx.filter = "none";
          }
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
  const factorSub = FUENTES.NUNITO.factorCss;

  /** Mover un texto arrastrándolo sobre la vista previa. */
  function arrastrarTexto(e: React.PointerEvent, i: number) {
    e.stopPropagation();
    onElegirTexto(i);
    if (!puedeEditar) return;
    e.preventDefault();
    const caja = vista.current?.getBoundingClientRect();
    if (!caja) return;
    const inicial = textos[i];
    const x0 = e.clientX;
    const y0 = e.clientY;
    const mover = (ev: PointerEvent) => {
      const cx = Math.min(1, Math.max(0, inicial.centroX + (ev.clientX - x0) / caja.width));
      const cy = Math.min(1, Math.max(0, inicial.centroY + (ev.clientY - y0) / caja.height));
      onCambiarTextos(textos.map((t, k) => (k === i ? { ...t, centroX: redondo3(cx), centroY: redondo3(cy) } : t)));
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {/* ---- El cuadro entero, con los recuadros ---- */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        {/* Formato y diseño arriba, a mano: es lo primero que se decide. */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Posicioná el recorte</p>
          <div className="flex flex-wrap items-center gap-2">
            <Pestanas
              opciones={FORMATOS}
              valor={formato}
              onCambio={onCambiarFormato}
              deshabilitado={!puedeEditar}
            />
          </div>
        </div>
        {/* El diseño, con su dibujito, como en la app. */}
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DISENOS.map((d) => (
            <button
              key={d.valor}
              disabled={!puedeEditar}
              onClick={() => d.valor !== diseno && onCambiarDiseno(d.valor)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition disabled:opacity-50 ${
                d.valor === diseno ? "border-ng-azul bg-ng-azul/10" : "border-white/10 bg-black/20 hover:border-white/25"
              }`}
            >
              <MiniDiseno diseno={d.valor} horizontal={formato === "HORIZONTAL"} activo={d.valor === diseno} />
              <span className="text-xs font-medium">{d.etiqueta}</span>
              <span className="text-[11px] leading-tight text-white/45">{d.titulo}</span>
            </button>
          ))}
        </div>
        {conFondo && onCambiarFondo && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/50">Fondo</span>
            <Pestanas opciones={FONDOS} valor={fondo} onCambio={onCambiarFondo} deshabilitado={!puedeEditar} />
            <span className="text-[11px] text-white/40">
              {fondo === "NEGRO" ? "Franjas limpias para poner textos." : "El mismo video, suave, detrás."}
            </span>
          </div>
        )}
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

        {puedeEditar && (
          <p className="mt-1.5 text-[11px] text-white/35">
            Arrastrá el recuadro para moverlo; la esquina, para agrandarlo.
          </p>
        )}

        {/* ---- Transporte y posiciones ---- */}
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={alternar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-marca text-white"
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

        <BarraDelTramo
          desde={desde}
          hasta={hasta}
          t={t}
          duracionEpisodio={duracionEpisodio}
          onCambiar={onCambiarTramo}
          deshabilitado={!puedeEditar}
        />

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
            {textos.map((tx, i) => {
              const hasta = tx.hastaSeg && tx.hastaSeg > tx.desdeSeg ? tx.hastaSeg : duracion;
              const visible = tc >= tx.desdeSeg && tc < hasta;
              const elegido = textoElegido === i;
              if (!visible && !elegido) return null;
              const f = FUENTES[tx.fuente] ?? FUENTES.ANTON;
              const { borde, sombra } = medidasEfecto(tx.efecto, tx.tamano);
              const palabras = palabrasDelTexto(tx);
              const caja = tx.efecto === "CAJA";
              return (
                <div
                  key={i}
                  onPointerDown={(e) => arrastrarTexto(e, i)}
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute text-center ${puedeEditar ? "cursor-move" : ""} ${
                    elegido ? "outline-dashed outline-1 outline-offset-4 outline-white/70" : ""
                  } ${visible ? "" : "opacity-40"}`}
                  style={{
                    left: tx.centroX * anchoVista,
                    top: tx.centroY * altoVista,
                    transform: "translate(-50%, -50%)",
                    width: "max-content",
                    maxWidth: tx.ancho * anchoVista,
                    fontFamily: `'${f.familia}', sans-serif`,
                    fontWeight: tx.fuente === "NUNITO" ? 900 : 400,
                    // libass mide por la altura "win": ver FUENTES.
                    fontSize: tx.tamano * f.factorCss * k,
                    lineHeight: `${tx.tamano * k}px`,
                    color: tx.color,
                    ...(tx.efecto === "CONTORNO"
                      ? { WebkitTextStroke: `${2 * borde * k}px ${tx.colorEfecto}`, paintOrder: "stroke fill" }
                      : {}),
                    ...(tx.efecto === "SOMBRA"
                      ? { textShadow: `${sombra * k}px ${sombra * k}px 0 ${tx.colorEfecto}` }
                      : {}),
                  }}
                >
                  <span
                    style={
                      caja
                        ? {
                            background: tx.colorEfecto,
                            padding: `${borde * k * 0.35}px ${borde * k}px`,
                            boxDecorationBreak: "clone",
                            WebkitBoxDecorationBreak: "clone",
                          }
                        : undefined
                    }
                  >
                    {palabras.map((w, j) => (
                      <span key={j} style={w.destacada ? { color: tx.colorDestacado } : undefined}>
                        {j > 0 ? w.salto ? <br /> : " " : ""}
                        {w.texto}
                      </span>
                    ))}
                  </span>
                </div>
              );
            })}
            {linea && (
              <div
                className="pointer-events-none absolute inset-x-0 text-center"
                style={{
                  bottom: margenAbajo * k,
                  padding: `0 ${60 * k}px`,
                  fontFamily: "'Nunito Black', sans-serif",
                  fontWeight: 900,
                  // Mismo factor que los textos: libass mide por la altura "win".
                  fontSize: cuerpo * factorSub * k,
                  lineHeight: `${cuerpo * k}px`,
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

const FORMATOS: { valor: FormatoClip; etiqueta: string; titulo: string }[] = [
  { valor: "VERTICAL", etiqueta: "9:16", titulo: "Reels, TikTok, Shorts" },
  { valor: "CUADRADO", etiqueta: "1:1", titulo: "Feed" },
  { valor: "HORIZONTAL", etiqueta: "16:9", titulo: "YouTube" },
];

const DISENOS: { valor: DisenoClip; etiqueta: string; titulo: string }[] = [
  { valor: "UNO", etiqueta: "Uno", titulo: "Un solo encuadre" },
  { valor: "DIVIDIDO", etiqueta: "Dividido", titulo: "Dos, uno arriba del otro" },
  { valor: "HORIZONTAL", etiqueta: "Horizontal", titulo: "El 16:9 entero, centrado" },
  { valor: "CENTRADO", etiqueta: "Centrado", titulo: "Un cuadrado al medio" },
];

const FONDOS: { valor: FondoClip; etiqueta: string; titulo: string }[] = [
  { valor: "DESENFOCADO", etiqueta: "Desenfocado", titulo: "El mismo video, suave" },
  { valor: "NEGRO", etiqueta: "Negro", titulo: "Franjas limpias para textos" },
];

/** El dibujito del diseño en su botón, el mismo que en la app. */
function MiniDiseno({ diseno, horizontal, activo }: { diseno: DisenoClip; horizontal: boolean; activo: boolean }) {
  const borde = activo ? "border-ng-celeste" : "border-white/40";
  const relleno = activo ? "bg-ng-celeste/80" : "bg-white/40";
  return (
    <div className={`flex gap-0.5 ${horizontal ? "h-6 w-10 flex-row" : "h-10 w-6 flex-col"}`}>
      {diseno === "DIVIDIDO" ? (
        [0, 1].map((i) => <div key={i} className={`flex-1 rounded-[3px] border-[1.5px] ${borde}`} />)
      ) : diseno === "UNO" ? (
        <div className={`flex-1 rounded-[3px] border-[1.5px] ${borde}`} />
      ) : (
        <div className={`flex flex-1 flex-col justify-center rounded-[3px] border-[1.5px] border-dashed ${borde}`}>
          <div className={`${relleno} ${diseno === "HORIZONTAL" ? "h-[32%]" : "h-[56%]"}`} />
        </div>
      )}
    </div>
  );
}

function Pestanas<T extends string>({
  opciones,
  valor,
  onCambio,
  deshabilitado,
}: {
  opciones: { valor: T; etiqueta: string; titulo: string }[];
  valor: T;
  onCambio: (v: T) => void;
  deshabilitado?: boolean;
}) {
  return (
    <div className="flex rounded-lg border border-white/10 bg-black/30 p-0.5">
      {opciones.map((o) => (
        <button
          key={o.valor}
          title={o.titulo}
          disabled={deshabilitado}
          onClick={() => o.valor !== valor && onCambio(o.valor)}
          className={`rounded-md px-2.5 py-1 text-xs transition ${
            o.valor === valor ? "bg-marca font-medium text-white" : "text-white/60 hover:text-white"
          }`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

/** Tope de un clip a mano, el mismo que valida el backend. */
const CLIP_MAXIMO_SEG = 180;

/**
 * El tramo del clip dentro del episodio, para extenderlo o acortarlo
 * arrastrando sus bordes. Muestra un poco de episodio a cada lado: lo que se
 * podría sumar.
 *
 * La ventana se congela al empezar a arrastrar; si se recalculara con cada
 * movimiento, la barra se correría debajo del dedo.
 */
function BarraDelTramo({
  desde,
  hasta,
  t,
  duracionEpisodio,
  onCambiar,
  deshabilitado,
}: {
  desde: number;
  hasta: number;
  t: number;
  duracionEpisodio: number;
  onCambiar: (desde: number, hasta: number) => void;
  deshabilitado?: boolean;
}) {
  const barra = useRef<HTMLDivElement>(null);
  const [fija, setFija] = useState<{ ini: number; fin: number } | null>(null);
  const margen = Math.max(30, (hasta - desde) * 0.6);
  const ventana = fija ?? {
    ini: Math.max(0, desde - margen),
    fin: Math.min(duracionEpisodio || hasta + margen, hasta + margen),
  };
  const largo = Math.max(1, ventana.fin - ventana.ini);
  const pct = (seg: number) => ((seg - ventana.ini) / largo) * 100;

  const acotar = (d: number, h: number) => {
    let a = Math.max(0, Math.round(d * 100) / 100);
    let b = Math.min(duracionEpisodio || h, Math.round(h * 100) / 100);
    if (b - a < 1) b = a + 1;
    if (b - a > CLIP_MAXIMO_SEG) {
      if (d !== desde) a = b - CLIP_MAXIMO_SEG;
      else b = a + CLIP_MAXIMO_SEG;
    }
    return [a, b] as const;
  };

  function arrastrar(e: React.PointerEvent, borde: "desde" | "hasta") {
    if (deshabilitado) return;
    e.preventDefault();
    const caja = barra.current?.getBoundingClientRect();
    if (!caja) return;
    const congelada = { ...ventana };
    setFija(congelada);
    const mover = (ev: PointerEvent) => {
      const seg = congelada.ini + ((ev.clientX - caja.left) / caja.width) * (congelada.fin - congelada.ini);
      if (borde === "desde") onCambiar(...acotar(Math.min(seg, hasta - 1), hasta));
      else onCambiar(...acotar(desde, Math.max(seg, desde + 1)));
    };
    const soltar = () => {
      setFija(null);
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  const boton = "rounded border border-white/15 px-2 py-0.5 text-[11px] text-white/70 hover:bg-white/5 disabled:opacity-40";
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/45">
        <span className="font-medium uppercase tracking-wide text-white/50">
          Tramo del clip <span className="normal-case tracking-normal text-white/35">· arrastrá los bordes para alargarlo o acortarlo</span>
        </span>
        <span className="tabular-nums">
          {reloj(desde)} – {reloj(hasta)} · {(hasta - desde).toFixed(1)} s
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 gap-1">
          <button className={boton} disabled={deshabilitado} onClick={() => onCambiar(...acotar(desde - 5, hasta))} title="Mover el inicio 5 s antes (el clip se alarga)">
            ← 5 s
          </button>
          <button className={boton} disabled={deshabilitado} onClick={() => onCambiar(...acotar(Math.min(desde + 5, hasta - 1), hasta))} title="Mover el inicio 5 s después (el clip se acorta)">
            5 s →
          </button>
        </div>
        <div ref={barra} className="relative h-9 flex-1 touch-none select-none rounded-md bg-white/[0.06]">
          <div
            className="absolute inset-y-0 rounded-md border-2 border-ng-azul bg-ng-teal/15"
            style={{ left: `${pct(desde)}%`, width: `${pct(hasta) - pct(desde)}%` }}
          >
            <div
              onPointerDown={(e) => arrastrar(e, "desde")}
              className="absolute -left-1.5 inset-y-0 w-3 cursor-ew-resize rounded-sm bg-marca"
              title="Arrastrá para mover el inicio"
            />
            <div
              onPointerDown={(e) => arrastrar(e, "hasta")}
              className="absolute -right-1.5 inset-y-0 w-3 cursor-ew-resize rounded-sm bg-marca"
              title="Arrastrá para mover el final"
            />
          </div>
          {t >= ventana.ini && t <= ventana.fin && (
            <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white" style={{ left: `${pct(t)}%` }} />
          )}
          <span className="pointer-events-none absolute bottom-0.5 left-1 text-[10px] tabular-nums text-white/30">
            {reloj(ventana.ini)}
          </span>
          <span className="pointer-events-none absolute bottom-0.5 right-1 text-[10px] tabular-nums text-white/30">
            {reloj(ventana.fin)}
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          <button className={boton} disabled={deshabilitado} onClick={() => onCambiar(...acotar(desde, Math.max(hasta - 5, desde + 1)))} title="Mover el final 5 s antes (el clip se acorta)">
            ← 5 s
          </button>
          <button className={boton} disabled={deshabilitado} onClick={() => onCambiar(...acotar(desde, hasta + 5))} title="Mover el final 5 s después (el clip se alarga)">
            5 s →
          </button>
        </div>
      </div>
    </div>
  );
}

/** 5423.7 → "1:30:23". */
function reloj(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

const redondo3 = (n: number) => Math.round(n * 1000) / 1000;
