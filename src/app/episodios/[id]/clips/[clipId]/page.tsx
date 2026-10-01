"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client";
import {
  ACTUALIZAR_CLIP_EPISODIO,
  CLIP_EPISODIO,
  EPISODIO,
  RENDERIZAR_CLIP_EPISODIO,
  AUTO_ENCUADRAR_CLIP_EPISODIO,
  DESHACER_AUTO_ENCUADRE_CLIP_EPISODIO,
  TRANSCRIPCION_EPISODIO,
} from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  EditorRecorte,
  type EstiloClip,
  type LineaSubtitulo,
} from "@/components/episodios/EditorRecorte";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";
import type { DisenoClip, Encuadre, FondoClip, FormatoClip, Region, SubtituloClip, Texto } from "@/lib/clip-encuadre";
import { LIENZOS, SUBTITULO_TAMANO_MAX, SUBTITULO_TAMANO_MIN, subtituloPorDefecto } from "@/lib/clip-encuadre";
import { disenosDeTexto, PanelTextos, textoNuevo } from "@/components/episodios/PanelTextos";
import { EstadoGuardado, PanelExportar } from "@/components/episodios/PanelExportar";
import { PanelAutoEncuadre, type PersonaAuto } from "@/components/episodios/PanelAutoEncuadre";
import { AvisoCruces, buscarCruces, TomarClip, type CruceClip } from "@/components/episodios/TomarClip";
import { EstadoPublicacionClip, ListoClip } from "@/components/episodios/ListoClip";

interface Palabra {
  texto: string;
  desde: number;
  hasta: number;
}

interface Borrador {
  desdeSeg: number;
  hastaSeg: number;
  titulo: string;
  formato: FormatoClip;
  encuadre: Encuadre;
  diseno: DisenoClip;
  fondo: FondoClip;
  /** Cada tramo con su diseño (be#105, etapa 2); sin diseño, el del clip. */
  posiciones: { desdeSeg: number; regiones: Region[]; diseno?: DisenoClip | null }[];
  subtitulosActivos: boolean;
  /** Letra, tamaño y altura propios (null = los de siempre). */
  subtitulo: SubtituloClip | null;
  correcciones: { desde: number; texto: string }[];
  gancho: string;
  ganchoActivo: boolean;
  ganchoSeg: number;
  textos: Texto[];
  /** Si lleva el logo y la llamada a la acción de la plantilla de la marca (be#117). */
  plantillaActiva: boolean;
}

/** Cuánto contexto se muestra alrededor del clip en la transcripción. */
const CONTEXTO_SEG = 30;

/**
 * El editor de un clip de episodio (ng-creator-be#69).
 *
 * La transcripción es la línea de tiempo: se toca una palabra para elegir
 * dónde empieza o termina el clip, y se afina al milisegundo con los números.
 * Todo se guarda solo, a medida que se cambia; la vista previa muestra el
 * resultado con los subtítulos que calcula el servidor, los mismos que van al
 * render.
 */
export default function EditorClipPage({
  params,
}: {
  // Objeto plano, no promesa: ver publicados/[id].
  params: { id: string; clipId: string };
}) {
  const { id: episodioId, clipId } = params;
  const { activa } = useMarcaActiva();
  const { puedeOperar, usuario } = useSesion();
  const cliente = useApolloClient();
  const marcaId = activa?._id ?? null;
  const opera = puedeOperar(marcaId);

  const clipQ = useQuery(CLIP_EPISODIO, {
    variables: { id: clipId, marcaId: marcaId ?? "" },
    skip: !marcaId,
  });
  const episodioQ = useQuery(EPISODIO, {
    variables: { id: episodioId, marcaId: marcaId ?? "" },
    skip: !marcaId,
  });
  const [actualizar] = useMutation(ACTUALIZAR_CLIP_EPISODIO);
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

  const [b, setB] = useState<Borrador | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modo, setModo] = useState<"inicio" | "fin" | "corregir">("inicio");
  const [corrigiendo, setCorrigiendo] = useState<Palabra | null>(null);
  const [textoElegido, setTextoElegido] = useState<number | null>(null);
  // El tramo que está guardado, y el aviso de cruces (#70) cuando el nuevo pisa
  // otro clip. Lo que ya se aceptó con "Guardar igual" no se vuelve a preguntar
  // a cada ajuste fino; solo si aparece un clip nuevo en el cruce.
  const tramoGuardado = useRef<{ desdeSeg: number; hastaSeg: number } | null>(null);
  const crucesAceptados = useRef(new Set<string>());
  const [cruces, setCruces] = useState<CruceClip[] | null>(null);

  // El borrador arranca del clip UNA vez. Después manda lo que se edita acá:
  // pisarlo con cada respuesta del servidor borraría lo que se está tipeando.
  useEffect(() => {
    if (!clip || b || !estilo) return;
    const textos: Texto[] = (clip.textos ?? []).map((t: Texto) => ({
      contenido: t.contenido,
      destacadas: [...t.destacadas],
      fuente: t.fuente,
      tamano: t.tamano,
      color: t.color,
      colorDestacado: t.colorDestacado,
      efecto: t.efecto,
      colorEfecto: t.colorEfecto,
      mayusculas: t.mayusculas,
      centroX: t.centroX,
      centroY: t.centroY,
      ancho: t.ancho,
      desdeSeg: t.desdeSeg,
      hastaSeg: t.hastaSeg ?? null,
    }));
    // El gancho de la primera versión pasa a ser el primer texto, con el
    // diseño "Impacto": desde acá, todo texto sobre el clip es uno de estos.
    if (!textos.length && clip.ganchoActivo && clip.gancho?.trim()) {
      textos.push({
        ...textoNuevo(disenosDeTexto(estilo.colorResaltado)[0].estilo, clip.gancho.trim(), 0.15),
        hastaSeg: clip.ganchoSeg ?? 3,
      });
    }
    tramoGuardado.current = { desdeSeg: clip.desdeSeg, hastaSeg: clip.hastaSeg };
    setB({
      desdeSeg: clip.desdeSeg,
      hastaSeg: clip.hastaSeg,
      titulo: clip.titulo,
      formato: clip.formato,
      encuadre: {
        centroX: clip.encuadre.centroX,
        centroY: clip.encuadre.centroY,
        zoom: clip.encuadre.zoom,
      },
      diseno: clip.diseno,
      fondo: clip.fondo ?? "DESENFOCADO",
      posiciones: clip.posiciones.map((p: { desdeSeg: number; regiones: Region[]; diseno?: DisenoClip | null }) => ({
        desdeSeg: p.desdeSeg,
        diseno: p.diseno ?? null,
        regiones: p.regiones.map(({ x, y, ancho, alto }) => ({ x, y, ancho, alto })),
      })),
      subtitulosActivos: clip.subtitulosActivos,
      subtitulo: clip.subtitulo
        ? {
            fuente: clip.subtitulo.fuente,
            tamano: clip.subtitulo.tamano,
            centroY: clip.subtitulo.centroY,
            efecto: clip.subtitulo.efecto,
            mayusculas: clip.subtitulo.mayusculas,
          }
        : null,
      correcciones: clip.correcciones.map((c: { desde: number; texto: string }) => ({
        desde: c.desde,
        texto: c.texto,
      })),
      gancho: clip.gancho ?? "",
      ganchoActivo: clip.ganchoActivo,
      ganchoSeg: clip.ganchoSeg,
      textos,
      plantillaActiva: clip.plantillaActiva ?? true,
    });
  }, [clip, b, estilo]);

  // Guardado automático, medio segundo después del último cambio.
  //
  // El guardado vive en una función aparte para poder forzarlo: "Procesar
  // video" guarda lo pendiente ANTES de pedir el render. Sin eso, un cambio
  // hecho medio segundo antes de tocar el botón salía del render sin estar.
  const [sinGuardar, setSinGuardar] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimo = useRef<Borrador | null>(null);
  /**
   * Guarda el borrador. Devuelve false si no guardó porque el tramo nuevo pisa
   * otro clip y falta que la persona diga "Guardar igual" (o porque llegó un
   * cambio más nuevo mientras se revisaba).
   */
  const guardar = useCallback(
    async (borrador: Borrador, sinRevisar = false): Promise<boolean> => {
      if (!marcaId) return false;
      const antes = tramoGuardado.current;
      const tramoNuevo = !antes || antes.desdeSeg !== borrador.desdeSeg || antes.hastaSeg !== borrador.hastaSeg;
      if (tramoNuevo && !sinRevisar) {
        const encontrados = await buscarCruces(cliente, {
          episodioId,
          marcaId,
          desdeSeg: borrador.desdeSeg,
          hastaSeg: borrador.hastaSeg,
          excluirClipId: clipId,
        });
        if (ultimo.current !== borrador) return false;
        const sinAceptar = encontrados.filter((c) => !crucesAceptados.current.has(c.clipId));
        if (sinAceptar.length) {
          setCruces(encontrados);
          return false;
        }
      }
      setCruces(null);
      setGuardando(true);
      setError(null);
      try {
        await actualizar({
          variables: {
            id: clipId,
            marcaId,
            input: {
              desdeSeg: borrador.desdeSeg,
              hastaSeg: borrador.hastaSeg,
              titulo: borrador.titulo,
              formato: borrador.formato,
              encuadre: borrador.encuadre,
              diseno: borrador.diseno,
              fondo: borrador.fondo,
              posiciones: borrador.posiciones,
              subtitulosActivos: borrador.subtitulosActivos,
              subtitulo: borrador.subtitulo,
              correcciones: borrador.correcciones,
              gancho: borrador.gancho,
              // Los textos reemplazan al gancho viejo: si no, borrar todos los
              // textos haría reaparecer el gancho en el render.
              ganchoActivo: false,
              ganchoSeg: borrador.ganchoSeg,
              textos: borrador.textos.map((t) => ({ ...t, hastaSeg: t.hastaSeg ?? null })),
              plantillaActiva: borrador.plantillaActiva,
            },
          },
        });
        tramoGuardado.current = { desdeSeg: borrador.desdeSeg, hastaSeg: borrador.hastaSeg };
        if (ultimo.current === borrador) setSinGuardar(false);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar");
        throw e;
      } finally {
        setGuardando(false);
      }
    },
    [marcaId, clipId, episodioId, actualizar, cliente],
  );

  const primera = useRef(true);
  useEffect(() => {
    if (!b || !marcaId || !opera) return;
    if (primera.current) {
      primera.current = false;
      return;
    }
    ultimo.current = b;
    setSinGuardar(true);
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      void guardar(b).catch(() => undefined);
    }, 500);
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [b, marcaId, opera, guardar]);

  /**
   * Guarda ya lo que esté pendiente, sin esperar el medio segundo. Devuelve
   * false si quedó esperando el aviso de cruces.
   */
  async function guardarAhora(): Promise<boolean> {
    if (temporizador.current) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    if (sinGuardar && ultimo.current) return guardar(ultimo.current);
    return true;
  }

  /** "Guardar igual": se acepta el cruce y se guarda el tramo como está. */
  function guardarIgual() {
    cruces?.forEach((c) => crucesAceptados.current.add(c.clipId));
    setCruces(null);
    if (ultimo.current) void guardar(ultimo.current, true).catch(() => undefined);
  }

  // La transcripción alrededor del clip. Se vuelve a pedir cuando el tramo se
  // corre fuera de la ventana que ya se tiene.
  const [ventana, setVentana] = useState<{ desde: number; hasta: number } | null>(null);
  useEffect(() => {
    if (!b) return;
    if (!ventana || b.desdeSeg < ventana.desde + 5 || b.hastaSeg > ventana.hasta - 5) {
      setVentana({
        desde: Math.max(0, b.desdeSeg - CONTEXTO_SEG),
        hasta: b.hastaSeg + CONTEXTO_SEG,
      });
    }
  }, [b, ventana]);
  const transcripcionQ = useQuery(TRANSCRIPCION_EPISODIO, {
    variables: {
      id: episodioId,
      marcaId: marcaId ?? "",
      desdeSeg: ventana?.desde,
      hastaSeg: ventana?.hasta,
    },
    skip: !marcaId || !ventana,
  });
  const palabras: Palabra[] = transcripcionQ.data?.transcripcionEpisodio ?? [];

  // Mientras renderiza, a mirar el progreso.
  const estadoRender = clip?.estadoRender as string | null | undefined;
  const renderEnCurso = estadoRender === "EN_COLA" || estadoRender === "RENDERIZANDO";
  // El auto-encuadre (ng-creator-be#105): mientras el worker mira quién
  // habla, también se pregunta seguido; al terminar, sus tramos pasan al borrador.
  const estadoAuto: string | undefined = clipQ.data?.clipEpisodio?.estadoAutoEncuadre ?? undefined;
  const analizando = estadoAuto === "EN_COLA" || estadoAuto === "ANALIZANDO";
  const estadoAutoAntes = useRef(estadoAuto);
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
  }, [estadoAuto, clipQ.data]);

  /** El diseño y los encuadres que dejó el servidor pasan al borrador. */
  function tomarEncuadres(c: { diseno: DisenoClip; posiciones: { desdeSeg: number; regiones: Region[]; diseno?: DisenoClip | null }[] }) {
    setB((prev) =>
      prev
        ? {
            ...prev,
            diseno: c.diseno,
            posiciones: c.posiciones.map((p) => ({
              desdeSeg: p.desdeSeg,
              diseno: p.diseno ?? null,
              regiones: p.regiones.map(({ x, y, ancho, alto }) => ({ x, y, ancho, alto })),
            })),
          }
        : prev,
    );
  }

  const { startPolling, stopPolling } = clipQ;
  useEffect(() => {
    if (renderEnCurso || analizando) startPolling(analizando ? 2500 : 4000);
    else stopPolling();
    return () => stopPolling();
  }, [renderEnCurso, analizando, startPolling, stopPolling]);

  const correccionDe = useMemo(() => {
    const m = new Map<number, string>();
    b?.correcciones.forEach((c) => m.set(Math.round(c.desde * 1000), c.texto));
    return m;
  }, [b?.correcciones]);

  if (!clip || !b || !ep || !estilo) {
    return (
      <DashboardLayout>
        {clipQ.error ? (
          <p className="text-red-400">{clipQ.error.message}</p>
        ) : (
          <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
        )}
      </DashboardLayout>
    );
  }

  const cambiar = (parcial: Partial<Borrador>) => setB((prev) => (prev ? { ...prev, ...parcial } : prev));
  const duracion = b.hastaSeg - b.desdeSeg;
  const redondo = (n: number) => Math.round(n * 1000) / 1000;

  /**
   * Cambia el tramo del clip. Las posiciones del recorte están en segundos DEL
   * CLIP: si el inicio se corre, se corren al revés para seguir cayendo en el
   * mismo momento del video. Sin esto, extender el inicio 5 s adelantaría 5 s
   * cada cambio de encuadre.
   */
  function cambiarTramo(desde: number, hasta: number) {
    if (!b) return;
    const delta = desde - b.desdeSeg;
    let posiciones = b.posiciones;
    if (delta !== 0 && posiciones.length > 1) {
      const corridas = posiciones.map((p) => ({ ...p, desdeSeg: redondo(p.desdeSeg - delta) }));
      // La que queda rigiendo al principio pasa a ser la primera, en el 0.
      const antes = corridas.filter((p) => p.desdeSeg <= 0);
      const primera = antes.length ? antes[antes.length - 1] : corridas[0];
      posiciones = [
        { ...primera, desdeSeg: 0 },
        ...corridas.filter((p) => p.desdeSeg > 0 && p.desdeSeg < hasta - desde),
      ];
    }
    cambiar({ desdeSeg: redondo(desde), hastaSeg: redondo(hasta), posiciones });
  }

  function tocarPalabra(p: Palabra) {
    if (!b || !opera) return;
    if (modo === "inicio") {
      cambiarTramo(p.desde, Math.max(b.hastaSeg, p.desde + 1));
    } else if (modo === "fin") {
      cambiarTramo(Math.min(b.desdeSeg, p.hasta - 1), p.hasta);
    } else {
      setCorrigiendo(p);
    }
  }

  function corregir(p: Palabra, texto: string | null) {
    if (!b) return;
    const clave = Math.round(p.desde * 1000);
    const resto = b.correcciones.filter((c) => Math.round(c.desde * 1000) !== clave);
    cambiar({ correcciones: texto === null ? resto : [...resto, { desde: p.desde, texto }] });
    setCorrigiendo(null);
  }

  async function pedirAutoEncuadre() {
    if (!marcaId || !b) return;
    if (b.posiciones.length > 1 && !window.confirm("El auto-encuadre reemplaza los cambios de encuadre por los suyos. ¿Seguir?")) {
      return;
    }
    setError(null);
    setResumenAbierto(false);
    try {
      // El worker mira el tramo guardado: primero lo pendiente.
      if (!(await guardarAhora())) return;
      await autoEncuadrar({ variables: { id: clipId, marcaId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo auto-encuadrar");
    }
  }

  async function deshacerAutoEncuadre() {
    if (!marcaId) return;
    setError(null);
    try {
      if (!(await guardarAhora())) return;
      const r = await deshacerAuto({ variables: { id: clipId, marcaId } });
      const c = r.data?.deshacerAutoEncuadreClipEpisodio;
      if (c) tomarEncuadres(c);
      setResumenAbierto(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo volver a como estaba");
    }
  }

  async function pedirRender() {
    if (!marcaId) return;
    setError(null);
    try {
      if (!(await guardarAhora())) return;
      await renderizar({ variables: { id: clipId, marcaId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo procesar el video");
    }
  }

  const lineas: LineaSubtitulo[] = clip.lineasSubtitulo ?? [];

  return (
    <DashboardLayout>
      <Link href={`/episodios/${episodioId}`} className="text-sm text-white/50 hover:text-white/80">
        ← {ep.titulo}
      </Link>

      <div className="mb-5 mt-2 flex flex-wrap items-center justify-between gap-3">
        <input
          value={b.titulo}
          onChange={(e) => cambiar({ titulo: e.target.value })}
          disabled={!opera}
          className="min-w-0 flex-1 bg-transparent text-2xl font-bold outline-none focus:underline"
        />
        <EstadoGuardado guardando={guardando} sinGuardar={sinGuardar} error={Boolean(error)} />
      </div>
      <div className="-mt-3 mb-4 flex flex-wrap items-center gap-1.5">
        <TomarClip clipId={clipId} marcaId={marcaId ?? ""} tomadoPor={clip.tomadoPor} puedeOperar={opera} />
        <ListoClip
          clipId={clipId}
          marcaId={marcaId ?? ""}
          listoPor={clip.listoPor}
          tieneVideo={estadoRender === "LISTO" && Boolean(clip.urlVideo)}
          puedeOperar={opera}
        />
        <EstadoPublicacionClip publicacion={clip.publicacion} />
        {opera && estadoRender === "LISTO" && clip.urlVideo && (
          <Link
            href={`/episodios/${episodioId}/clips/${clipId}/publicar`}
            className="ml-auto rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:brightness-110"
          >
            Programar
          </Link>
        )}
      </div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {cruces && (
        <div className="mb-4">
          <AvisoCruces
            cruces={cruces}
            usuarioId={usuario?._id}
            textoSeguir="Guardar igual"
            onSeguir={guardarIgual}
            onCancelar={() => {
              // Vuelve al tramo guardado; lo demás que se cambió se guarda igual.
              setCruces(null);
              const t = tramoGuardado.current;
              if (t) cambiarTramo(t.desdeSeg, t.hastaSeg);
            }}
          />
        </div>
      )}

      {ep.urlReproduccion ? (
        <EditorRecorte
          url={ep.urlReproduccion}
          desde={b.desdeSeg}
          hasta={b.hastaSeg}
          formato={b.formato}
          diseno={b.diseno}
          fondo={b.fondo}
          autoEncuadre={{
            analizando: analizando || pidiendoAuto,
            resumen:
              estadoAuto === "LISTO" && clip.personasAutoEncuadre != null
                ? `${clip.personasAutoEncuadre} persona${clip.personasAutoEncuadre === 1 ? "" : "s"}`
                : null,
            progreso: clip.progresoAutoEncuadre,
            onPedir: () => void pedirAutoEncuadre(),
            resaltar: resaltarAuto,
            panel: (ir) => (
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
                onVerPrimerCambio={() => ir(Math.max(0, (b.posiciones[1]?.desdeSeg ?? 1) - 1))}
                onDeshacer={() => void deshacerAutoEncuadre()}
                onReintentar={() => void pedirAutoEncuadre()}
                onCerrar={() => {
                  setResumenAbierto(false);
                  setFalloCerrado(true);
                }}
              />
            ),
          }}
          subtitulo={b.subtitulo}
          plantillaActiva={b.plantillaActiva}
          onCambiarSubtitulo={(subtitulo) => cambiar({ subtitulo })}
          onCambiarFondo={(fondo) => cambiar({ fondo })}
          encuadre={b.encuadre}
          posicionesGuardadas={b.posiciones}
          // El diseño del clip sigue al del primer tramo (lo usan los subtítulos).
          onCambiarPosiciones={(posiciones) => cambiar({ posiciones, diseno: posiciones[0]?.diseno ?? b.diseno })}
          lineas={lineas}
          textos={b.textos}
          onCambiarTextos={(textos) => cambiar({ textos })}
          textoElegido={textoElegido}
          onElegirTexto={setTextoElegido}
          estilo={estilo}
          puedeEditar={opera}
          duracionEpisodio={ep.duracionSeg ?? 0}
          onCambiarTramo={cambiarTramo}
          onCambiarFormato={(formato) => cambiar({ formato })}
          debajoDeLaVista={
            <PanelExportar
              titulo={b.titulo}
              estado={estadoRender ?? null}
              progreso={clip.progresoRender ?? 0}
              error={clip.errorRender}
              urlVideo={clip.urlVideo}
              urlPoster={clip.urlPoster}
              // Hay cambios que el MP4 no tiene: sin guardar todavía, o
              // guardados después del último render.
              desactualizado={
                estadoRender === "LISTO" &&
                (sinGuardar ||
                  Boolean(clip.editadoEn && clip.renderizadoEn && new Date(clip.editadoEn) > new Date(clip.renderizadoEn)))
              }
              guardando={guardando || sinGuardar}
              pidiendo={pidiendoRender}
              puedeProcesar={opera}
              onProcesar={() => void pedirRender()}
            />
          }
        />
      ) : (
        <p className="text-sm text-white/50">El video todavía no está listo en Bunny.</p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* ---- Controles ---- */}
        <div className="space-y-5">
          <Seccion titulo="Tramo">
            <div className="mb-3 flex flex-wrap gap-2">
              {(
                [
                  ["inicio", "Tocar = inicio"],
                  ["fin", "Tocar = fin"],
                  ["corregir", "Tocar = corregir palabra"],
                ] as const
              ).map(([m, texto]) => (
                <button
                  key={m}
                  onClick={() => setModo(m)}
                  className={`rounded-lg px-3 py-1.5 text-xs ${
                    modo === m ? "bg-white text-black" : "border border-white/15 text-white/70"
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg bg-black/30 p-3 text-[15px] leading-8">
              {palabras.map((p) => {
                const mitad = (p.desde + p.hasta) / 2;
                const dentro = mitad >= b.desdeSeg && mitad <= b.hastaSeg;
                const corregida = correccionDe.get(Math.round(p.desde * 1000));
                return (
                  <button
                    key={p.desde}
                    onClick={() => tocarPalabra(p)}
                    title={`${p.desde.toFixed(2)} s`}
                    className={`mr-1 rounded px-0.5 transition ${
                      dentro ? "bg-ng-teal/20 text-white" : "text-white/35"
                    } hover:bg-white/20 ${corregida !== undefined ? "underline decoration-amber-400" : ""}`}
                  >
                    {corregida !== undefined ? corregida || "∅" : p.texto}
                  </button>
                );
              })}
            </div>
            {corrigiendo && (
              <Correccion
                palabra={corrigiendo}
                actual={correccionDe.get(Math.round(corrigiendo.desde * 1000))}
                onGuardar={(texto) => corregir(corrigiendo, texto)}
                onCancelar={() => setCorrigiendo(null)}
              />
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <AjusteFino
                etiqueta="Empieza"
                valor={b.desdeSeg}
                onCambio={(v) => cambiarTramo(Math.min(v, b.hastaSeg - 1), b.hastaSeg)}
                disabled={!opera}
              />
              <AjusteFino
                etiqueta="Termina"
                valor={b.hastaSeg}
                onCambio={(v) => cambiarTramo(b.desdeSeg, Math.max(v, b.desdeSeg + 1))}
                disabled={!opera}
              />
            </div>
            <p className="mt-2 text-xs text-white/45">Dura {duracion.toFixed(2)} s</p>
          </Seccion>
        </div>

        <div className="space-y-5">

          <Seccion titulo="Subtítulos">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={b.subtitulosActivos}
                onChange={(e) => cambiar({ subtitulosActivos: e.target.checked })}
                disabled={!opera}
              />
              Subtítulos con la palabra resaltada
            </label>
            {b.subtitulosActivos && (
              <EstiloSubtitulos
                valor={b.subtitulo}
                porDefecto={subtituloPorDefecto(LIENZOS[b.formato], b.diseno)}
                onCambiar={(subtitulo) => cambiar({ subtitulo })}
                deshabilitado={!opera}
              />
            )}
            <p className="mt-1 text-xs text-white/40">
              Para arreglar una palabra mal transcrita: “Tocar = corregir palabra” y tocala en el
              texto. Cambia el subtítulo, no el tiempo.
              {b.correcciones.length > 0 && ` ${b.correcciones.length} corregida(s).`}
            </p>
          </Seccion>

          <Seccion titulo="Textos">
            <PanelTextos
              textos={b.textos}
              onCambiar={(textos) => cambiar({ textos })}
              elegido={textoElegido}
              onElegir={setTextoElegido}
              duracion={duracion}
              colorMarca={estilo.colorResaltado}
              deshabilitado={!opera}
            />
          </Seccion>

          <Seccion titulo="Plantilla de la marca">
            {estilo.plantilla && (estilo.plantilla.logoActivo || estilo.plantilla.ctaActivo) ? (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={b.plantillaActiva}
                    onChange={(e) => cambiar({ plantillaActiva: e.target.checked })}
                    disabled={!opera}
                  />
                  {[
                    estilo.plantilla.logoActivo && (estilo.logoUrl ? "Logo" : null),
                    estilo.plantilla.ctaActivo && estilo.plantilla.ctaTexto.trim() ? "llamada a la acción al final" : null,
                  ]
                    .filter(Boolean)
                    .join(" y ") || "Plantilla"}{" "}
                  de la marca en este clip
                </label>
                <p className="mt-1 text-xs text-white/40">
                  Se configura una vez para todos los clips, en{" "}
                  <Link href="/admin/plantilla" className="text-ng-celeste hover:underline">
                    Plantilla de clips
                  </Link>
                  .
                </p>
              </>
            ) : (
              <p className="text-xs text-white/50">
                La marca no tiene plantilla. Con una, cada clip sale con su logo y una llamada a la acción al final:{" "}
                <Link href="/admin/plantilla" className="text-ng-celeste hover:underline">
                  armala en Plantilla de clips
                </Link>
                .
              </p>
            )}
          </Seccion>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">{titulo}</h2>
      {children}
    </section>
  );
}

/** Un tiempo con ajuste fino: ±50 ms con los botones, o al milisegundo tipeando. */
function AjusteFino({
  etiqueta,
  valor,
  onCambio,
  disabled,
}: {
  etiqueta: string;
  valor: number;
  onCambio: (v: number) => void;
  disabled?: boolean;
}) {
  const [texto, setTexto] = useState(valor.toFixed(3));
  useEffect(() => setTexto(valor.toFixed(3)), [valor]);
  return (
    <div>
      <p className="mb-1 text-xs text-white/50">{etiqueta} (s del episodio)</p>
      <div className="flex items-center gap-1">
        <button disabled={disabled} onClick={() => onCambio(valor - 0.05)} className="rounded border border-white/15 px-2 py-1 text-xs">
          −50ms
        </button>
        <input
          value={texto}
          disabled={disabled}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => {
            const n = parseFloat(texto.replace(",", "."));
            if (Number.isFinite(n)) onCambio(n);
            else setTexto(valor.toFixed(3));
          }}
          className="w-24 rounded border border-white/15 bg-black/30 px-2 py-1 text-center text-xs tabular-nums"
        />
        <button disabled={disabled} onClick={() => onCambio(valor + 0.05)} className="rounded border border-white/15 px-2 py-1 text-xs">
          +50ms
        </button>
      </div>
    </div>
  );
}

function Correccion({
  palabra,
  actual,
  onGuardar,
  onCancelar,
}: {
  palabra: Palabra;
  actual?: string;
  onGuardar: (texto: string | null) => void;
  onCancelar: () => void;
}) {
  const [texto, setTexto] = useState(actual ?? palabra.texto);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm">
      <span className="text-white/50">
        “{palabra.texto}” en {palabra.desde.toFixed(2)} s →
      </span>
      <input
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onGuardar(texto.trim() === palabra.texto ? null : texto)}
        maxLength={60}
        className="rounded border border-white/15 bg-black/30 px-2 py-1"
      />
      <button onClick={() => onGuardar(texto.trim() === palabra.texto ? null : texto)} className="rounded bg-white px-2 py-1 text-xs text-black">
        Guardar
      </button>
      <button onClick={() => onGuardar("")} className="rounded border border-white/15 px-2 py-1 text-xs">
        Quitar del subtítulo
      </button>
      {actual !== undefined && (
        <button onClick={() => onGuardar(null)} className="rounded border border-white/15 px-2 py-1 text-xs">
          Volver al original
        </button>
      )}
      <button onClick={onCancelar} className="text-xs text-white/40">
        Cancelar
      </button>
    </div>
  );
}

/**
 * La letra, el tamaño, el efecto y la altura de los subtítulos. Mover y
 * agrandar también se hace sobre la vista previa; acá están los atajos. El
 * primer cambio arranca del subtítulo de siempre, en su lugar.
 */
function EstiloSubtitulos({
  valor,
  porDefecto,
  onCambiar,
  deshabilitado,
}: {
  valor: SubtituloClip | null;
  porDefecto: SubtituloClip;
  onCambiar: (s: SubtituloClip | null) => void;
  deshabilitado: boolean;
}) {
  const s = valor ?? porDefecto;
  const poner = (parcial: Partial<SubtituloClip>) => onCambiar({ ...s, ...parcial });
  const boton = (activo: boolean) =>
    `rounded-md px-2.5 py-1 text-xs transition ${activo ? "bg-marca font-medium text-white" : "border border-white/10 text-white/60 hover:text-white"}`;
  return (
    <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-white/45">Arrastrá el subtítulo en la vista previa para subirlo o bajarlo; la bolita de la derecha lo agranda.</p>
      <Fila etiqueta="Letra">
        {(
          [
            ["NUNITO", "Nunito"],
            ["ANTON", "Anton"],
            ["BEBAS", "Bebas"],
          ] as const
        ).map(([f, t]) => (
          <button key={f} disabled={deshabilitado} onClick={() => poner({ fuente: f })} className={boton(s.fuente === f)}>
            {t}
          </button>
        ))}
      </Fila>
      <Fila etiqueta="Efecto">
        {(
          [
            ["CONTORNO", "Contorno"],
            ["SOMBRA", "Sombra"],
            ["CAJA", "Caja"],
            ["NINGUNO", "Nada"],
          ] as const
        ).map(([e, t]) => (
          <button key={e} disabled={deshabilitado} onClick={() => poner({ efecto: e })} className={boton(s.efecto === e)}>
            {t}
          </button>
        ))}
      </Fila>
      <Fila etiqueta={`Tamaño · ${Math.round(s.tamano)}`}>
        <input
          type="range"
          min={SUBTITULO_TAMANO_MIN}
          max={SUBTITULO_TAMANO_MAX}
          step={2}
          value={s.tamano}
          disabled={deshabilitado}
          onChange={(e) => poner({ tamano: Number(e.target.value) })}
          className="w-full accent-[#A855F7]"
        />
      </Fila>
      <Fila etiqueta="Lugar">
        {(
          [
            ["Arriba", 0.2],
            ["Centro", 0.5],
            ["Abajo", porDefecto.centroY],
          ] as const
        ).map(([t, y]) => (
          <button key={t} disabled={deshabilitado} onClick={() => poner({ centroY: y })} className={boton(Math.abs(s.centroY - y) < 0.01)}>
            {t}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-1.5 text-xs text-white/70">
          <input type="checkbox" checked={s.mayusculas} disabled={deshabilitado} onChange={(e) => poner({ mayusculas: e.target.checked })} />
          MAYÚSCULAS
        </label>
      </Fila>
      {valor && (
        <button disabled={deshabilitado} onClick={() => onCambiar(null)} className="text-xs text-ng-celeste hover:underline">
          Volver al subtítulo de siempre
        </button>
      )}
    </div>
  );
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-24 shrink-0 text-xs text-white/50">{etiqueta}</span>
      {children}
    </div>
  );
}
