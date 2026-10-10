"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import {
  AUTO_ENCUADRAR_CLIP_EPISODIO,
  CLIP_EPISODIO,
  DESHACER_AUTO_ENCUADRE_CLIP_EPISODIO,
  EPISODIO_EDITOR,
  RENDERIZAR_CLIP_EPISODIO,
  SUGERIR_CORTES_DE_SILENCIO,
  TRANSCRIPCION_EPISODIO,
} from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";
import {
  LIENZOS,
  MAXIMO_IMAGENES,
  posicionesEfectivas,
  subtituloPorDefecto,
  vistaDeImagen,
  type DisenoClip,
  type ImagenClipServidor,
  type PosicionEfectiva,
  type Region,
} from "@/lib/clip-encuadre";
import { imagenNueva } from "@/components/episodios/PanelImagenes";
import { ErrorDeSubida, uploadImagenClip } from "@/lib/upload";
import { useRecortesImagen } from "@/lib/use-recortes-imagen";
import { PanelAutoEncuadre, type PersonaAuto } from "@/components/episodios/PanelAutoEncuadre";
import { AvisoCruces } from "@/components/episodios/TomarClip";
import { usePestanaInspector } from "@/components/episodios/InspectorClip";
import { ESTILO_TEXTO_POR_DEFECTO, resolverEstilo, type EstiloTexto } from "@/lib/estilos-texto";
import { useEstilosTexto } from "@/lib/use-estilos-texto";
import { calidadDePosiciones } from "@/lib/calidad";
import { plantillaDelClip } from "@/lib/plantilla-clip";
import { duracionEfectiva, normalizarCortes, type Corte } from "@/lib/cortes";
import { borradorDelClip, type Borrador } from "@/components/episodios/editor/borrador";
import { escribiendo, useHistorial } from "@/components/episodios/editor/historial";
import { useReproductor } from "@/components/episodios/editor/reproductor";
import { useGuardado } from "@/components/episodios/editor/useGuardado";
import { BarraSuperior } from "@/components/episodios/editor/BarraSuperior";
import { RielHerramientas } from "@/components/episodios/editor/RielHerramientas";
import { Escenario } from "@/components/episodios/editor/Escenario";
import { LineaDeTiempo } from "@/components/episodios/editor/LineaDeTiempo";
import { PanelEditar } from "@/components/episodios/editor/PanelEditar";
import { PanelTexto } from "@/components/episodios/editor/PanelTexto";
import { PanelSubtitulos } from "@/components/episodios/editor/PanelSubtitulos";
import { PanelSuperposicion } from "@/components/episodios/editor/PanelSuperposicion";
import { PanelFormato } from "@/components/episodios/editor/PanelFormato";
import { PanelAuto } from "@/components/episodios/editor/PanelAuto";
import type { ModoTranscripcion } from "@/components/episodios/editor/Transcripcion";
import { HERRAMIENTAS, type EstiloClip, type Herramienta, type LineaSubtitulo, type Palabra, type SeleccionCortes } from "@/components/episodios/editor/tipos";

/** Cuánto contexto se muestra alrededor del clip en la transcripción. */
const CONTEXTO_SEG = 30;

const SIN_SELECCION: SeleccionCortes = { puntos: [], elegido: null };

/**
 * El editor de un clip de episodio (ng-creator-be#69), como CapCut: arriba la
 * barra con deshacer y Exportar; a la izquierda las herramientas y el panel de
 * la elegida; al medio el video; abajo, a todo el ancho, la línea de tiempo.
 *
 * Todo se guarda solo, a medida que se cambia, y todo se puede deshacer
 * (también con Cmd/Ctrl+Z). La vista previa muestra el resultado con los
 * subtítulos que calcula el servidor, los mismos que van al render.
 */
export default function EditorClipPage({
  params,
}: {
  // Objeto plano, no promesa: ver publicados/[id].
  params: { id: string; clipId: string };
}) {
  const { id: episodioId, clipId } = params;
  const tr = useTranslations("editorClip");
  const tn = useTranslations("estilosNombres");
  const ti = useTranslations("editorImagenes");
  const te = useTranslations("erroresSubida");
  const th = useTranslations("editorHerramientas");
  const { activa } = useMarcaActiva();
  const { puedeOperar, usuario } = useSesion();
  const { porEstilo } = useEstilosTexto();
  const cliente = useApolloClient();
  const marcaId = activa?._id ?? null;
  const opera = puedeOperar(marcaId);

  const clipQ = useQuery(CLIP_EPISODIO, {
    variables: { id: clipId, marcaId: marcaId ?? "" },
    skip: !marcaId,
  });
  const episodioQ = useQuery(EPISODIO_EDITOR, {
    variables: { id: episodioId, marcaId: marcaId ?? "" },
    skip: !marcaId,
  });
  const [renderizar, { loading: pidiendoRender }] = useMutation(RENDERIZAR_CLIP_EPISODIO);
  const [autoEncuadrar, { loading: pidiendoAuto }] = useMutation(AUTO_ENCUADRAR_CLIP_EPISODIO);
  const [deshacerAuto, { loading: deshaciendo }] = useMutation(DESHACER_AUTO_ENCUADRE_CLIP_EPISODIO);
  // Al terminar el auto-encuadre en esta visita: se abre el resumen y se
  // resaltan los encuadres nuevos (cada resultado suma uno).
  const [resaltarAuto, setResaltarAuto] = useState(0);
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [falloCerrado, setFalloCerrado] = useState(false);

  const clip = clipQ.data?.clipEpisodio;
  const estilo: EstiloClip | undefined = clipQ.data?.estiloClipMarca;
  const ep = episodioQ.data?.episodio;
  // La resolución de la fuente para la calidad estimada: la del original según
  // Bunny; si no la sabe, la que midió el último render.
  const resolucionFuente: { ancho: number; alto: number } | null =
    ep?.resolucionOriginal ??
    (clip?.calidad?.fuenteAncho && clip.calidad.fuenteAlto ? { ancho: clip.calidad.fuenteAncho, alto: clip.calidad.fuenteAlto } : null);

  // ---- El borrador, con deshacer y rehacer ----
  const historial = useHistorial<Borrador>();
  const b = historial.valor;
  const { iniciar, cambiar: cambiarCon } = historial;
  const cambiar = useCallback((parcial: Partial<Borrador>) => cambiarCon((prev) => ({ ...prev, ...parcial })), [cambiarCon]);

  const [error, setError] = useState<string | null>(null);
  const [herramienta, elegirHerramienta] = usePestanaInspector<Herramienta>(HERRAMIENTAS, "editar");
  const [modo, setModo] = useState<ModoTranscripcion>("inicio");
  const [textoElegido, setTextoElegido] = useState<number | null>(null);
  const [imagenElegida, setImagenElegida] = useState<number | null>(null);
  const [seleccion, setSeleccion] = useState<SeleccionCortes>(SIN_SELECCION);

  useEffect(() => {
    if (!clip || b || !estilo) return;
    iniciar(borradorDelClip(clip, estilo.colorResaltado));
  }, [clip, b, estilo, iniciar]);

  // ---- Guardado automático ----
  const guardado = useGuardado({ clipId, episodioId, marcaId, habilitado: opera, errorGenerico: tr("errores.guardar") });
  const { programar, vaciar } = guardado;
  useEffect(() => {
    if (b) programar(b);
  }, [b, programar]);

  // ---- El video ----
  const reproductor = useReproductor({ desde: b?.desdeSeg ?? 0, hasta: b?.hastaSeg ?? 0, cortes: b?.cortes ?? SIN_CORTES });

  // Deshacer y rehacer con el teclado, salvo mientras se escribe en un campo.
  const { deshacer, rehacer } = historial;
  useEffect(() => {
    if (!opera) return;
    const teclas = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || escribiendo(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) deshacer();
      else if ((k === "z" && e.shiftKey) || k === "y") rehacer();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", teclas);
    return () => window.removeEventListener("keydown", teclas);
  }, [opera, deshacer, rehacer]);

  // Si el tramo cambia (deshacer, mover el inicio), los pedazos elegidos pueden quedar afuera.
  const desdeB = b?.desdeSeg;
  const hastaB = b?.hastaSeg;
  useEffect(() => {
    if (desdeB === undefined || hastaB === undefined) return;
    setSeleccion((s) => ({ puntos: s.puntos.filter((p) => p > desdeB && p < hastaB), elegido: null }));
  }, [desdeB, hastaB]);

  // ---- La transcripción alrededor del clip ----
  // Se vuelve a pedir cuando el tramo se corre fuera de la ventana que ya se tiene.
  const [ventana, setVentana] = useState<{ desde: number; hasta: number } | null>(null);
  useEffect(() => {
    if (desdeB === undefined || hastaB === undefined) return;
    if (!ventana || desdeB < ventana.desde + 5 || hastaB > ventana.hasta - 5) {
      setVentana({ desde: Math.max(0, desdeB - CONTEXTO_SEG), hasta: hastaB + CONTEXTO_SEG });
    }
  }, [desdeB, hastaB, ventana]);
  const transcripcionQ = useQuery(TRANSCRIPCION_EPISODIO, {
    variables: { id: episodioId, marcaId: marcaId ?? "", desdeSeg: ventana?.desde, hastaSeg: ventana?.hasta },
    skip: !marcaId || !ventana,
  });
  const palabras: Palabra[] = transcripcionQ.data?.transcripcionEpisodio ?? [];

  // ---- Lo que se procesa en el servidor: render, auto-encuadre, recortes ----
  const estadoRender = clip?.estadoRender as string | null | undefined;
  const renderEnCurso = estadoRender === "EN_COLA" || estadoRender === "RENDERIZANDO";
  const estadoAuto: string | undefined = clip?.estadoAutoEncuadre ?? undefined;
  const analizando = estadoAuto === "EN_COLA" || estadoAuto === "ANALIZANDO";
  const estadoAutoAntes = useRef(estadoAuto);

  /** El diseño y los encuadres que dejó el servidor pasan al borrador (se pueden deshacer). */
  const tomarEncuadres = useCallback(
    (c: { diseno: DisenoClip; posiciones: { desdeSeg: number; regiones: Region[]; diseno?: DisenoClip | null }[] }) =>
      cambiar({
        diseno: c.diseno,
        posiciones: c.posiciones.map((p) => ({
          desdeSeg: p.desdeSeg,
          diseno: p.diseno ?? null,
          regiones: p.regiones.map(({ x, y, ancho, alto }) => ({ x, y, ancho, alto })),
        })),
      }),
    [cambiar],
  );

  useEffect(() => {
    const antes = estadoAutoAntes.current;
    estadoAutoAntes.current = estadoAuto;
    if (antes !== "EN_COLA" && antes !== "ANALIZANDO") return;
    const c = clipQ.data?.clipEpisodio;
    if (estadoAuto === "LISTO" && c) {
      tomarEncuadres(c);
      setResaltarAuto((n) => n + 1);
      setResumenAbierto(true);
    } else if (estadoAuto === "FALLIDO") {
      setFalloCerrado(false);
    }
  }, [estadoAuto, clipQ.data, tomarEncuadres]);

  const imagenesServidor: ImagenClipServidor[] = clip?.imagenes ?? [];
  const recortando = imagenesServidor.some((im) => im.estadoRecorte === "PENDIENTE");
  const { recorteDe, reintentar: reintentarRecorte } = useRecortesImagen(marcaId, b?.imagenes ?? SIN_IMAGENES, opera);

  const { startPolling, stopPolling } = clipQ;
  useEffect(() => {
    if (renderEnCurso || analizando || recortando) startPolling(analizando ? 2500 : recortando && !renderEnCurso ? 3000 : 4000);
    else stopPolling();
    return () => stopPolling();
  }, [renderEnCurso, analizando, recortando, startPolling, stopPolling]);

  if (!clip || !b || !ep || !estilo) {
    return (
      <DashboardLayout menuColapsable="editor-clip" margenChico>
        {clipQ.error ? <p className="text-red-400">{clipQ.error.message}</p> : <div className="h-64 animate-pulse rounded-2xl bg-white/5" />}
      </DashboardLayout>
    );
  }

  const duracion = b.hastaSeg - b.desdeSeg;
  const efectiva = duracionEfectiva(b.desdeSeg, b.hastaSeg, b.cortes);
  const redondo = (n: number) => Math.round(n * 1000) / 1000;
  const posiciones: PosicionEfectiva[] = posicionesEfectivas(
    { formato: b.formato, diseno: b.diseno, encuadre: b.encuadre, posiciones: b.posiciones },
    reproductor.fuente,
    duracion,
  );
  const calidadEstimada = resolucionFuente ? calidadDePosiciones(posiciones, b.formato, resolucionFuente) : null;
  const plantilla = plantillaDelClip(estilo, b.plantillaActiva, efectiva);
  const lineas: LineaSubtitulo[] = clip.lineasSubtitulo ?? [];

  /** El diseño del clip sigue al del primer tramo (lo usan los subtítulos). */
  const cambiarPosiciones = (p: PosicionEfectiva[]) => cambiar({ posiciones: p, diseno: p[0]?.diseno ?? b.diseno });

  /**
   * Cambia el tramo del clip. Las posiciones del recorte están en segundos DEL
   * CLIP: si el inicio se corre, se corren al revés para seguir cayendo en el
   * mismo momento del video. Los cortes que quedan afuera se van.
   */
  function cambiarTramo(desde: number, hasta: number) {
    cambiarCon((prev) => {
      const delta = desde - prev.desdeSeg;
      let pos = prev.posiciones;
      if (delta !== 0 && pos.length > 1) {
        const corridas = pos.map((p) => ({ ...p, desdeSeg: redondo(p.desdeSeg - delta) }));
        // La que queda rigiendo al principio pasa a ser la primera, en el 0.
        const antes = corridas.filter((p) => p.desdeSeg <= 0);
        const primera = antes.length ? antes[antes.length - 1] : corridas[0];
        pos = [{ ...primera, desdeSeg: 0 }, ...corridas.filter((p) => p.desdeSeg > 0 && p.desdeSeg < hasta - desde)];
      }
      return { ...prev, desdeSeg: redondo(desde), hastaSeg: redondo(hasta), posiciones: pos, cortes: normalizarCortes(prev.cortes, desde, hasta) };
    });
  }

  /** Los silencios largos que propone el servidor; el editor los une a los suyos. */
  async function sugerirSilencios(): Promise<Corte[]> {
    if (!marcaId) return [];
    const r = await cliente.query({ query: SUGERIR_CORTES_DE_SILENCIO, variables: { id: clipId, marcaId }, fetchPolicy: "no-cache" });
    return (r.data?.sugerirCortesDeSilencio ?? []).map((c: Corte) => ({ desdeSeg: c.desdeSeg, hastaSeg: c.hastaSeg }));
  }

  async function pedirAutoEncuadre() {
    if (!marcaId || !b) return;
    if (b.posiciones.length > 1 && !window.confirm(tr("confirmarAuto"))) return;
    setError(null);
    setResumenAbierto(false);
    try {
      // El worker mira el tramo guardado: primero lo pendiente.
      if (!(await vaciar())) return;
      await autoEncuadrar({ variables: { id: clipId, marcaId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("errores.auto"));
    }
  }

  async function deshacerAutoEncuadre() {
    if (!marcaId) return;
    setError(null);
    try {
      if (!(await vaciar())) return;
      const r = await deshacerAuto({ variables: { id: clipId, marcaId } });
      const c = r.data?.deshacerAutoEncuadreClipEpisodio;
      if (c) tomarEncuadres(c);
      setResumenAbierto(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("errores.deshacer"));
    }
  }

  // ---- Imágenes ----
  const vistasImagenes = b.imagenes.map((im) => vistaDeImagen(im, imagenesServidor, recorteDe(im)));
  // Con el video 16:9 en el medio, la imagen nueva va a la franja de abajo.
  const conHorizontal = b.formato === "VERTICAL" && (b.diseno === "HORIZONTAL" || b.posiciones.some((p) => p.diseno === "HORIZONTAL"));

  /** Exportar: guarda lo pendiente ANTES de pedir el render, así sale con el último cambio. */
  async function exportar() {
    if (!marcaId) return;
    if (vistasImagenes.some((v) => v.estado === "PENDIENTE") && !window.confirm(ti("confirmarRender"))) return;
    setError(null);
    try {
      if (!(await vaciar())) return;
      await renderizar({ variables: { id: clipId, marcaId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : th("errores.exportar"));
    }
  }

  /** Sube una imagen y la suma al clip, ya elegida. Rechaza con el error en el idioma de la pantalla. */
  async function subirImagen(file: File) {
    if (!marcaId || !b || b.imagenes.length >= MAXIMO_IMAGENES) return;
    let url: string;
    try {
      url = await uploadImagenClip(file, marcaId);
    } catch (e) {
      throw new Error(e instanceof ErrorDeSubida ? te(e.clave, e.datos) : e instanceof Error ? e.message : ti("errorSubir"));
    }
    cambiarCon((prev) =>
      prev.imagenes.length < MAXIMO_IMAGENES ? { ...prev, imagenes: [...prev.imagenes, imagenNueva(url, prev.imagenes, conHorizontal)] } : prev,
    );
    setTextoElegido(null);
    setImagenElegida(b.imagenes.length);
    elegirHerramienta("superposicion");
  }

  const elegirTexto = (i: number | null) => {
    setTextoElegido(i);
    if (i !== null) setImagenElegida(null);
  };
  const elegirImagen = (i: number | null) => {
    setImagenElegida(i);
    if (i !== null) setTextoElegido(null);
  };

  // El estilo con que sale (estiloTextoEfectivo): el del clip, el de la marca o
  // KARAOKE. Se calcula acá para que la vista previa cambie apenas se elige.
  const estiloEfectivo: EstiloTexto = b.estiloTexto ?? estilo.estiloTexto ?? clip.estiloTextoEfectivo ?? ESTILO_TEXTO_POR_DEFECTO;
  const defEfectivo = porEstilo.get(estiloEfectivo);
  const conEstilo = defEfectivo && !defEfectivo.respetaTextos ? resolverEstilo(defEfectivo, estilo.tema) : null;
  const nombreEstilo = conEstilo ? tn(`nombres.${conEstilo.def.estilo}`) : undefined;

  const desactualizado =
    estadoRender === "LISTO" &&
    (guardado.estado.sinGuardar || Boolean(clip.editadoEn && clip.renderizadoEn && new Date(clip.editadoEn) > new Date(clip.renderizadoEn)));

  // ---- El panel de la herramienta elegida ----
  const paneles: Record<Herramienta, React.ReactNode> = {
    editar: (
      <PanelEditar
        reproductor={reproductor}
        desde={b.desdeSeg}
        hasta={b.hastaSeg}
        cortes={b.cortes}
        onCambiarCortes={(cortes) => cambiar({ cortes })}
        onCambiarTramo={cambiarTramo}
        seleccion={seleccion}
        onSeleccion={setSeleccion}
        onSugerirSilencios={sugerirSilencios}
        duracionEpisodio={ep.duracionSeg ?? 0}
        palabras={palabras}
        correcciones={b.correcciones}
        onCambiarCorrecciones={(correcciones) => cambiar({ correcciones })}
        modo={modo}
        onModo={setModo}
        puedeEditar={opera}
      />
    ),
    texto: (
      <PanelTexto
        textos={b.textos}
        onCambiarTextos={(textos) => cambiar({ textos })}
        elegido={textoElegido}
        onElegir={elegirTexto}
        duracion={duracion}
        estilo={estilo}
        estiloTexto={b.estiloTexto}
        onCambiarEstiloTexto={(estiloTexto) => cambiar({ estiloTexto })}
        nombreEstilo={nombreEstilo}
        nombreMarca={activa?.nombre}
        puedeEditar={opera}
      />
    ),
    subtitulos: (
      <PanelSubtitulos
        activos={b.subtitulosActivos}
        onActivos={(subtitulosActivos) => cambiar({ subtitulosActivos })}
        subtitulo={b.subtitulo}
        porDefecto={subtituloPorDefecto(LIENZOS[b.formato], b.diseno)}
        onCambiarSubtitulo={(subtitulo) => cambiar({ subtitulo })}
        nombreEstilo={nombreEstilo}
        correcciones={b.correcciones.length}
        onCorregir={() => {
          setModo("corregir");
          elegirHerramienta("editar");
        }}
        onCambiarEstilo={() => elegirHerramienta("texto")}
        puedeEditar={opera}
      />
    ),
    superposicion: (
      <PanelSuperposicion
        imagenes={b.imagenes}
        estados={vistasImagenes.map((v) => v.estado)}
        lentas={vistasImagenes.map((v) => !!v.lento)}
        onReintentar={(i) => {
          const im = b.imagenes[i];
          if (im) void reintentarRecorte(im);
        }}
        onCambiarImagenes={(imagenes) => cambiar({ imagenes })}
        elegida={imagenElegida}
        onElegir={elegirImagen}
        onSubir={subirImagen}
        duracion={duracion}
        estilo={estilo}
        plantillaActiva={b.plantillaActiva}
        onPlantillaActiva={(plantillaActiva) => cambiar({ plantillaActiva })}
        puedeEditar={opera}
      />
    ),
    formato: (
      <PanelFormato
        reproductor={reproductor}
        desde={b.desdeSeg}
        hasta={b.hastaSeg}
        formato={b.formato}
        onCambiarFormato={(formato) => cambiar({ formato })}
        fondo={b.fondo}
        onCambiarFondo={(fondo) => cambiar({ fondo })}
        posiciones={posiciones}
        onCambiarPosiciones={cambiarPosiciones}
        resaltar={resaltarAuto}
        onAutoEncuadre={() => elegirHerramienta("auto")}
        puedeEditar={opera}
      />
    ),
    auto: (
      <PanelAuto
        analizando={analizando || pidiendoAuto}
        progreso={clip.progresoAutoEncuadre}
        personas={estadoAuto === "LISTO" ? clip.personasAutoEncuadre : null}
        onPedir={() => void pedirAutoEncuadre()}
        puedeEditar={opera}
        estadoYResumen={
          <PanelAutoEncuadre
            estado={pidiendoAuto && !analizando ? "EN_COLA" : estadoAuto}
            etapa={clip.etapaAutoEncuadre}
            progreso={clip.progresoAutoEncuadre}
            empezoEn={clip.autoEncuadreEmpezoEn}
            error={falloCerrado ? null : clip.errorAutoEncuadre}
            personas={(clip.resumenAutoEncuadre ?? []) as PersonaAuto[]}
            cambios={b.posiciones.length}
            mostrarResumen={resumenAbierto}
            deshacible={Boolean(clip.autoEncuadreDeshacible)}
            deshaciendo={deshaciendo}
            onVerPrimerCambio={() => reproductor.irAlEpisodio(b.desdeSeg + Math.max(0, (b.posiciones[1]?.desdeSeg ?? 1) - 1))}
            onDeshacer={() => void deshacerAutoEncuadre()}
            onReintentar={() => void pedirAutoEncuadre()}
            onCerrar={() => {
              setResumenAbierto(false);
              setFalloCerrado(true);
            }}
          />
        }
      />
    ),
  };

  return (
    <DashboardLayout menuColapsable="editor-clip" margenChico>
      {/* Desde md, la página entera es el editor (el alto de la ventana menos
          los márgenes de DashboardLayout), sin scroll de página. Las áreas
          están en globals.css (editor-capcut). */}
      <div className="editor-capcut -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 md:-mx-4 md:-mt-4">
        <header className="editor-barra border-b border-ng-superficie bg-ng-fondo">
          <BarraSuperior
            clipId={clipId}
            marcaId={marcaId ?? ""}
            hrefVolver={`/episodios/${episodioId}`}
            episodio={ep.titulo}
            titulo={b.titulo}
            onCambiarTitulo={(titulo) => cambiar({ titulo })}
            tomadoPor={clip.tomadoPor}
            puedeOperar={opera}
            guardado={guardado.estado}
            deshacer={{ puede: historial.puedeDeshacer, puedeRehacer: historial.puedeRehacer, deshacer, rehacer }}
            calidad={calidadEstimada}
            exportar={{
              listoPor: clip.listoPor,
              publicacion: clip.publicacion,
              render: {
                estado: estadoRender ?? null,
                progreso: clip.progresoRender ?? 0,
                error: clip.errorRender,
                urlVideo: clip.urlVideo,
                desactualizado,
                pidiendo: pidiendoRender,
                calidad: clip.calidad,
              },
              onExportar: () => void exportar(),
            }}
            hrefProgramar={`/episodios/${episodioId}/clips/${clipId}/publicar`}
          />
          {(error || guardado.cruces) && (
            <div className="space-y-2 px-3 pb-2 md:px-4">
              {error && <p className="text-sm text-red-400">{error}</p>}
              {guardado.cruces && (
                <AvisoCruces
                  cruces={guardado.cruces}
                  usuarioId={usuario?._id}
                  textoSeguir={tr("guardarIgual")}
                  onSeguir={guardado.guardarIgual}
                  onCancelar={() => {
                    // Vuelve al tramo guardado; lo demás que se cambió se guarda igual.
                    guardado.descartarCruces();
                    const t = guardado.tramoGuardado.current;
                    if (t) cambiarTramo(t.desdeSeg, t.hastaSeg);
                  }}
                />
              )}
            </div>
          )}
        </header>

        <aside className="editor-riel border-ng-superficie md:border-r">
          <RielHerramientas activa={herramienta} onElegir={elegirHerramienta} analizando={analizando || pidiendoAuto} />
        </aside>

        <section
          id="panel-herramienta"
          role="tabpanel"
          aria-labelledby={`herramienta-${herramienta}`}
          className="editor-panel border-ng-superficie bg-[#0F0F0E] p-4 md:border-r md:p-5"
        >
          <h2 className="mb-4 text-[17px] font-bold">{th(`nombres.${herramienta}`)}</h2>
          {paneles[herramienta]}
        </section>

        <div className="editor-escenario">
          {ep.urlReproduccion ? (
            <Escenario
              url={ep.urlReproduccion}
              conCuadro={herramienta === "formato" || herramienta === "auto"}
              onCambiarPosiciones={cambiarPosiciones}
              reproductor={reproductor}
              desde={b.desdeSeg}
              hasta={b.hastaSeg}
              efectiva={efectiva}
              cortes={b.cortes}
              formato={b.formato}
              diseno={b.diseno}
              fondo={b.fondo}
              posiciones={posiciones}
              lineas={lineas}
              textos={b.textos}
              onCambiarTextos={(textos) => cambiar({ textos })}
              textoElegido={textoElegido}
              onElegirTexto={(i) => {
                elegirTexto(i);
                elegirHerramienta("texto");
              }}
              imagenes={b.imagenes}
              vistasImagenes={vistasImagenes}
              onCambiarImagenes={(imagenes) => cambiar({ imagenes })}
              imagenElegida={imagenElegida}
              onElegirImagen={(i) => {
                elegirImagen(i);
                elegirHerramienta("superposicion");
              }}
              onSoltarImagen={
                b.imagenes.length < MAXIMO_IMAGENES
                  ? (file) => void subirImagen(file).catch((e) => setError(e instanceof Error ? e.message : ti("errorSubir")))
                  : undefined
              }
              estilo={estilo}
              estiloTexto={conEstilo}
              plantilla={plantilla}
              nombreMarca={activa?.nombre}
              subtitulo={b.subtitulo}
              subtitulosActivos={b.subtitulosActivos}
              onCambiarSubtitulo={(subtitulo) => cambiar({ subtitulo })}
              onElegirSubtitulo={() => elegirHerramienta("subtitulos")}
              puedeEditar={opera}
            />
          ) : (
            <p className="p-6 text-sm text-white/50">{tr("videoNoListo")}</p>
          )}
        </div>

        <div className="editor-linea">
          <LineaDeTiempo
            reproductor={reproductor}
            desde={b.desdeSeg}
            hasta={b.hastaSeg}
            cortes={b.cortes}
            onCambiarCortes={(cortes) => cambiar({ cortes })}
            seleccion={seleccion}
            onSeleccion={setSeleccion}
            posiciones={posiciones}
            textos={b.textos}
            onCambiarTextos={(textos) => cambiar({ textos })}
            textoElegido={textoElegido}
            onElegirTexto={elegirTexto}
            imagenes={b.imagenes}
            onCambiarImagenes={(imagenes) => cambiar({ imagenes })}
            imagenElegida={imagenElegida}
            onElegirImagen={elegirImagen}
            subtitulosActivos={b.subtitulosActivos}
            plantilla={plantilla}
            herramienta={herramienta}
            onAbrir={elegirHerramienta}
            puedeEditar={opera}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

/** Fijos, para que el valor por defecto no cambie en cada render. */
const SIN_CORTES: Corte[] = [];
const SIN_IMAGENES: never[] = [];
