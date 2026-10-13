"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { estiloDelLogo, type plantillaDelClip } from "@/lib/plantilla-clip";
import { dibujarSubtitulos, dibujarTexto, ganchoDeLlamada, type Dibujo, type EstiloResuelto } from "@/lib/estilos-texto";
import { CapaDibujos } from "@/components/estilos/CapaDibujos";
import { InterfazPlataforma } from "@/components/estilos/InterfazPlataforma";
import type { Plataforma } from "@/lib/plataformas";
import { aTiempoDeSalida, type Corte } from "@/lib/cortes";
import {
  FUENTES,
  IMAGEN_ANCHO_MAX,
  IMAGEN_ANCHO_MIN,
  LIENZOS,
  llevaFondo,
  medidasEfecto,
  medidasSubtitulo,
  palabrasDelTexto,
  panelesDe,
  posicionEn,
  SUBTITULO_TAMANO_MAX,
  SUBTITULO_TAMANO_MIN,
  subtituloPorDefecto,
  type DisenoClip,
  type EstadoRecorte,
  type FondoClip,
  type FormatoClip,
  type ImagenClip,
  type PosicionEfectiva,
  type SubtituloClip,
  type Texto,
} from "@/lib/clip-encuadre";
import type { EstiloClip, LineaSubtitulo } from "./tipos";
import { useTiempo, type Reproductor } from "./reproductor";

const redondo3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Cómo sale el clip: un canvas que copia, cuadro a cuadro, cada recuadro del
 * video a su panel, con los textos, las imágenes, el subtítulo y el Brand Kit
 * encima. Los recuadros salen de `posicionesEfectivas`, la misma cuenta que
 * usa el render: lo que se ve es lo que sale en el MP4.
 *
 * Los textos, las imágenes y el subtítulo se arrastran acá mismo; tocar uno lo
 * elige y abre su herramienta. Un archivo soltado encima se suma como imagen.
 */
export function VistaPrevia({
  reproductor,
  desde,
  hasta,
  efectiva,
  cortes,
  formato,
  diseno,
  fondo,
  posiciones,
  lineas,
  textos,
  onCambiarTextos,
  textoElegido,
  onElegirTexto,
  imagenes,
  vistasImagenes,
  onCambiarImagenes,
  imagenElegida,
  onElegirImagen,
  onSoltarImagen,
  estilo,
  estiloTexto,
  plantilla,
  nombreMarca,
  subtitulo,
  subtitulosActivos,
  onCambiarSubtitulo,
  onElegirSubtitulo,
  plataforma,
  puedeEditar,
}: {
  reproductor: Reproductor;
  desde: number;
  hasta: number;
  efectiva: number;
  cortes: Corte[];
  formato: FormatoClip;
  diseno: DisenoClip;
  fondo: FondoClip;
  posiciones: PosicionEfectiva[];
  lineas: LineaSubtitulo[];
  textos: Texto[];
  onCambiarTextos: (t: Texto[]) => void;
  textoElegido: number | null;
  onElegirTexto: (i: number) => void;
  imagenes: ImagenClip[];
  vistasImagenes: { src: string; estado: EstadoRecorte | null; lento?: boolean }[];
  onCambiarImagenes: (imagenes: ImagenClip[]) => void;
  imagenElegida: number | null;
  onElegirImagen: (i: number) => void;
  /** Sin esto, no se puede soltar un archivo. */
  onSoltarImagen?: (file: File) => void;
  estilo: EstiloClip;
  /** El estilo de texto ya con el tema de la marca, si no es KARAOKE. Null = como siempre. */
  estiloTexto: EstiloResuelto | null;
  plantilla: ReturnType<typeof plantillaDelClip>;
  nombreMarca?: string;
  subtitulo: SubtituloClip | null;
  subtitulosActivos: boolean;
  onCambiarSubtitulo: (s: SubtituloClip) => void;
  onElegirSubtitulo: () => void;
  /** La red encima de la vista previa (lib/plataformas): solo para mirar, no va al render. */
  plataforma: Plataforma | null;
  puedeEditar: boolean;
}) {
  const tr = useTranslations("editorRecorte");
  const ti = useTranslations("editorImagenes");
  const [soltando, setSoltando] = useState(false);
  const [anchoVista, setAnchoVista] = useState(0);
  const vista = useRef<HTMLDivElement>(null);
  const lienzoRef = useRef<HTMLCanvasElement>(null);
  const t = useTiempo(reproductor.reloj);
  const duracion = hasta - desde;
  const lienzo = LIENZOS[formato];
  const tc = Math.min(Math.max(0, t - desde), duracion);
  const ts = Math.min(aTiempoDeSalida(Math.min(Math.max(t, desde), hasta), desde, cortes), efectiva);

  // Lo último, para leerlo desde el bucle de dibujo sin reiniciarlo.
  const estado = useRef({ posiciones, formato, lienzo, desde, fondo });
  estado.current = { posiciones, formato, lienzo, desde, fondo };

  useLayoutEffect(() => {
    const el = vista.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setAnchoVista(el.clientWidth));
    obs.observe(el);
    setAnchoVista(el.clientWidth);
    return () => obs.disconnect();
  }, [formato]);

  // El dibujo: cada recuadro del video a su panel, cuadro a cuadro.
  useEffect(() => {
    let id = 0;
    const paso = () => {
      const v = reproductor.video.current;
      const c = lienzoRef.current;
      const e = estado.current;
      if (v && c && v.readyState >= 2 && v.videoWidth) {
        const ctx = c.getContext("2d");
        if (ctx) {
          const escala = c.width / e.lienzo.ancho;
          const pos = posicionEn(e.posiciones, v.currentTime - e.desde);
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, c.width, c.height);
          // El fondo desenfocado de HORIZONTAL y CENTRADO: el mismo video
          // cubriendo el lienzo, como en el render (boxblur 20:3, brillo −0.05).
          if (e.fondo === "DESENFOCADO" && llevaFondo(e.formato, pos.diseno)) {
            const k = Math.max(c.width / v.videoWidth, c.height / v.videoHeight);
            const w = v.videoWidth * k;
            const h = v.videoHeight * k;
            ctx.filter = `blur(${Math.round(c.width / 30)}px) brightness(0.95) saturate(0.9)`;
            ctx.drawImage(v, (c.width - w) / 2, (c.height - h) / 2, w, h);
            ctx.filter = "none";
          }
          panelesDe(e.formato, pos.diseno).forEach((panel, i) => {
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
  }, [reproductor.video]);

  const k = anchoVista / lienzo.ancho;
  const altoVista = (anchoVista * lienzo.alto) / lienzo.ancho;
  const linea = subtitulosActivos ? lineas.find((l) => tc >= l.desde && tc < l.hasta) : undefined;
  let palabraActiva = 0;
  linea?.palabras.forEach((p, i) => {
    if (p.desde <= tc) palabraActiva = i;
  });
  const { cuerpo, margenAbajo } = medidasSubtitulo(lienzo, diseno);

  /** Un arrastre con el puntero: `mover` recibe cuánto se corrió, en fracciones de la vista. */
  function arrastrar(e: React.PointerEvent, mover: (dx: number, dy: number) => void) {
    e.preventDefault();
    const caja = vista.current?.getBoundingClientRect();
    if (!caja) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const alMover = (ev: PointerEvent) => mover((ev.clientX - x0) / caja.width, (ev.clientY - y0) / caja.height);
    const soltar = () => {
      window.removeEventListener("pointermove", alMover);
      window.removeEventListener("pointerup", soltar);
    };
    window.addEventListener("pointermove", alMover);
    window.addEventListener("pointerup", soltar);
  }

  /**
   * Mover el subtítulo (arriba o abajo), o cambiarle el tamaño con la manija
   * de la derecha. El primer toque convierte el de siempre en uno propio, en
   * el mismo lugar y del mismo tamaño.
   */
  function arrastrarSubtitulo(e: React.PointerEvent, que: "mover" | "tamano") {
    e.stopPropagation();
    onElegirSubtitulo();
    if (!puedeEditar) return;
    const inicial = subtitulo ?? subtituloPorDefecto(lienzo, diseno);
    arrastrar(e, (dx, dy) => {
      if (que === "mover") {
        onCambiarSubtitulo({ ...inicial, centroY: redondo3(Math.min(0.95, Math.max(0.05, inicial.centroY + dy))) });
      } else {
        const f = Math.max(0.2, 1 + (dx * anchoVista) / 150);
        onCambiarSubtitulo({ ...inicial, tamano: Math.round(Math.min(SUBTITULO_TAMANO_MAX, Math.max(SUBTITULO_TAMANO_MIN, inicial.tamano * f))) });
      }
    });
  }

  function arrastrarTexto(e: React.PointerEvent, i: number) {
    e.stopPropagation();
    onElegirTexto(i);
    if (!puedeEditar) return;
    const inicial = textos[i];
    arrastrar(e, (dx, dy) => {
      const cx = Math.min(1, Math.max(0, inicial.centroX + dx));
      const cy = Math.min(1, Math.max(0, inicial.centroY + dy));
      onCambiarTextos(textos.map((x, j) => (j === i ? { ...x, centroX: redondo3(cx), centroY: redondo3(cy) } : x)));
    });
  }

  /** Mover una imagen, o agrandarla desde la esquina con el centro quieto. */
  function arrastrarImagen(e: React.PointerEvent, i: number, modo: "mover" | "agrandar") {
    e.stopPropagation();
    onElegirImagen(i);
    if (!puedeEditar) return;
    const inicial = imagenes[i];
    arrastrar(e, (dx, dy) => {
      const cambio =
        modo === "mover"
          ? { centroX: redondo3(Math.min(1, Math.max(0, inicial.centroX + dx))), centroY: redondo3(Math.min(1, Math.max(0, inicial.centroY + dy))) }
          : { ancho: redondo3(Math.min(IMAGEN_ANCHO_MAX, Math.max(IMAGEN_ANCHO_MIN, inicial.ancho + 2 * dx))) };
      onCambiarImagenes(imagenes.map((im, j) => (j === i ? { ...im, ...cambio } : im)));
    });
  }

  const aceptaSoltar = puedeEditar && !!onSoltarImagen;
  const zona = (c: Dibujo["caja"]) => ({ left: c.x * k, top: c.y * k, width: c.ancho * k, height: c.alto * k });
  const manija = "absolute right-2 top-1/2 hidden h-4 w-4 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-ng-tinta bg-ng-azul group-hover:block";

  return (
    <div
      ref={vista}
      onClick={reproductor.alternar}
      onDragOver={(e) => {
        if (!aceptaSoltar || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setSoltando(true);
      }}
      onDragLeave={() => setSoltando(false)}
      onDrop={(e) => {
        setSoltando(false);
        if (!aceptaSoltar) return;
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) onSoltarImagen?.(f);
      }}
      className="relative mx-auto w-full cursor-pointer overflow-hidden rounded-md bg-black"
      style={{
        aspectRatio: `${lienzo.ancho} / ${lienzo.alto}`,
        maxHeight: "var(--alto-escenario)",
        maxWidth: `calc(var(--alto-escenario) * ${lienzo.ancho / lienzo.alto})`,
      }}
    >
      <canvas
        ref={lienzoRef}
        width={Math.max(1, Math.round(anchoVista * 2))}
        height={Math.max(1, Math.round(altoVista * 2))}
        className="absolute inset-0 h-full w-full"
      />
      {imagenes.map((im, i) => {
        // En el tiempo original del clip, como los textos.
        const hastaIm = im.hastaSeg && im.hastaSeg > im.desdeSeg ? im.hastaSeg : duracion;
        const visible = tc >= im.desdeSeg && tc < hastaIm;
        const elegida = imagenElegida === i;
        if (!visible && !elegida) return null;
        const v = vistasImagenes[i] ?? { src: im.url, estado: null };
        const velo = v.estado === "PENDIENTE" || v.estado === "FALLIDO";
        return (
          <div
            key={im.id}
            onPointerDown={(e) => arrastrarImagen(e, i, "mover")}
            onClick={(e) => e.stopPropagation()}
            className={`group absolute ${puedeEditar ? "cursor-move" : ""} ${elegida ? "outline-dashed outline-2 outline-offset-2 outline-ng-azul" : ""} ${
              visible ? "" : "opacity-40"
            }`}
            style={{ left: im.centroX * anchoVista, top: im.centroY * altoVista, width: im.ancho * anchoVista, transform: "translate(-50%, -50%)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- la imagen viene del CDN, tal cual va al render */}
            <img src={v.src} alt="" draggable={false} className="pointer-events-none block h-auto w-full select-none" />
            {velo && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 p-1 text-center text-[10px] leading-tight text-white">
                {v.estado === "FALLIDO" ? ti("estados.FALLIDO") : v.lento ? ti("sigueProcesando") : im.sinFondo ? ti("estados.PENDIENTE") : ti("preparando")}
              </div>
            )}
            {puedeEditar && (
              <span
                onPointerDown={(e) => arrastrarImagen(e, i, "agrandar")}
                className={`absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-ng-tinta bg-ng-azul ${
                  elegida ? "block" : "hidden group-hover:block"
                }`}
              />
            )}
          </div>
        );
      })}
      {plantilla.logo && (
        // eslint-disable-next-line @next/next/no-img-element -- el logo viene del CDN de la marca, tal cual va al render
        <img src={plantilla.logo.url} alt="" style={estiloDelLogo(plantilla.logo.plantilla, anchoVista)} />
      )}
      {estiloTexto &&
        (() => {
          // Con estilo: todo lo dibuja el mismo cálculo que el render
          // (lib/estilos-texto). Encima van, invisibles, las zonas para
          // agarrar cada texto y el subtítulo.
          const llamada = plantilla.llamada;
          const delTexto = textos.map((tx, i) => {
            const fin = tx.hastaSeg && tx.hastaSeg > tx.desdeSeg ? tx.hastaSeg : duracion;
            const visible = tc >= tx.desdeSeg && tc < fin;
            // Con estilo propio no lo dibuja el estilo: va abajo, con su letra y sus colores.
            if (tx.estiloPropio) return null;
            if (!visible && textoElegido !== i) return null;
            const d = dibujarTexto(tx, estiloTexto.gancho, lienzo, { duracionSeg: duracion, nombreMarca, tc });
            return d && !visible ? { ...d, opacidad: 0.4 } : d;
          });
          // La llamada a la acción va en el tiempo del clip ya cortado.
          const deLlamada =
            llamada && ts >= llamada.desdeSeg && ts < (llamada.hastaSeg ?? efectiva)
              ? dibujarTexto(llamada, ganchoDeLlamada(estiloTexto.gancho, estiloTexto.tema), lienzo, { duracionSeg: efectiva, tc: ts })
              : null;
          const sub = linea ? dibujarSubtitulos(linea, tc, lienzo, diseno, estiloTexto.subtitulos, subtitulo) : null;
          return (
            <>
              <CapaDibujos lienzo={lienzo} dibujos={[sub, ...delTexto, deLlamada]} />
              {sub && (
                <div
                  onPointerDown={(e) => arrastrarSubtitulo(e, "mover")}
                  onClick={(e) => e.stopPropagation()}
                  title={puedeEditar ? tr("arrastraSubtitulo") : undefined}
                  className={`group absolute inset-x-0 ${puedeEditar ? "cursor-ns-resize hover:outline-dashed hover:outline-1 hover:outline-white/50" : ""}`}
                  style={{ top: sub.caja.y * k, height: sub.caja.alto * k }}
                >
                  {puedeEditar && <span onPointerDown={(e) => arrastrarSubtitulo(e, "tamano")} title={tr("arrastraTamano")} className={manija} />}
                </div>
              )}
              {delTexto.map((d, i) =>
                d ? (
                  <div
                    key={i}
                    onPointerDown={(e) => arrastrarTexto(e, i)}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute ${puedeEditar ? "cursor-move" : ""} ${
                      textoElegido === i ? "outline-dashed outline-2 outline-offset-4 outline-ng-azul" : ""
                    }`}
                    style={zona(d.caja)}
                  />
                ) : null,
              )}
              {deLlamada && <div onClick={(e) => e.stopPropagation()} title={tr("llamadaBrandKit")} className="absolute" style={zona(deLlamada.caja)} />}
            </>
          );
        })()}
      {[...textos, ...(!estiloTexto && plantilla.llamada ? [plantilla.llamada] : [])].map((tx, i) => {
          // La llamada a la acción es de la plantilla: se ve, pero no se mueve ni se elige acá.
          const deLaPlantilla = i >= textos.length;
          // Con un estilo de texto, acá van solo los textos con estilo propio (el resto lo dibuja el estilo).
          if (estiloTexto && (deLaPlantilla || !tx.estiloPropio)) return null;
          // Los textos, en el tiempo original del clip; la llamada, en el del clip ya cortado.
          const [ahora, dur] = deLaPlantilla ? [ts, efectiva] : [tc, duracion];
          const fin = tx.hastaSeg && tx.hastaSeg > tx.desdeSeg ? tx.hastaSeg : dur;
          const visible = ahora >= tx.desdeSeg && ahora < fin;
          const elegido = !deLaPlantilla && textoElegido === i;
          if (!visible && !elegido) return null;
          const f = FUENTES[tx.fuente] ?? FUENTES.ANTON;
          const { borde, sombra } = medidasEfecto(tx.efecto, tx.tamano);
          const caja = tx.efecto === "CAJA";
          return (
            <div
              key={i}
              onPointerDown={deLaPlantilla ? undefined : (e) => arrastrarTexto(e, i)}
              onClick={(e) => e.stopPropagation()}
              title={deLaPlantilla ? tr("llamadaBrandKit") : undefined}
              className={`absolute text-center ${puedeEditar && !deLaPlantilla ? "cursor-move" : ""} ${
                elegido ? "outline-dashed outline-2 outline-offset-4 outline-ng-azul" : ""
              } ${visible ? "" : "opacity-40"}`}
              style={{
                left: tx.centroX * anchoVista,
                top: tx.centroY * altoVista,
                transform: "translate(-50%, -50%)",
                width: "max-content",
                maxWidth: tx.ancho * anchoVista,
                fontFamily: `'${f.familia}', sans-serif`,
                fontWeight: f.peso,
                fontStyle: f.italica ? "italic" : undefined,
                // libass mide por la altura "win": ver FUENTES.
                fontSize: tx.tamano * f.factorCss * k,
                lineHeight: `${tx.tamano * (tx.interlineado ?? 1) * k}px`,
                color: tx.color,
                ...(tx.efecto === "CONTORNO" ? { WebkitTextStroke: `${2 * borde * k}px ${tx.colorEfecto}`, paintOrder: "stroke fill" } : {}),
                ...(tx.efecto === "SOMBRA" ? { textShadow: `${sombra * k}px ${sombra * k}px 0 ${tx.colorEfecto}` } : {}),
              }}
            >
              <span
                style={
                  caja
                    ? { background: tx.colorEfecto, padding: `${borde * k * 0.35}px ${borde * k}px`, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }
                    : undefined
                }
              >
                {palabrasDelTexto(tx).map((w, j) => (
                  <span key={j} style={w.destacada ? { color: tx.colorDestacado } : undefined}>
                    {j > 0 ? w.salto ? <br /> : " " : ""}
                    {w.texto}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      {!estiloTexto &&
        linea &&
        (() => {
          // Con subtítulo propio: su letra, cuerpo, efecto y altura (centrado
          // en centroY, como el \\an5\\pos del render). Sin él, el de siempre.
          const sp = subtitulo;
          const f = FUENTES[sp?.fuente ?? "NUNITO"] ?? FUENTES.NUNITO;
          const c = sp ? sp.tamano : cuerpo;
          const efecto = sp?.efecto ?? "CONTORNO";
          const borde = efecto === "CONTORNO" ? Math.max(3, Math.round(c * 0.14)) : efecto === "CAJA" ? Math.max(6, Math.round(c * 0.22)) : 0;
          const sombra = efecto === "SOMBRA" ? Math.max(3, Math.round(c * 0.07)) : 0;
          return (
            <div
              onPointerDown={(e) => arrastrarSubtitulo(e, "mover")}
              onClick={(e) => e.stopPropagation()}
              title={puedeEditar ? tr("arrastraSubtitulo") : undefined}
              className={`group absolute inset-x-0 text-center ${puedeEditar ? "cursor-ns-resize hover:outline-dashed hover:outline-1 hover:outline-white/50" : ""}`}
              style={{
                ...(sp ? { top: sp.centroY * altoVista, transform: "translateY(-50%)" } : { bottom: margenAbajo * k }),
                padding: `0 ${60 * k}px`,
                fontFamily: `'${f.familia}', sans-serif`,
                fontWeight: f.peso,
                fontStyle: f.italica ? "italic" : undefined,
                // Mismo factor que los textos: libass mide por la altura "win".
                fontSize: c * f.factorCss * k,
                lineHeight: `${c * k}px`,
                color: estilo.colorSubtitulo,
                textTransform: sp?.mayusculas ? "uppercase" : undefined,
                ...(efecto === "CONTORNO" ? { WebkitTextStroke: `${2 * borde * k}px #000`, paintOrder: "stroke fill" } : {}),
                ...(efecto === "SOMBRA" ? { textShadow: `${sombra * k}px ${sombra * k}px 0 #000` } : {}),
              }}
            >
              <span
                style={
                  efecto === "CAJA"
                    ? { background: "#000", padding: `${borde * k * 0.35}px ${borde * k}px`, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }
                    : undefined
                }
              >
                {linea.palabras.map((p, i) => (
                  <span key={`${p.desde}-${i}`} style={i === palabraActiva ? { color: estilo.colorResaltado } : undefined}>
                    {i > 0 ? " " : ""}
                    {p.texto}
                  </span>
                ))}
              </span>
              {puedeEditar && <span onPointerDown={(e) => arrastrarSubtitulo(e, "tamano")} title={tr("arrastraTamano")} className={manija} />}
            </div>
          );
        })()}
      {soltando && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white outline-dashed outline-2 -outline-offset-4 outline-ng-azul">
          {ti("soltaAca")}
        </div>
      )}
      {formato === "VERTICAL" && plataforma && anchoVista > 0 && (
        <InterfazPlataforma plataforma={plataforma} ancho={anchoVista} nombreMarca={nombreMarca} />
      )}
    </div>
  );
}
