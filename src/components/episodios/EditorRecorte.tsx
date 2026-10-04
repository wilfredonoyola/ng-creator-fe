"use client";

import { estiloDelLogo, plantillaDelClip, type PlantillaClip } from "@/lib/plantilla-clip";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useHls } from "@/lib/use-hls";
import { dibujarSubtitulos, dibujarTexto, ganchoDeLlamada, type Dibujo, type EstiloResuelto, type EstiloTexto, type Tema } from "@/lib/estilos-texto";
import { CapaDibujos } from "@/components/estilos/CapaDibujos";
import { Pista } from "@/components/Pista";
import { InterfazPlataforma, SelectorPlataforma } from "@/components/estilos/InterfazPlataforma";
import type { Plataforma } from "@/lib/plataformas";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  ajustarRegion,
  FUENTES,
  LIENZOS,
  llevaFondo,
  medidasEfecto,
  SUBTITULO_TAMANO_MAX,
  SUBTITULO_TAMANO_MIN,
  subtituloPorDefecto,
  palabrasDelTexto,
  medidasSubtitulo,
  panelesDe,
  posicionEn,
  posicionesEfectivas,
  REGION_MINIMA,
  regionPorDefecto,
  type DisenoClip,
  type Encuadre,
  type FondoClip,
  type SubtituloClip,
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
  /** El logo de la marca y su plantilla de clips (be#117). */
  logoUrl?: string | null;
  plantilla?: PlantillaClip | null;
  /** Los colores de la marca para los estilos de texto (be#132). */
  tema: Tema;
  /** El estilo de texto de la marca: el de los clips que no eligieron otro. */
  estiloTexto: EstiloTexto;
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
  inspector,
  duracionEpisodio,
  onCambiarTramo,
  onCambiarFormato,
  fondo = "DESENFOCADO",
  onCambiarFondo,
  subtitulo = null,
  plantillaActiva = true,
  onCambiarSubtitulo,
  autoEncuadre,
  estiloTexto = null,
  nombreMarca,
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
  /**
   * Los ajustes del clip (el inspector con sus pestañas). Con el ancho para
   * tres columnas va al lado de la vista previa; si no, desde md, a la derecha
   * del video y la vista previa apilados; en el teléfono, debajo de todo.
   */
  inspector?: ReactNode;
  /** Para la barra del tramo: hasta dónde se puede extender el clip. */
  duracionEpisodio: number;
  onCambiarTramo: (desde: number, hasta: number) => void;
  onCambiarFormato: (f: FormatoClip) => void;
  /** Alrededor del recuadro en HORIZONTAL y CENTRADO. */
  fondo?: FondoClip;
  onCambiarFondo?: (f: FondoClip) => void;
  /** Letra, tamaño y altura propios de los subtítulos (null = los de siempre). */
  subtitulo?: SubtituloClip | null;
  /** Si el clip lleva la plantilla de la marca: el logo y la llamada a la acción se ven en la vista previa. */
  plantillaActiva?: boolean;
  onCambiarSubtitulo?: (s: SubtituloClip) => void;
  /** El botón que sigue al que habla (ng-creator-be#105). */
  autoEncuadre?: {
    analizando: boolean;
    /** 0-1 mientras analiza. */
    progreso?: number | null;
    resumen?: string | null;
    /** Cuántas personas encontró: va en un globito en el botón. */
    personas?: number | null;
    onPedir: () => void;
    /** El panel de avance y resultado; recibe cómo llevar la vista previa a un segundo del clip. */
    panel?: (ir: (segDelClip: number) => void) => ReactNode;
    /** Cambia cuando llegan encuadres nuevos: se resaltan y la vista previa va al primer cambio. */
    resaltar?: number;
  };
  /**
   * El estilo de texto del clip ya con el tema de la marca (be#132), si no es
   * KARAOKE: el gancho, los textos, la llamada a la acción y los subtítulos se
   * dibujan como los dibuja el render con ese estilo. Null = como siempre.
   */
  estiloTexto?: EstiloResuelto | null;
  /** Para el rótulo (ROTULO): va chico arriba del gancho. */
  nombreMarca?: string;
}) {
  const tr = useTranslations("editorRecorte");
  const video = useRef<HTMLVideoElement>(null);
  const cuadro = useRef<HTMLDivElement>(null);
  const lienzoRef = useRef<HTMLCanvasElement>(null);
  const [fuente, setFuente] = useState({ ancho: 1280, alto: 720 });
  const [t, setT] = useState(desde);
  const [sonando, setSonando] = useState(false);
  const [anchoVista, setAnchoVista] = useState(0);
  // La red encima de la vista previa (lib/plataformas): solo para mirar, no va al render.
  const [plataforma, setPlataforma] = useState<Plataforma | null>(null);
  const vista = useRef<HTMLDivElement>(null);
  useHls(video, url);

  const duracion = hasta - desde;
  const plantilla = plantillaDelClip(estilo, plantillaActiva, duracion);
  const posiciones = posicionesEfectivas(
    { formato, diseno, encuadre, posiciones: posicionesGuardadas },
    fuente,
    duracion,
  );
  const tc = Math.min(Math.max(0, t - desde), duracion);
  const lienzo = LIENZOS[formato];
  const activa = posicionEn(posiciones, tc);
  const indiceActiva = posiciones.indexOf(activa);
  // Cada tramo tiene su diseño (be#105, etapa 2): los recuadros son los del
  // tramo donde está parado el video.
  const disenoActivo = activa.diseno;
  const paneles = panelesDe(formato, disenoActivo);
  const formatos = FORMATOS.map((f) => ({ ...f, titulo: tr(`formatos.${f.valor}`) }));
  const disenos = DISENOS.map((d) => ({ valor: d, etiqueta: tr(`disenos.${d}.etiqueta`), titulo: tr(`disenos.${d}.titulo`) }));
  const fondos = FONDOS.map((f) => ({ valor: f, etiqueta: tr(`fondos.${f}.etiqueta`), titulo: tr(`fondos.${f}.titulo`) }));

  // Lo último, para leerlo desde el bucle de dibujo sin reiniciarlo.
  const conFondo = posiciones.some((p) => llevaFondo(formato, p.diseno));
  const estado = useRef({ posiciones, formato, lienzo, desde, hasta, fondo });
  estado.current = { posiciones, formato, lienzo, desde, hasta, fondo };

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
          const panelesPos = panelesDe(e.formato, pos.diseno);
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
          panelesPos.forEach((panel, i) => {
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

  // Encuadres nuevos del auto-encuadre: la vista previa va un segundo antes del
  // primer cambio, para verlo pasar.
  const resaltar = autoEncuadre?.resaltar ?? 0;
  const primerCambio = posiciones[1]?.desdeSeg;
  useEffect(() => {
    if (!resaltar) return;
    const v = video.current;
    if (v) v.currentTime = desde + Math.max(0, (primerCambio ?? 1) - 1);
    // Solo cuando llega un resultado nuevo, no cada vez que se mueve un tramo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resaltar]);

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

  /**
   * El diseño del tramo donde está parado el video. Con la misma cantidad de
   * recuadros, cada uno conserva su lugar; si cambia, se arranca de los de
   * siempre (en Uno, centrado en donde estaba el primero).
   */
  function cambiarDisenoTramo(d: DisenoClip) {
    if (d === disenoActivo) return;
    const nuevos = panelesDe(formato, d);
    const regiones = nuevos.map((panel, i) => {
      const previa = activa.regiones.length === nuevos.length ? activa.regiones[i] : nuevos.length === 1 ? activa.regiones[0] : null;
      return previa ? ajustarRegion(previa, fuente, panel) : regionPorDefecto(fuente, panel, i, nuevos.length);
    });
    onCambiarPosiciones(posiciones.map((p, k) => (k === indiceActiva ? { ...p, diseno: d, regiones } : p)));
  }

  /** Un cambio de encuadre donde está parado el video, copiando el actual. */
  function nuevaPosicion() {
    const seg = Math.round(tc * 100) / 100;
    if (posiciones.some((p) => Math.abs(p.desdeSeg - seg) < 0.2)) return;
    const nuevas = [...posiciones, { desdeSeg: seg, diseno: activa.diseno, regiones: activa.regiones.map((r) => ({ ...r })) }].sort(
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

  /**
   * Mover el subtítulo arrastrándolo (arriba o abajo), o cambiarle el tamaño
   * con la manija de la derecha. El primer toque convierte el de siempre en
   * uno propio, en el mismo lugar y del mismo tamaño.
   */
  function arrastrarSubtitulo(e: React.PointerEvent, que: "mover" | "tamano") {
    if (!puedeEditar || !onCambiarSubtitulo) return;
    e.stopPropagation();
    e.preventDefault();
    const caja = vista.current?.getBoundingClientRect();
    if (!caja) return;
    const inicial = subtitulo ?? subtituloPorDefecto(lienzo, diseno);
    const x0 = e.clientX;
    const y0 = e.clientY;
    const mover = (ev: PointerEvent) => {
      if (que === "mover") {
        const cy = Math.min(0.95, Math.max(0.05, inicial.centroY + (ev.clientY - y0) / caja.height));
        onCambiarSubtitulo({ ...inicial, centroY: redondo3(cy) });
      } else {
        const f = Math.max(0.2, 1 + (ev.clientX - x0) / 150);
        const t = Math.round(Math.min(SUBTITULO_TAMANO_MAX, Math.max(SUBTITULO_TAMANO_MIN, inicial.tamano * f)));
        onCambiarSubtitulo({ ...inicial, tamano: t });
      }
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

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
    // Desde md el editor ocupa el alto de la ventana y cada columna scrollea
    // por dentro. Las columnas están en globals.css (editor-clip) y dependen
    // del ancho que tiene el editor, no de la ventana: con el ancho para tres,
    // video, vista previa e inspector; si no, el video y la vista previa
    // apilados a la izquierda y el inspector a la derecha.
    <div
      className="editor-clip flex flex-col gap-3 md:grid md:h-full md:min-h-0"
      style={{ "--ratio-vista": lienzo.ancho / lienzo.alto } as React.CSSProperties}
    >
      <div className="editor-izquierda flex flex-col gap-3">
      {/* ---- El cuadro entero, con los recuadros ---- */}
      <div className="editor-video editor-columna rounded-xl border border-white/10 bg-white/[0.03] p-3">
        {/* Formato, diseño y fondo en una sola fila de controles segmentados:
            lo que más se toca es el recuadro y el video, no esto. Lo que hace
            cada uno va en su pista (al pasar el mouse). */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Pestanas opciones={formatos} valor={formato} onCambio={onCambiarFormato} deshabilitado={!puedeEditar} />
          <div
            className="flex rounded-lg border border-white/10 bg-black/30 p-0.5"
            role="group"
            aria-label={posiciones.length > 1 ? tr("disenoDelTramo") : tr("diseno")}
          >
            {disenos.map((d) => (
              <Pista key={d.valor} texto={`${d.etiqueta}: ${d.titulo}${posiciones.length > 1 ? tr("enEsteTramo") : ""}`}>
                <button
                  disabled={!puedeEditar}
                  onClick={() => cambiarDisenoTramo(d.valor)}
                  aria-label={`${d.etiqueta}: ${d.titulo}`}
                  aria-pressed={d.valor === disenoActivo}
                  className={`flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition disabled:opacity-50 ${
                    d.valor === disenoActivo ? "bg-ng-azul/20 font-medium text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  <MiniDiseno diseno={d.valor} horizontal={formato === "HORIZONTAL"} activo={d.valor === disenoActivo} chico />
                  {/* Si la columna es angosta, solo el dibujito (globals.css). */}
                  <span className="etiqueta-diseno">{d.etiqueta}</span>
                </button>
              </Pista>
            ))}
          </div>
          {conFondo && onCambiarFondo && (
            <Pestanas opciones={fondos} valor={fondo} onCambio={onCambiarFondo} deshabilitado={!puedeEditar} />
          )}
          <span className="ml-auto flex items-center gap-1.5 whitespace-nowrap text-xs tabular-nums text-white/45">
            {posiciones.length > 1 && (
              <>
                {tr("tramo", {
                  desde: activa.desdeSeg.toFixed(1),
                  hasta: (indiceActiva + 1 < posiciones.length ? posiciones[indiceActiva + 1].desdeSeg : duracion).toFixed(1),
                })}
              </>
            )}
            {puedeEditar && (
              <Pista texto={tr("ayudaRecuadro")} lado="abajo-derecha">
                <Info size={14} className="text-white/40" aria-label={tr("ayudaRecuadroEtiqueta")} tabIndex={0} />
              </Pista>
            )}
          </span>
        </div>
        {/* El cuadro entero, con un tope de alto: así entran abajo el
            reproductor y los encuadres sin tener que bajar. */}
        <div
          ref={cuadro}
          className="relative mx-auto w-full touch-none select-none overflow-hidden rounded-lg bg-black"
          style={{
            aspectRatio: `${fuente.ancho} / ${fuente.alto}`,
            // Todo el ancho de la columna, con un tope de alto para que
            // entren abajo el reproductor, el tramo y los encuadres.
            maxHeight: "var(--alto-cuadro)",
            maxWidth: `calc(var(--alto-cuadro) * ${fuente.ancho / fuente.alto})`,
          }}
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
                className="absolute left-1 top-1 rounded px-1 text-xs font-semibold text-black"
                style={{ background: COLORES[i] }}
              >
                {paneles.length > 1 ? (paneles[i].y > 0 || paneles[i].x > 0 ? tr("abajo") : tr("arriba")) : formato === "VERTICAL" ? "9:16" : formato === "CUADRADO" ? "1:1" : "16:9"}
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-marca text-ng-tinta"
            title={sonando ? tr("pausa") : tr("reproducir")}
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
                key={`${resaltar}-${i}`}
                className="pointer-events-none absolute top-0 h-2 w-0.5 bg-amber-300"
                style={{
                  left: `${(p.desdeSeg / duracion) * 100}%`,
                  animation: resaltar ? `aparecer 0.4s ease-out ${i * 0.08}s both, resaltar 2.4s ease-out ${i * 0.08}s` : undefined,
                }}
              />
            ))}
          </div>
          <span className="shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-white/50">
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
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <p className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium uppercase tracking-wide text-white/50">
              {tr("encuadres", { n: posiciones.length })}
              <Pista texto={tr("ayudaEncuadres")}>
                <Info size={14} className="text-white/40" aria-label={tr("ayudaEncuadresEtiqueta")} tabIndex={0} />
              </Pista>
            </p>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
              {puedeEditar && autoEncuadre && (
                <Pista texto={tr("ayudaAuto")} lado="abajo-derecha">
                  <button
                    onClick={autoEncuadre.onPedir}
                    disabled={autoEncuadre.analizando}
                    className="flex h-7 items-center gap-1.5 whitespace-nowrap rounded-lg bg-ng-violeta px-2.5 text-xs font-medium text-ng-tinta hover:brightness-110 disabled:opacity-70"
                  >
                    {autoEncuadre.analizando ? (
                      `${tr("mirando")} ${autoEncuadre.progreso ? `${Math.round(autoEncuadre.progreso * 100)}%` : ""}`
                    ) : (
                      <>
                        {tr("autoEncuadre")}
                        {autoEncuadre.personas != null && (
                          <span
                            className="rounded-full bg-white/20 px-1.5 text-xs leading-4 tabular-nums"
                            aria-label={tr("personas", { n: autoEncuadre.personas })}
                          >
                            {autoEncuadre.personas}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                </Pista>
              )}
              {puedeEditar && (
                <Pista texto={tr("ayudaNuevo", { seg: tc.toFixed(1) })} lado="abajo-derecha">
                  <button
                    onClick={nuevaPosicion}
                    className="flex h-7 items-center whitespace-nowrap rounded-lg border border-white/15 px-2.5 text-xs text-white/80 hover:bg-white/5"
                  >
                    {tr("nuevoEncuadre")}
                  </button>
                </Pista>
              )}
            </div>
          </div>
          {/* Una sola fila: con muchos encuadres scrollea de costado. */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {posiciones.map((p, i) => {
              const fin = i + 1 < posiciones.length ? posiciones[i + 1].desdeSeg : duracion;
              return (
                <div
                  key={`${resaltar}-${i}`}
                  className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-1 text-xs tabular-nums ${
                    i === indiceActiva ? "border-amber-300 text-white" : "border-white/15 text-white/60"
                  }`}
                  style={{
                    animation: resaltar ? `aparecer 0.4s ease-out ${i * 0.08}s both, resaltar 2.4s ease-out ${i * 0.08}s` : undefined,
                  }}
                >
                  <button onClick={() => ir(p.desdeSeg)}>
                    {p.desdeSeg.toFixed(1)}–{fin.toFixed(1)} s
                    {posiciones.some((x) => x.diseno !== posiciones[0].diseno) && (
                      <span className="ml-1 text-white/45">· {disenos.find((d) => d.valor === p.diseno)?.etiqueta}</span>
                    )}
                  </button>
                  {puedeEditar && i > 0 && (
                    <button onClick={() => quitarPosicion(i)} className="text-white/40 hover:text-red-400" title={tr("quitar")}>
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {autoEncuadre?.panel?.(ir)}
        </div>
      </div>

      {/* ---- La vista previa: siempre a la vista, al lado del inspector ---- */}
      <div className="editor-columna">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-sm font-medium">
            {tr("vistaPrevia", { formato: formato === "VERTICAL" ? "9:16" : formato === "CUADRADO" ? "1:1" : "16:9" })}
          </p>
          {formato === "VERTICAL" && (
            <div className="mb-2">
              <SelectorPlataforma valor={plataforma} onCambio={setPlataforma} />
            </div>
          )}
          <div
            ref={vista}
            onClick={alternar}
            className="relative mx-auto cursor-pointer overflow-hidden rounded-lg bg-black"
            style={{
              aspectRatio: `${lienzo.ancho} / ${lienzo.alto}`,
              maxHeight: "var(--alto-vista)",
              maxWidth: "calc(var(--alto-vista) * var(--ratio-vista))",
            }}
          >
            <canvas
              ref={lienzoRef}
              width={Math.max(1, Math.round(anchoVista * 2))}
              height={Math.max(1, Math.round(altoVista * 2))}
              className="absolute inset-0 h-full w-full"
            />
            {plantilla.logo && (
              // eslint-disable-next-line @next/next/no-img-element -- el logo viene del CDN de la marca, tal cual va al render
              <img src={plantilla.logo.url} alt="" style={estiloDelLogo(plantilla.logo.plantilla, anchoVista)} />
            )}
            {estiloTexto && (() => {
              // Con estilo: todo lo dibuja el mismo cálculo que el render
              // (lib/estilos-texto). Encima van, invisibles, las zonas para
              // agarrar cada texto y el subtítulo, como en el de siempre.
              const llamada = plantilla.llamada;
              const delTexto = textos.map((tx, i) => {
                const hasta = tx.hastaSeg && tx.hastaSeg > tx.desdeSeg ? tx.hastaSeg : duracion;
                const visible = tc >= tx.desdeSeg && tc < hasta;
                if (!visible && textoElegido !== i) return null;
                const d = dibujarTexto(tx, estiloTexto.gancho, lienzo, { duracionSeg: duracion, nombreMarca, tc });
                return d && !visible ? { ...d, opacidad: 0.4 } : d;
              });
              const deLlamada =
                llamada && tc >= llamada.desdeSeg && tc < (llamada.hastaSeg ?? duracion)
                  ? dibujarTexto(llamada, ganchoDeLlamada(estiloTexto.gancho, estiloTexto.tema), lienzo, { duracionSeg: duracion, tc })
                  : null;
              const sub = linea ? dibujarSubtitulos(linea, tc, lienzo, diseno, estiloTexto.subtitulos, subtitulo) : null;
              const editableSub = puedeEditar && !!onCambiarSubtitulo;
              const zona = (c: Dibujo["caja"]) => ({ left: c.x * k, top: c.y * k, width: c.ancho * k, height: c.alto * k });
              return (
                <>
                  <CapaDibujos lienzo={lienzo} dibujos={[sub, ...delTexto, deLlamada]} />
                  {sub && (
                    <div
                      onPointerDown={(e) => arrastrarSubtitulo(e, "mover")}
                      onClick={(e) => e.stopPropagation()}
                      title={editableSub ? tr("arrastraSubtitulo") : undefined}
                      className={`group absolute inset-x-0 ${editableSub ? "cursor-ns-resize hover:outline-dashed hover:outline-1 hover:outline-white/50" : "pointer-events-none"}`}
                      style={{ top: sub.caja.y * k, height: sub.caja.alto * k }}
                    >
                      {editableSub && (
                        <span
                          onPointerDown={(e) => arrastrarSubtitulo(e, "tamano")}
                          title={tr("arrastraTamano")}
                          className="absolute right-2 top-1/2 hidden h-4 w-4 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-ng-azul bg-white group-hover:block"
                        />
                      )}
                    </div>
                  )}
                  {delTexto.map((d, i) =>
                    d ? (
                      <div
                        key={i}
                        onPointerDown={(e) => arrastrarTexto(e, i)}
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute ${puedeEditar ? "cursor-move" : ""} ${
                          textoElegido === i ? "outline-dashed outline-1 outline-offset-4 outline-white/70" : ""
                        }`}
                        style={zona(d.caja)}
                      />
                    ) : null,
                  )}
                  {deLlamada && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      title={tr("llamadaBrandKit")}
                      className="absolute"
                      style={zona(deLlamada.caja)}
                    />
                  )}
                </>
              );
            })()}
            {!estiloTexto && [...textos, ...(plantilla.llamada ? [plantilla.llamada] : [])].map((tx, i) => {
              // La llamada a la acción es de la plantilla: se ve, pero no se mueve ni se elige acá.
              const deLaPlantilla = i >= textos.length;
              const hasta = tx.hastaSeg && tx.hastaSeg > tx.desdeSeg ? tx.hastaSeg : duracion;
              const visible = tc >= tx.desdeSeg && tc < hasta;
              const elegido = !deLaPlantilla && textoElegido === i;
              if (!visible && !elegido) return null;
              const f = FUENTES[tx.fuente] ?? FUENTES.ANTON;
              const { borde, sombra } = medidasEfecto(tx.efecto, tx.tamano);
              const palabras = palabrasDelTexto(tx);
              const caja = tx.efecto === "CAJA";
              return (
                <div
                  key={i}
                  onPointerDown={deLaPlantilla ? undefined : (e) => arrastrarTexto(e, i)}
                  onClick={(e) => e.stopPropagation()}
                  title={deLaPlantilla ? tr("llamadaBrandKit") : undefined}
                  className={`absolute text-center ${puedeEditar && !deLaPlantilla ? "cursor-move" : ""} ${
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
            {!estiloTexto && linea && (() => {
              // Con subtítulo propio: su letra, cuerpo, efecto y altura (centrado
              // en centroY, como el \\an5\\pos del render). Sin él, el de siempre.
              const sp = subtitulo;
              const f = FUENTES[sp?.fuente ?? "NUNITO"] ?? FUENTES.NUNITO;
              const c = sp ? sp.tamano : cuerpo;
              const efecto = sp?.efecto ?? "CONTORNO";
              const borde = efecto === "CONTORNO" ? Math.max(3, Math.round(c * 0.14)) : efecto === "CAJA" ? Math.max(6, Math.round(c * 0.22)) : 0;
              const sombra = efecto === "SOMBRA" ? Math.max(3, Math.round(c * 0.07)) : 0;
              const editable = puedeEditar && !!onCambiarSubtitulo;
              return (
                <div
                  onPointerDown={(e) => arrastrarSubtitulo(e, "mover")}
                  onClick={(e) => e.stopPropagation()}
                  title={editable ? tr("arrastraSubtitulo") : undefined}
                  className={`group absolute inset-x-0 text-center ${editable ? "cursor-ns-resize hover:outline-dashed hover:outline-1 hover:outline-white/50" : "pointer-events-none"}`}
                  style={{
                    ...(sp
                      ? { top: sp.centroY * altoVista, transform: "translateY(-50%)" }
                      : { bottom: margenAbajo * k }),
                    padding: `0 ${60 * k}px`,
                    fontFamily: `'${f.familia}', sans-serif`,
                    fontWeight: (sp?.fuente ?? "NUNITO") === "NUNITO" ? 900 : 400,
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
                  {editable && (
                    <span
                      onPointerDown={(e) => arrastrarSubtitulo(e, "tamano")}
                      title={tr("arrastraTamano")}
                      className="absolute right-2 top-1/2 hidden h-4 w-4 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-ng-azul bg-white group-hover:block"
                    />
                  )}
                </div>
              );
            })()}
            {formato === "VERTICAL" && plataforma && anchoVista > 0 && (
              <InterfazPlataforma plataforma={plataforma} ancho={anchoVista} nombreMarca={nombreMarca} />
            )}
          </div>
        </div>
      </div>
      </div>

      {inspector && <div className="md:min-h-0">{inspector}</div>}
    </div>
  );
}

const FORMATOS = [
  { valor: "VERTICAL", etiqueta: "9:16" },
  { valor: "CUADRADO", etiqueta: "1:1" },
  { valor: "HORIZONTAL", etiqueta: "16:9" },
] as const satisfies readonly { valor: FormatoClip; etiqueta: string }[];

const DISENOS = ["UNO", "DIVIDIDO", "HORIZONTAL", "CENTRADO"] as const satisfies readonly DisenoClip[];

const FONDOS = ["DESENFOCADO", "NEGRO"] as const satisfies readonly FondoClip[];

/** El dibujito del diseño en su botón, el mismo que en la app. */
function MiniDiseno({
  diseno,
  horizontal,
  activo,
  chico = false,
}: {
  diseno: DisenoClip;
  horizontal: boolean;
  activo: boolean;
  /** El de la fila de botones: del alto de una letra. */
  chico?: boolean;
}) {
  const borde = activo ? "border-ng-celeste" : "border-white/40";
  const relleno = activo ? "bg-ng-celeste/80" : "bg-white/40";
  const tamano = chico ? (horizontal ? "h-2.5 w-4" : "h-4 w-2.5") : horizontal ? "h-6 w-10" : "h-10 w-6";
  return (
    <div className={`flex gap-px ${tamano} ${horizontal ? "flex-row" : "flex-col"}`}>
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
          className={`h-7 whitespace-nowrap rounded-md px-2 text-xs transition ${
            o.valor === valor ? "bg-marca font-medium text-ng-tinta" : "text-white/60 hover:text-white"
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
  const tr = useTranslations("editorRecorte");
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

  const boton = "whitespace-nowrap rounded border border-white/15 px-1.5 py-0.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-40";
  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-white/45">
        <span className="flex items-center gap-1.5 whitespace-nowrap font-medium uppercase tracking-wide text-white/50">
          {tr("barra.titulo")}
          <Pista texto={tr("barra.ayuda")}>
            <Info size={14} className="text-white/40" aria-label={tr("barra.ayudaEtiqueta")} tabIndex={0} />
          </Pista>
        </span>
        <span className="whitespace-nowrap tabular-nums">
          {reloj(desde)} – {reloj(hasta)} · {(hasta - desde).toFixed(1)} s
        </span>
      </div>
      {/* La barra a todo el ancho y debajo los botones de a 5 s, del inicio a
          la izquierda y del final a la derecha: en una columna angosta, los
          cuatro al lado de la barra la dejaban sin lugar. */}
      <div ref={barra} className="relative h-9 touch-none select-none rounded-md bg-white/[0.06]">
        <div
          className="absolute inset-y-0 rounded-md border-2 border-ng-azul bg-ng-teal/15"
          style={{ left: `${pct(desde)}%`, width: `${pct(hasta) - pct(desde)}%` }}
        >
          <div
            onPointerDown={(e) => arrastrar(e, "desde")}
            className="absolute -left-1.5 inset-y-0 w-3 cursor-ew-resize rounded-sm bg-marca"
            title={tr("barra.arrastraInicio")}
          />
          <div
            onPointerDown={(e) => arrastrar(e, "hasta")}
            className="absolute -right-1.5 inset-y-0 w-3 cursor-ew-resize rounded-sm bg-marca"
            title={tr("barra.arrastraFinal")}
          />
        </div>
        {t >= ventana.ini && t <= ventana.fin && (
          <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white" style={{ left: `${pct(t)}%` }} />
        )}
        <span className="pointer-events-none absolute bottom-0.5 left-1 text-xs leading-none tabular-nums text-white/30">
          {reloj(ventana.ini)}
        </span>
        <span className="pointer-events-none absolute bottom-0.5 right-1 text-xs leading-none tabular-nums text-white/30">
          {reloj(ventana.fin)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-white/40">{tr("barra.inicio")}</span>
          <button className={boton} disabled={deshabilitado} onClick={() => onCambiar(...acotar(desde - 5, hasta))} title={tr("barra.inicioAntes")}>
            ←5s
          </button>
          <button className={boton} disabled={deshabilitado} onClick={() => onCambiar(...acotar(Math.min(desde + 5, hasta - 1), hasta))} title={tr("barra.inicioDespues")}>
            5s→
          </button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-white/40">{tr("barra.final")}</span>
          <button className={boton} disabled={deshabilitado} onClick={() => onCambiar(...acotar(desde, Math.max(hasta - 5, desde + 1)))} title={tr("barra.finalAntes")}>
            ←5s
          </button>
          <button className={boton} disabled={deshabilitado} onClick={() => onCambiar(...acotar(desde, hasta + 5))} title={tr("barra.finalDespues")}>
            5s→
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
