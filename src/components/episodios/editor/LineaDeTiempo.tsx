"use client";

import { useId, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { aTiempoDelEpisodio, pedazosDelClip, siguienteTiempoVisible, type Corte } from "@/lib/cortes";
import type { plantillaDelClip } from "@/lib/plantilla-clip";
import type { ImagenClip, PosicionEfectiva, Texto } from "@/lib/clip-encuadre";
import type { EfectoClip, MusicaClip } from "@/lib/sonidos";
import { useTiempo, type Reproductor } from "./reproductor";
import { reloj, relojFino, type Herramienta, type SeleccionCortes } from "./tipos";

/** Cuánto hay que mover el puntero para que un toque pase a ser un arrastre. */
const UMBRAL_PX = 4;
/** Lo mínimo que dura un texto o una imagen arrastrando sus bordes. */
const MINIMO_SEG = 0.3;
const decimas = (n: number) => Math.round(n * 10) / 10;

/** Un elemento con tiempo en una pista: en segundos del clip (tiempo original). */
interface Barra {
  clave: string;
  etiqueta: string;
  desde: number;
  hasta: number;
  elegida: boolean;
  /** Del Brand Kit: se ve, pero no se mueve. */
  fija?: boolean;
  /** La música de fondo: va a lo largo, no se mueve. */
  musica?: boolean;
  /** Los efectos: se corren enteros, sin bordes (lo que duran es lo que dura el sonido). */
  soloMover?: boolean;
  alTocar: () => void;
  /** Sin esto, no se arrastra. */
  alMover?: (desde: number, hasta: number) => void;
}

/**
 * La línea de tiempo, a todo el ancho y debajo de todo, como en CapCut: una
 * regla, el cabezal y una pista por cosa (video, textos, subtítulos,
 * imágenes, audio), en el tiempo del clip.
 *
 * - Tocar la regla lleva el video ahí; arrastrar sobre ella lo recorre.
 * - En el video, tocar un pedazo lo elige (para "Quitar tramo") y arrastrar
 *   marca un rango. Lo rayado son los cortes: la ✕ los vuelve a poner.
 * - Tocar una barra la elige y abre su herramienta. Los bordes de un texto o
 *   una imagen cambian cuándo aparece y cuándo se va; el medio la corre.
 * - En Audio, la música va a lo largo y cada efecto en su segundo: se arrastra
 *   para cambiarlo de lugar.
 */
export function LineaDeTiempo({
  reproductor,
  desde,
  hasta,
  cortes,
  onCambiarCortes,
  seleccion,
  onSeleccion,
  posiciones,
  textos,
  onCambiarTextos,
  textoElegido,
  onElegirTexto,
  onAgregarTexto,
  imagenes,
  onCambiarImagenes,
  imagenElegida,
  onElegirImagen,
  subtitulosActivos,
  plantilla,
  musica,
  efectos,
  onCambiarEfectos,
  efectoElegido,
  onElegirEfecto,
  herramienta,
  onAbrir,
  puedeEditar,
}: {
  reproductor: Reproductor;
  desde: number;
  hasta: number;
  cortes: Corte[];
  onCambiarCortes: (c: Corte[]) => void;
  seleccion: SeleccionCortes;
  onSeleccion: (s: SeleccionCortes) => void;
  posiciones: PosicionEfectiva[];
  textos: Texto[];
  onCambiarTextos: (t: Texto[]) => void;
  textoElegido: number | null;
  onElegirTexto: (i: number) => void;
  /** "+ Texto": lo crea ya en el video. Sin él (llegó al máximo), solo abre el panel. */
  onAgregarTexto?: () => void;
  imagenes: ImagenClip[];
  onCambiarImagenes: (im: ImagenClip[]) => void;
  imagenElegida: number | null;
  onElegirImagen: (i: number) => void;
  subtitulosActivos: boolean;
  plantilla: ReturnType<typeof plantillaDelClip>;
  musica: MusicaClip | null;
  efectos: EfectoClip[];
  onCambiarEfectos: (e: EfectoClip[]) => void;
  efectoElegido: string | null;
  onElegirEfecto: (id: string) => void;
  herramienta: Herramienta;
  onAbrir: (h: Herramienta) => void;
  puedeEditar: boolean;
}) {
  const tr = useTranslations("editorHerramientas");
  const tc = useTranslations("editorCortes");
  const tRecorte = useTranslations("editorRecorte");
  const idRayado = `rayado-${useId().replace(/:/g, "")}`;
  const duracion = Math.max(0.001, hasta - desde);
  const pct = (segClip: number) => `${(Math.min(Math.max(segClip, 0), duracion) / duracion) * 100}%`;
  const ancho = (a: number, b: number) => `${((Math.min(b, duracion) - Math.max(a, 0)) / duracion) * 100}%`;
  const segDe = (clientX: number, caja: DOMRect) => Math.min(1, Math.max(0, (clientX - caja.left) / caja.width)) * duracion;
  const ir = (segClip: number) => reproductor.irAlEpisodio(desde + segClip);

  // ---- Regla ----
  const paso = [1, 2, 5, 10, 15, 30, 60, 120].find((p) => duracion / p <= 8) ?? 300;
  const marcas = Array.from({ length: Math.floor(duracion / paso) + 1 }, (_, i) => i * paso);

  function recorrer(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    const caja = e.currentTarget.getBoundingClientRect();
    ir(segDe(e.clientX, caja));
    const mover = (ev: PointerEvent) => ir(segDe(ev.clientX, caja));
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  // ---- Video: pedazos y cortes ----
  const pedazos = pedazosDelClip(desde, hasta, cortes, seleccion.puntos);
  const igual = (a: Corte, b: Corte) => Math.abs(a.desdeSeg - b.desdeSeg) < 0.001 && Math.abs(a.hastaSeg - b.hastaSeg) < 0.001;

  function tocarVideo(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    const caja = e.currentTarget.getBoundingClientRect();
    const x0 = e.clientX;
    const s0 = desde + segDe(x0, caja);
    let arrastrando = false;
    const mover = (ev: PointerEvent) => {
      if (!puedeEditar) return;
      if (!arrastrando && Math.abs(ev.clientX - x0) < UMBRAL_PX) return;
      arrastrando = true;
      const s = desde + segDe(ev.clientX, caja);
      onSeleccion({ ...seleccion, elegido: { desdeSeg: Math.min(s0, s), hastaSeg: Math.max(s0, s) } });
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      onAbrir("editar");
      if (arrastrando) return;
      // Un toque: el video va ahí y se elige el pedazo.
      reproductor.irAlEpisodio(siguienteTiempoVisible(s0, cortes));
      if (puedeEditar) onSeleccion({ ...seleccion, elegido: pedazos.find((p) => s0 >= p.desdeSeg && s0 < p.hastaSeg) ?? null });
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  // ---- Barras con tiempo ----
  const hastaDe = (x: { desdeSeg: number; hastaSeg?: number | null }) => (x.hastaSeg && x.hastaSeg > x.desdeSeg ? x.hastaSeg : duracion);
  const conTiempo = <T extends { desdeSeg: number; hastaSeg?: number | null }>(x: T, d: number, h: number): T => ({
    ...x,
    desdeSeg: decimas(d),
    hastaSeg: h >= duracion - 0.05 ? null : decimas(h),
  });

  const barrasTextos: Barra[] = textos.map((tx, i) => ({
    clave: `t${i}`,
    etiqueta: tx.contenido.trim() || tr("linea.textoVacio"),
    desde: tx.desdeSeg,
    hasta: hastaDe(tx),
    elegida: textoElegido === i,
    alTocar: () => {
      onElegirTexto(i);
      onAbrir("texto");
    },
    alMover: puedeEditar ? (d, h) => onCambiarTextos(textos.map((x, j) => (j === i ? conTiempo(x, d, h) : x))) : undefined,
  }));
  if (plantilla.llamada) {
    // La llamada a la acción va en el tiempo del clip ya cortado: se pasa al original para dibujarla.
    const ll = plantilla.llamada;
    const a = aTiempoDelEpisodio(ll.desdeSeg, desde, hasta, cortes) - desde;
    const b = ll.hastaSeg ? aTiempoDelEpisodio(ll.hastaSeg, desde, hasta, cortes) - desde : duracion;
    barrasTextos.push({ clave: "llamada", etiqueta: tr("linea.llamada"), desde: a, hasta: b, elegida: false, fija: true, alTocar: () => onAbrir("superposicion") });
  }

  const barrasImagenes: Barra[] = imagenes.map((im, i) => ({
    clave: im.id,
    etiqueta: tr("linea.imagen", { n: i + 1 }),
    desde: im.desdeSeg,
    hasta: hastaDe(im),
    elegida: imagenElegida === i,
    alTocar: () => {
      onElegirImagen(i);
      onAbrir("superposicion");
    },
    alMover: puedeEditar ? (d, h) => onCambiarImagenes(imagenes.map((x, j) => (j === i ? conTiempo(x, d, h) : x))) : undefined,
  }));
  if (plantilla.logo) {
    barrasImagenes.push({ clave: "logo", etiqueta: tr("linea.logo"), desde: 0, hasta: duracion, elegida: false, fija: true, alTocar: () => onAbrir("superposicion") });
  }

  // La música primero: ocupa el primer renglón entero y los efectos van debajo.
  const barrasAudio: Barra[] = [];
  if (musica) {
    barrasAudio.push({
      clave: "musica",
      etiqueta: tr("linea.musica", { titulo: musica.titulo }),
      desde: 0,
      hasta: duracion,
      elegida: false,
      musica: true,
      alTocar: () => onAbrir("audio"),
    });
  }
  efectos.forEach((ef) => {
    barrasAudio.push({
      clave: ef.id,
      etiqueta: ef.titulo,
      desde: ef.enSeg,
      hasta: ef.enSeg + Math.max(MINIMO_SEG, ef.duracionSeg),
      elegida: efectoElegido === ef.id,
      soloMover: true,
      alTocar: () => {
        onElegirEfecto(ef.id);
        onAbrir("audio");
      },
      alMover: puedeEditar ? (d) => onCambiarEfectos(efectos.map((x) => (x.id === ef.id ? { ...x, enSeg: decimas(d) } : x))) : undefined,
    });
  });

  return (
    <section
      aria-label={tr("linea.titulo")}
      className="linea-tiempo relative select-none border-t border-ng-superficie px-3 pb-3 pt-2 md:px-5"
    >
      <svg className="absolute h-0 w-0" aria-hidden>
        <defs>
          <pattern id={idRayado} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="2" height="6" fill="rgba(248,113,113,0.55)" />
          </pattern>
        </defs>
      </svg>
      <div className="relative flex flex-col gap-1.5">
        {/* La regla */}
        <Fila etiqueta="">
          <div onPointerDown={recorrer} className="relative h-5 cursor-pointer touch-none text-[11px] text-ng-tenue" title={tr("linea.recorrer")}>
            {marcas.map((m) => (
              <span key={m} className="absolute top-0 -translate-x-1/2 tabular-nums first:translate-x-0" style={{ left: pct(m) }}>
                {reloj(m)}
              </span>
            ))}
          </div>
        </Fila>

        {/* Video */}
        <Fila etiqueta={tr("linea.video")} activa={herramienta === "editar" || herramienta === "formato" || herramienta === "auto"}>
          <div
            onPointerDown={tocarVideo}
            className="relative h-12 cursor-pointer touch-none overflow-hidden rounded-lg bg-ng-superficie"
            title={tc("ayuda")}
          >
            {pedazos.map((p) => {
              const elegido = seleccion.elegido && igual(seleccion.elegido, p);
              return (
                <div
                  key={`${p.desdeSeg}-${p.hastaSeg}`}
                  className={`pointer-events-none absolute inset-y-0 rounded-md border ${
                    elegido ? "border-2 border-ng-azul bg-ng-azul/20" : "border-white/10 bg-ng-elevada"
                  }`}
                  style={{ left: pct(p.desdeSeg - desde), width: ancho(p.desdeSeg - desde, p.hastaSeg - desde) }}
                />
              );
            })}
            {seleccion.elegido && !pedazos.some((p) => igual(seleccion.elegido!, p)) && (
              <div
                className="pointer-events-none absolute inset-y-0 border-2 border-ng-azul bg-ng-azul/25"
                style={{ left: pct(seleccion.elegido.desdeSeg - desde), width: ancho(seleccion.elegido.desdeSeg - desde, seleccion.elegido.hastaSeg - desde) }}
              />
            )}
            {/* Los cambios de encuadre: una marca donde empieza cada uno. */}
            {posiciones.slice(1).map((p) => (
              <button
                key={p.desdeSeg}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  ir(p.desdeSeg);
                  onAbrir("formato");
                }}
                title={`${tRecorte(`disenos.${p.diseno}.etiqueta`)} · ${relojFino(p.desdeSeg)}`}
                aria-label={`${tRecorte(`disenos.${p.diseno}.etiqueta`)} · ${relojFino(p.desdeSeg)}`}
                className="absolute inset-y-0 z-10 w-2 -translate-x-1/2"
                style={{ left: pct(p.desdeSeg) }}
              >
                <span className="mx-auto block h-full w-0.5 bg-ng-azul/80" />
              </button>
            ))}
            {cortes.map((c) => (
              <div
                key={`${c.desdeSeg}-${c.hastaSeg}`}
                className="absolute inset-y-0 flex min-w-[2px] items-start justify-center bg-black/60"
                style={{ left: pct(c.desdeSeg - desde), width: ancho(c.desdeSeg - desde, c.hastaSeg - desde) }}
                title={tc("corte", { desde: relojFino(c.desdeSeg - desde), hasta: relojFino(c.hastaSeg - desde) })}
              >
                <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                  <rect width="100%" height="100%" fill={`url(#${idRayado})`} />
                </svg>
                {puedeEditar && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onCambiarCortes(cortes.filter((x) => x !== c))}
                    aria-label={tc("deshacerCorte", { desde: relojFino(c.desdeSeg - desde), hasta: relojFino(c.hastaSeg - desde) })}
                    className="relative z-10 mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ng-tinta text-white ring-1 ring-red-400/70 hover:bg-red-500"
                  >
                    <X size={10} strokeWidth={3} aria-hidden />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Fila>

        {/* Textos */}
        <Fila etiqueta={tr("linea.textos")} activa={herramienta === "texto"}>
          <Pista
            barras={barrasTextos}
            duracion={duracion}
            vacia={
              puedeEditar ? (
                <button type="button" onClick={() => (onAgregarTexto ? onAgregarTexto() : onAbrir("texto"))} className={AGREGAR}>
                  <Plus size={12} aria-hidden />
                  {tr("linea.agregarTexto")}
                </button>
              ) : null
            }
          />
        </Fila>

        {/* Subtítulos */}
        <Fila etiqueta={tr("linea.subtitulos")} activa={herramienta === "subtitulos"}>
          <div className="relative h-7">
            <button
              type="button"
              onClick={() => onAbrir("subtitulos")}
              className={`absolute inset-0 flex items-center truncate rounded-md px-2.5 text-xs font-semibold ${
                subtitulosActivos ? "bg-white/10 text-white" : "border border-dashed border-white/15 text-ng-tenue"
              } ${herramienta === "subtitulos" ? "ring-2 ring-ng-azul" : ""}`}
            >
              {subtitulosActivos ? tr("linea.subtitulosActivos") : tr("linea.subtitulosApagados")}
            </button>
          </div>
        </Fila>

        {/* Imágenes */}
        <Fila etiqueta={tr("linea.imagenes")} activa={herramienta === "superposicion"}>
          <Pista
            barras={barrasImagenes}
            duracion={duracion}
            vacia={
              puedeEditar ? (
                <button type="button" onClick={() => onAbrir("superposicion")} className={AGREGAR}>
                  <Plus size={12} aria-hidden />
                  {tr("linea.agregarImagen")}
                </button>
              ) : null
            }
          />
        </Fila>

        {/* Audio: la música y los efectos */}
        <Fila etiqueta={tr("linea.audio")} activa={herramienta === "audio"}>
          <Pista
            barras={barrasAudio}
            duracion={duracion}
            vacia={
              puedeEditar ? (
                <button type="button" onClick={() => onAbrir("audio")} className={AGREGAR}>
                  <Plus size={12} aria-hidden />
                  {tr("linea.agregarAudio")}
                </button>
              ) : null
            }
          />
        </Fila>

        <Cabezal reproductor={reproductor} desde={desde} duracion={duracion} />
      </div>
    </section>
  );
}

const AGREGAR =
  "absolute inset-y-0 left-0 flex items-center gap-1 rounded-md border border-dashed border-white/20 px-2.5 text-xs text-ng-secundario hover:border-white/40 hover:text-white";

/** Una fila de la línea de tiempo: el nombre de la pista a la izquierda, con un ancho fijo (--etiqueta-pista). */
function Fila({ etiqueta, activa = false, children }: { etiqueta: string; activa?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-center">
      <span
        className={`w-[var(--etiqueta-pista)] shrink-0 truncate pr-2 text-[11px] font-medium md:text-xs ${activa ? "text-ng-azul" : "text-ng-tenue"}`}
      >
        {etiqueta}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** El cabezal: la raya blanca sobre todas las pistas. Es lo único que se redibuja mientras suena. */
function Cabezal({ reproductor, desde, duracion }: { reproductor: Reproductor; desde: number; duracion: number }) {
  const t = useTiempo(reproductor.reloj);
  const f = Math.min(1, Math.max(0, (t - desde) / duracion));
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-0 top-0 z-20 w-0.5 -translate-x-1/2 bg-white"
      style={{ left: `calc(var(--etiqueta-pista) + (100% - var(--etiqueta-pista)) * ${f})` }}
    >
      <span className="absolute -left-[5px] -top-1 h-3 w-3 rounded-full bg-white" />
    </div>
  );
}

/**
 * Una pista con barras (textos o imágenes). Las que se pisan en el tiempo van
 * en renglones distintos, para poder agarrar cada una.
 */
function Pista({ barras, duracion, vacia }: { barras: Barra[]; duracion: number; vacia: ReactNode }) {
  const pista = useRef<HTMLDivElement>(null);
  // Renglones: cada barra va al primero donde la anterior ya terminó.
  const finDeRenglon: number[] = [];
  const renglonDe = new Map<string, number>();
  [...barras]
    .sort((a, b) => a.desde - b.desde)
    .forEach((b) => {
      let r = finDeRenglon.findIndex((fin) => fin <= b.desde + 0.001);
      if (r === -1) r = finDeRenglon.length;
      finDeRenglon[r] = b.hasta;
      renglonDe.set(b.clave, r);
    });
  // Con solo barras fijas (logo, llamada a la acción) el botón de agregar va
  // en su propio renglón: si no, queda encima de la barra, que ocupa todo el clip.
  const conVacia = Boolean(vacia) && !barras.some((b) => !b.fija);
  const corrimiento = conVacia && barras.length > 0 ? 1 : 0;
  const renglones = Math.max(1, finDeRenglon.length + corrimiento);
  const ALTO = 28;
  const ESPACIO = 4;

  function arrastrar(e: React.PointerEvent, b: Barra, modo: "mover" | "inicio" | "fin") {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const caja = pista.current?.getBoundingClientRect();
    if (!caja) return;
    const x0 = e.clientX;
    let movido = false;
    const mover = (ev: PointerEvent) => {
      if (!b.alMover) return;
      if (!movido && Math.abs(ev.clientX - x0) < UMBRAL_PX) return;
      movido = true;
      const ds = ((ev.clientX - x0) / caja.width) * duracion;
      let d = b.desde;
      let h = b.hasta;
      if (modo === "mover") {
        const largo = b.hasta - b.desde;
        // Un efecto puede seguir sonando después del final: solo su inicio tiene que caer en el clip.
        d = Math.min(Math.max(0, b.desde + ds), b.soloMover ? duracion - 0.1 : duracion - largo);
        h = d + largo;
      } else if (modo === "inicio") {
        d = Math.min(Math.max(0, b.desde + ds), b.hasta - MINIMO_SEG);
      } else {
        h = Math.max(Math.min(duracion, b.hasta + ds), b.desde + MINIMO_SEG);
      }
      b.alMover(d, h);
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    // Al agarrarla ya queda elegida, aunque después se arrastre.
    b.alTocar();
  }

  return (
    <div ref={pista} className="relative" style={{ height: renglones * ALTO + (renglones - 1) * ESPACIO }}>
      {conVacia && <div className="absolute inset-x-0 top-0" style={{ height: ALTO }}>{vacia}</div>}
      {barras.map((b) => {
        const r = (renglonDe.get(b.clave) ?? 0) + corrimiento;
        const editable = Boolean(b.alMover) && !b.fija && !b.musica;
        const bordes = editable && !b.soloMover;
        return (
          <div
            key={b.clave}
            role="button"
            tabIndex={0}
            aria-pressed={b.elegida}
            aria-label={`${b.etiqueta} · ${relojFino(b.desde)} → ${relojFino(b.hasta)}`}
            title={`${b.etiqueta} · ${relojFino(b.desde)} → ${relojFino(b.hasta)}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                b.alTocar();
              }
            }}
            onPointerDown={(e) => (editable ? arrastrar(e, b, "mover") : (e.stopPropagation(), b.alTocar()))}
            className={`group absolute flex touch-none items-center overflow-hidden whitespace-nowrap rounded-md text-xs font-semibold ${
              b.fija
                ? "cursor-pointer border border-dashed border-white/20 bg-transparent text-ng-secundario"
                : b.musica
                  ? "cursor-pointer bg-white/10 text-white hover:bg-white/15"
                  : b.elegida
                  ? "z-10 cursor-grab border-2 border-ng-azul bg-ng-azul/20 text-ng-azul"
                  : "cursor-grab bg-ng-azul/10 text-ng-lila hover:bg-ng-azul/15"
            }`}
            style={{
              left: `${(Math.max(0, b.desde) / duracion) * 100}%`,
              width: `max(10px, ${((Math.min(b.hasta, duracion) - Math.max(0, b.desde)) / duracion) * 100}%)`,
              top: r * (ALTO + ESPACIO),
              height: ALTO,
            }}
          >
            {bordes && (
              <span
                onPointerDown={(e) => arrastrar(e, b, "inicio")}
                className={`h-full w-2 shrink-0 cursor-ew-resize ${b.elegida ? "bg-ng-azul" : "bg-ng-azul/30 opacity-0 group-hover:opacity-100"}`}
                aria-hidden
              />
            )}
            <span className="min-w-0 flex-1 truncate px-2">{b.etiqueta}</span>
            {bordes && (
              <span
                onPointerDown={(e) => arrastrar(e, b, "fin")}
                className={`h-full w-2 shrink-0 cursor-ew-resize ${b.elegida ? "bg-ng-azul" : "bg-ng-azul/30 opacity-0 group-hover:opacity-100"}`}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
