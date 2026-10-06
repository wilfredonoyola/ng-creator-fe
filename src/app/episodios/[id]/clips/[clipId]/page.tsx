"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import {
  ACTUALIZAR_CLIP_EPISODIO,
  CLIP_EPISODIO,
  EPISODIO_EDITOR,
  RENDERIZAR_CLIP_EPISODIO,
  SUGERIR_CORTES_DE_SILENCIO,
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
import type { DisenoClip, Encuadre, FondoClip, FormatoClip, ImagenClip, ImagenClipServidor, Region, SubtituloClip, Texto } from "@/lib/clip-encuadre";
import { LIENZOS, MAXIMO_IMAGENES, SUBTITULO_TAMANO_MAX, SUBTITULO_TAMANO_MIN, subtituloPorDefecto, vistaDeImagen } from "@/lib/clip-encuadre";
import { disenosDeTexto, PanelTextos, textoNuevo } from "@/components/episodios/PanelTextos";
import { imagenNueva, PanelImagenes } from "@/components/episodios/PanelImagenes";
import { ErrorDeSubida, uploadImagenClip } from "@/lib/upload";
import { InspectorClip, usePestanaInspector, type PestanaInspector } from "@/components/episodios/InspectorClip";
import { PanelAutoEncuadre, type PersonaAuto } from "@/components/episodios/PanelAutoEncuadre";
import { AvisoCruces, buscarCruces, type CruceClip } from "@/components/episodios/TomarClip";
import { BarraDelClip } from "@/components/episodios/BarraDelClip";
import { GaleriaEstilos } from "@/components/estilos/GaleriaEstilos";
import { ESTILO_TEXTO_POR_DEFECTO, resolverEstilo, temaValido, type EstiloTexto } from "@/lib/estilos-texto";
import { useEstilosTexto } from "@/lib/use-estilos-texto";
import { agregarCorte, duracionEfectiva, estaCortado, normalizarCortes, type Corte } from "@/lib/cortes";
import { Captions, Palette, ScrollText, Stamp, Type } from "lucide-react";

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
  /** Hasta tres imágenes encima del video; el recorte lo hace el servidor. */
  imagenes: ImagenClip[];
  /** Si lleva el logo y la llamada a la acción de la plantilla de la marca (be#117). */
  plantillaActiva: boolean;
  /** El estilo de texto de este clip (be#132). Null = el de la marca. */
  estiloTexto: EstiloTexto | null;
  /** Lo que se quita del medio del clip, en segundos del episodio (normalizado). */
  cortes: Corte[];
}

/** Las pestañas del inspector, en orden. Cada una se abre con `#id` en la dirección. */
const PESTANAS = ["estilo", "textos", "subtitulos", "marca", "transcripcion"] as const;
type Pestana = (typeof PESTANAS)[number];

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
  const tr = useTranslations("editorClip");
  const tn = useTranslations("estilosNombres");
  const ti = useTranslations("editorImagenes");
  const te = useTranslations("erroresSubida");
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
  // La resolución de la fuente para la calidad estimada: la del original según
  // Bunny; si no la sabe, la que midió el último render. Sin ninguna de las
  // dos no se estima (el HLS de la vista previa no sirve: arranca en la
  // calidad más baja).
  const resolucionFuente: { ancho: number; alto: number } | null =
    ep?.resolucionOriginal ??
    (clip?.calidad?.fuenteAncho && clip.calidad.fuenteAlto
      ? { ancho: clip.calidad.fuenteAncho, alto: clip.calidad.fuenteAlto }
      : null);

  const [b, setB] = useState<Borrador | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modo, setModo] = useState<"inicio" | "fin" | "corregir" | "quitar">("inicio");
  const [corrigiendo, setCorrigiendo] = useState<Palabra | null>(null);
  // "Quitar del clip" en la transcripción: de una palabra a otra. Y la palabra
  // tachada que se tocó, para volver a ponerla.
  const [seleccion, setSeleccion] = useState<{ a: Palabra; b: Palabra } | null>(null);
  const [reponiendo, setReponiendo] = useState<{ palabra: Palabra; corte: Corte } | null>(null);
  const [textoElegido, setTextoElegido] = useState<number | null>(null);
  const [imagenElegida, setImagenElegida] = useState<number | null>(null);
  const [pestana, elegirPestana] = usePestanaInspector(PESTANAS, "estilo");
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
      imagenes: (clip.imagenes ?? []).map((im: ImagenClipServidor) => ({
        id: im.id,
        url: im.url,
        sinFondo: im.sinFondo,
        contorno: im.contorno,
        centroX: im.centroX,
        centroY: im.centroY,
        ancho: im.ancho,
        desdeSeg: im.desdeSeg,
        hastaSeg: im.hastaSeg ?? null,
      })),
      plantillaActiva: clip.plantillaActiva ?? true,
      estiloTexto: clip.estiloTexto ?? null,
      cortes: normalizarCortes(clip.cortes ?? [], clip.desdeSeg, clip.hastaSeg),
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
              // La lista entera; quitar el fondo lo encola el servidor al guardar.
              imagenes: borrador.imagenes.map(({ id, url, sinFondo, contorno, centroX, centroY, ancho, desdeSeg, hastaSeg }) => ({
                id,
                url,
                sinFondo,
                contorno,
                centroX,
                centroY,
                ancho,
                desdeSeg,
                hastaSeg: hastaSeg ?? null,
              })),
              plantillaActiva: borrador.plantillaActiva,
              // null = el de la marca.
              estiloTexto: borrador.estiloTexto,
              // La lista entera: reemplaza la guardada.
              cortes: borrador.cortes,
            },
          },
        });
        tramoGuardado.current = { desdeSeg: borrador.desdeSeg, hastaSeg: borrador.hastaSeg };
        if (ultimo.current === borrador) setSinGuardar(false);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : tr("errores.guardar"));
        throw e;
      } finally {
        setGuardando(false);
      }
    },
    [marcaId, clipId, episodioId, actualizar, cliente, tr],
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

  // Las imágenes a las que el servidor les está quitando el fondo: también se
  // pregunta seguido, hasta que queden LISTO o FALLIDO.
  const imagenesServidor: ImagenClipServidor[] = clipQ.data?.clipEpisodio?.imagenes ?? [];
  const recortando = imagenesServidor.some((im) => im.estadoRecorte === "PENDIENTE");

  const { startPolling, stopPolling } = clipQ;
  useEffect(() => {
    if (renderEnCurso || analizando || recortando) startPolling(analizando ? 2500 : recortando && !renderEnCurso ? 3000 : 4000);
    else stopPolling();
    return () => stopPolling();
  }, [renderEnCurso, analizando, recortando, startPolling, stopPolling]);

  const correccionDe = useMemo(() => {
    const m = new Map<number, string>();
    b?.correcciones.forEach((c) => m.set(Math.round(c.desde * 1000), c.texto));
    return m;
  }, [b?.correcciones]);

  if (!clip || !b || !ep || !estilo) {
    return (
      <DashboardLayout menuColapsable="editor-clip" margenChico>
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
  const efectiva = duracionEfectiva(b.desdeSeg, b.hastaSeg, b.cortes);
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
    // Los cortes que quedan afuera del tramo nuevo se van.
    const cortes = normalizarCortes(b.cortes, desde, hasta);
    cambiar({ desdeSeg: redondo(desde), hastaSeg: redondo(hasta), posiciones, cortes });
  }

  function tocarPalabra(p: Palabra) {
    if (!b || !opera) return;
    // Una palabra tachada: se ofrece volver a ponerla.
    const corte = estaCortado((p.desde + p.hasta) / 2, b.cortes);
    if (corte) {
      setSeleccion(null);
      setReponiendo({ palabra: p, corte });
      return;
    }
    setReponiendo(null);
    if (modo === "quitar") {
      // El primer toque elige una palabra; el segundo, hasta dónde va la frase.
      setSeleccion((s) =>
        s && s.a === s.b && s.a !== p ? (p.desde < s.a.desde ? { a: p, b: s.a } : { a: s.a, b: p }) : { a: p, b: p },
      );
      return;
    }
    if (modo === "inicio") {
      cambiarTramo(p.desde, Math.max(b.hastaSeg, p.desde + 1));
    } else if (modo === "fin") {
      cambiarTramo(Math.min(b.desdeSeg, p.hasta - 1), p.hasta);
    } else {
      setCorrigiendo(p);
    }
  }

  /** Lo elegido en la transcripción sale del clip: desde el inicio de la primera palabra hasta el fin de la última. */
  function quitarSeleccion() {
    if (!b || !seleccion) return;
    const r = agregarCorte(b.cortes, { desdeSeg: seleccion.a.desde, hastaSeg: seleccion.b.hasta }, b.desdeSeg, b.hastaSeg);
    if (!r) {
      setError(tr("errores.noQuitarTodo"));
      return;
    }
    setError(null);
    cambiar({ cortes: r });
    setSeleccion(null);
  }

  function reponer(c: Corte) {
    if (!b) return;
    cambiar({ cortes: b.cortes.filter((x) => x.desdeSeg !== c.desdeSeg || x.hastaSeg !== c.hastaSeg) });
    setReponiendo(null);
  }

  /** Los silencios largos que propone el servidor; el editor los une a los suyos. */
  async function sugerirSilencios(): Promise<Corte[]> {
    if (!marcaId) return [];
    const r = await cliente.query({
      query: SUGERIR_CORTES_DE_SILENCIO,
      variables: { id: clipId, marcaId },
      fetchPolicy: "no-cache",
    });
    return (r.data?.sugerirCortesDeSilencio ?? []).map((c: Corte) => ({ desdeSeg: c.desdeSeg, hastaSeg: c.hastaSeg }));
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
    if (b.posiciones.length > 1 && !window.confirm(tr("confirmarAuto"))) {
      return;
    }
    setError(null);
    setResumenAbierto(false);
    try {
      // El worker mira el tramo guardado: primero lo pendiente.
      if (!(await guardarAhora())) return;
      await autoEncuadrar({ variables: { id: clipId, marcaId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("errores.auto"));
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
      setError(e instanceof Error ? e.message : tr("errores.deshacer"));
    }
  }

  async function pedirRender() {
    if (!marcaId || !b) return;
    if (vistasImagenes.some((v) => v.estado === "PENDIENTE") && !window.confirm(ti("confirmarRender"))) return;
    setError(null);
    try {
      if (!(await guardarAhora())) return;
      await renderizar({ variables: { id: clipId, marcaId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("errores.procesar"));
    }
  }

  const lineas: LineaSubtitulo[] = clip.lineasSubtitulo ?? [];

  // ---- Imágenes ----
  const vistasImagenes = b.imagenes.map((im) => vistaDeImagen(im, imagenesServidor));
  // Con el video 16:9 en el medio, la imagen nueva va a la franja de abajo.
  const conHorizontal = b.formato === "VERTICAL" && (b.diseno === "HORIZONTAL" || b.posiciones.some((p) => p.diseno === "HORIZONTAL"));

  /** Sube una imagen y la suma al clip, ya elegida. Rechaza con el error en el idioma de la pantalla. */
  async function subirImagen(file: File) {
    if (!marcaId || !b || b.imagenes.length >= MAXIMO_IMAGENES) return;
    let url: string;
    try {
      url = await uploadImagenClip(file, marcaId);
    } catch (e) {
      throw new Error(e instanceof ErrorDeSubida ? te(e.clave, e.datos) : e instanceof Error ? e.message : ti("errorSubir"));
    }
    setB((prev) =>
      prev && prev.imagenes.length < MAXIMO_IMAGENES
        ? { ...prev, imagenes: [...prev.imagenes, imagenNueva(url, prev.imagenes, conHorizontal)] }
        : prev,
    );
    // Queda elegida la nueva: la última de la lista.
    setTextoElegido(null);
    setImagenElegida(b.imagenes.length);
    elegirPestana("textos");
  }

  function elegirImagen(i: number | null) {
    setImagenElegida(i);
    if (i !== null) setTextoElegido(null);
  }

  function elegirTexto(i: number | null) {
    setTextoElegido(i);
    if (i !== null) setImagenElegida(null);
  }

  // El estilo con que sale (estiloTextoEfectivo): el del clip, el de la marca o
  // KARAOKE. Se calcula acá para que la vista previa cambie apenas se elige.
  // KARAOKE se dibuja como siempre; los demás, con el tema de la marca.
  const estiloEfectivo: EstiloTexto =
    b.estiloTexto ?? estilo.estiloTexto ?? clip.estiloTextoEfectivo ?? ESTILO_TEXTO_POR_DEFECTO;
  const defEfectivo = porEstilo.get(estiloEfectivo);
  const conEstilo = defEfectivo && !defEfectivo.respetaTextos ? resolverEstilo(defEfectivo, estilo.tema) : null;

  const desactualizado =
    estadoRender === "LISTO" &&
    (sinGuardar || Boolean(clip.editadoEn && clip.renderizadoEn && new Date(clip.editadoEn) > new Date(clip.renderizadoEn)));

  // ---- Las pestañas del inspector ----
  const pestanas: PestanaInspector<Pestana>[] = [
    {
      id: "estilo",
      etiqueta: tr("pestanas.estilo.etiqueta"),
      titulo: tr("pestanas.estilo.titulo"),
      icono: Palette,
      contenido: (
        <>
          <GaleriaEstilos
            enPanel
            tema={temaValido(estilo.tema)}
            valor={b.estiloTexto}
            onElegir={(estiloTexto) => cambiar({ estiloTexto })}
            deLaMarca={estilo.estiloTexto ?? ESTILO_TEXTO_POR_DEFECTO}
            nombreMarca={activa?.nombre}
            deshabilitado={!opera}
          />
          <p className="mt-3 text-xs text-white/40">
            {tr.rich("estiloAyuda", {
              link: (c) => (
                <Link href="/admin/plantilla" className="text-ng-celeste hover:underline">
                  {c}
                </Link>
              ),
            })}
          </p>
        </>
      ),
    },
    {
      id: "textos",
      etiqueta: tr("pestanas.textos.etiqueta"),
      titulo: tr("pestanas.textos.titulo"),
      icono: Type,
      contenido: (
        <>
          {conEstilo && (
            <p className="mb-3 text-xs text-white/45">
              {tr("textosConEstilo", { estilo: tn(`nombres.${conEstilo.def.estilo}`) })}
            </p>
          )}
          <PanelTextos
            textos={b.textos}
            onCambiar={(textos) => cambiar({ textos })}
            elegido={textoElegido}
            onElegir={elegirTexto}
            duracion={duracion}
            colorMarca={estilo.colorResaltado}
            deshabilitado={!opera}
          />
          <div className="mt-5 border-t border-white/10 pt-4">
            <PanelImagenes
              imagenes={b.imagenes}
              estados={vistasImagenes.map((v) => v.estado)}
              onCambiar={(imagenes) => cambiar({ imagenes })}
              elegida={imagenElegida}
              onElegir={elegirImagen}
              onSubir={subirImagen}
              duracion={duracion}
              deshabilitado={!opera}
            />
          </div>
        </>
      ),
    },
    {
      id: "subtitulos",
      etiqueta: tr("pestanas.subtitulos.etiqueta"),
      icono: Captions,
      contenido: (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={b.subtitulosActivos}
              onChange={(e) => cambiar({ subtitulosActivos: e.target.checked })}
              disabled={!opera}
            />
            {tr("subtitulosActivos")}
          </label>
          {b.subtitulosActivos && (
            <EstiloSubtitulos
              delEstilo={conEstilo ? tn(`nombres.${conEstilo.def.estilo}`) : undefined}
              valor={b.subtitulo}
              porDefecto={subtituloPorDefecto(LIENZOS[b.formato], b.diseno)}
              onCambiar={(subtitulo) => cambiar({ subtitulo })}
              deshabilitado={!opera}
            />
          )}
          <p className="mt-3 text-xs text-white/40">
            {tr.rich("malTranscrita", {
              boton: (c) => (
                <button
                  onClick={() => {
                    setModo("corregir");
                    elegirPestana("transcripcion");
                  }}
                  className="text-ng-celeste hover:underline"
                >
                  {c}
                </button>
              ),
            })}
            {b.correcciones.length > 0 && ` ${tr("corregidas", { n: b.correcciones.length })}`}
          </p>
        </>
      ),
    },
    {
      id: "marca",
      etiqueta: tr("pestanas.marca.etiqueta"),
      titulo: tr("pestanas.marca.titulo"),
      icono: Stamp,
      contenido:
        estilo.plantilla && (estilo.plantilla.logoActivo || estilo.plantilla.ctaActivo) ? (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={b.plantillaActiva}
                onChange={(e) => cambiar({ plantillaActiva: e.target.checked })}
                disabled={!opera}
              />
              {(() => {
                const conLogo = Boolean(estilo.plantilla.logoActivo && estilo.logoUrl);
                const conLlamada = Boolean(estilo.plantilla.ctaActivo && estilo.plantilla.ctaTexto.trim());
                return tr(
                  conLogo && conLlamada
                    ? "marca.ambos"
                    : conLogo
                      ? "marca.logo"
                      : conLlamada
                        ? "marca.llamada"
                        : "marca.brandKit",
                );
              })()}
            </label>
            <p className="mt-1 text-xs text-white/40">
              {tr.rich("marca.seConfigura", {
                link: (c) => (
                  <Link href="/admin/plantilla" className="text-ng-celeste hover:underline">
                    {c}
                  </Link>
                ),
              })}
            </p>
          </>
        ) : (
          <p className="text-xs text-white/50">
            {tr.rich("marca.sinBrandKit", {
              link: (c) => (
                <Link href="/admin/plantilla" className="text-ng-celeste hover:underline">
                  {c}
                </Link>
              ),
            })}
          </p>
        ),
    },
    {
      id: "transcripcion",
      etiqueta: tr("pestanas.transcripcion.etiqueta"),
      titulo: tr("pestanas.transcripcion.titulo"),
      icono: ScrollText,
      contenido: (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {(["inicio", "fin", "corregir", "quitar"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setModo(m);
                  setSeleccion(null);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  modo === m ? "bg-white text-black" : "border border-white/15 text-white/70"
                }`}
              >
                {tr(`modos.${m}`)}
              </button>
            ))}
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg bg-black/30 p-3 text-[15px] leading-8 md:max-h-[45vh]">
            {palabras.map((p) => {
              const mitad = (p.desde + p.hasta) / 2;
              const dentro = mitad >= b.desdeSeg && mitad <= b.hastaSeg;
              const cortada = dentro && Boolean(estaCortado(mitad, b.cortes));
              const elegida = seleccion && p.desde >= seleccion.a.desde && p.desde <= seleccion.b.desde;
              const corregida = correccionDe.get(Math.round(p.desde * 1000));
              return (
                <button
                  key={p.desde}
                  onClick={() => tocarPalabra(p)}
                  title={cortada ? tr("quitar.tachada") : `${p.desde.toFixed(2)} s`}
                  className={`mr-1 rounded px-0.5 transition ${
                    elegida
                      ? "bg-marca/30 text-white"
                      : cortada
                        ? "text-white/30 line-through decoration-red-400 decoration-2"
                        : dentro
                          ? "bg-ng-teal/20 text-white"
                          : "text-white/35"
                  } hover:bg-white/20 ${corregida !== undefined ? "underline decoration-amber-400" : ""}`}
                >
                  {corregida !== undefined ? corregida || "∅" : p.texto}
                </button>
              );
            })}
          </div>
          {modo === "quitar" && !seleccion && !reponiendo && (
            <p className="mt-2 text-xs text-white/45">{tr("quitar.ayuda")}</p>
          )}
          {seleccion && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-marca/30 bg-marca/5 p-3 text-sm">
              <span className="min-w-0 flex-1 truncate text-white/70">
                {tr("quitar.seleccion", {
                  n: palabras.filter((p) => p.desde >= seleccion.a.desde && p.desde <= seleccion.b.desde).length,
                  seg: (seleccion.b.hasta - seleccion.a.desde).toFixed(1),
                })}
              </span>
              <button onClick={quitarSeleccion} className="rounded bg-marca px-2 py-1 text-xs font-medium text-ng-tinta">
                {tr("quitar.quitar")}
              </button>
              <button onClick={() => setSeleccion(null)} className="text-xs text-white/40">
                {tr("quitar.cancelar")}
              </button>
            </div>
          )}
          {reponiendo && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/5 p-3 text-sm">
              <span className="min-w-0 flex-1 text-white/70">
                {tr("reponer.texto", {
                  palabra: reponiendo.palabra.texto,
                  seg: (reponiendo.corte.hastaSeg - reponiendo.corte.desdeSeg).toFixed(1),
                })}
              </span>
              <button onClick={() => reponer(reponiendo.corte)} className="rounded bg-white px-2 py-1 text-xs text-black">
                {tr("reponer.volver")}
              </button>
              <button onClick={() => setReponiendo(null)} className="text-xs text-white/40">
                {tr("reponer.cancelar")}
              </button>
            </div>
          )}
          {corrigiendo && (
            <Correccion
              palabra={corrigiendo}
              actual={correccionDe.get(Math.round(corrigiendo.desde * 1000))}
              onGuardar={(texto) => corregir(corrigiendo, texto)}
              onCancelar={() => setCorrigiendo(null)}
            />
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
            <AjusteFino
              etiqueta={tr("empieza")}
              valor={b.desdeSeg}
              onCambio={(v) => cambiarTramo(Math.min(v, b.hastaSeg - 1), b.hastaSeg)}
              disabled={!opera}
            />
            <AjusteFino
              etiqueta={tr("termina")}
              valor={b.hastaSeg}
              onCambio={(v) => cambiarTramo(b.desdeSeg, Math.max(v, b.desdeSeg + 1))}
              disabled={!opera}
            />
          </div>
          <p className="mt-2 text-xs text-white/45">
            {b.cortes.length
              ? tr("duraConCortes", { seg: efectiva.toFixed(2), total: duracion.toFixed(2) })
              : tr("dura", { seg: duracion.toFixed(2) })}
          </p>
        </>
      ),
    },
  ];
  const inspector = <InspectorClip pestanas={pestanas} activa={pestana} onElegir={elegirPestana} />;

  return (
    <DashboardLayout menuColapsable="editor-clip" margenChico>
      {/* Desde md, la página entera es el editor: el alto de la ventana menos
          los márgenes de DashboardLayout (1rem con margenChico), sin scroll de
          página. El menú de la app arranca colapsado en una tira de íconos. */}
      <div className="flex flex-col md:h-[calc(100dvh-2rem)]">
        <header
          className="barra-clip sticky z-20 -mx-4 -mt-4 mb-3 h-14 shrink-0 border-b border-white/10 bg-ng-fondo/95 px-4 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 md:static md:-mx-4 md:-mt-4 md:px-4"
          // Debajo de la barra de arriba del teléfono (DashboardLayout), que también es sticky.
          style={{ top: "calc(2.6875rem + max(0.75rem, env(safe-area-inset-top)))" }}
        >
          <BarraDelClip
            clipId={clipId}
            marcaId={marcaId ?? ""}
            hrefVolver={`/episodios/${episodioId}`}
            episodio={ep.titulo}
            titulo={b.titulo}
            onCambiarTitulo={(titulo) => cambiar({ titulo })}
            tomadoPor={clip.tomadoPor}
            listoPor={clip.listoPor}
            publicacion={clip.publicacion}
            puedeOperar={opera}
            hrefProgramar={`/episodios/${episodioId}/clips/${clipId}/publicar`}
            guardado={{ guardando, sinGuardar, error: Boolean(error) }}
            render={{
              estado: estadoRender ?? null,
              progreso: clip.progresoRender ?? 0,
              error: clip.errorRender,
              urlVideo: clip.urlVideo,
              desactualizado,
              pidiendo: pidiendoRender,
              calidad: clip.calidad,
            }}
            onProcesar={() => void pedirRender()}
          />
        </header>
        {error && <p className="mb-3 shrink-0 text-sm text-red-400">{error}</p>}
        {cruces && (
          <div className="mb-3 shrink-0">
            <AvisoCruces
              cruces={cruces}
              usuarioId={usuario?._id}
              textoSeguir={tr("guardarIgual")}
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
          <div className="editor-contenedor md:min-h-0 md:flex-1">
            <EditorRecorte
              url={ep.urlReproduccion}
              resolucionFuente={resolucionFuente}
              desde={b.desdeSeg}
              hasta={b.hastaSeg}
              formato={b.formato}
              diseno={b.diseno}
              fondo={b.fondo}
              autoEncuadre={{
                analizando: analizando || pidiendoAuto,
                resumen:
                  estadoAuto === "LISTO" && clip.personasAutoEncuadre != null
                    ? tr("personas", { n: clip.personasAutoEncuadre })
                    : null,
                personas: estadoAuto === "LISTO" ? clip.personasAutoEncuadre : null,
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
              // Tocar un texto en la vista previa lo abre en su pestaña.
              onElegirTexto={(i) => {
                elegirTexto(i);
                elegirPestana("textos");
              }}
              imagenes={b.imagenes}
              vistasImagenes={vistasImagenes}
              onCambiarImagenes={(imagenes) => cambiar({ imagenes })}
              imagenElegida={imagenElegida}
              onElegirImagen={(i) => {
                elegirImagen(i);
                elegirPestana("textos");
              }}
              onSoltarImagen={
                b.imagenes.length < MAXIMO_IMAGENES
                  ? (file) => void subirImagen(file).catch((e) => setError(e instanceof Error ? e.message : ti("errorSubir")))
                  : undefined
              }
              estilo={estilo}
              estiloTexto={conEstilo}
              nombreMarca={activa?.nombre}
              puedeEditar={opera}
              duracionEpisodio={ep.duracionSeg ?? 0}
              onCambiarTramo={cambiarTramo}
              cortes={b.cortes}
              onCambiarCortes={(cortes) => cambiar({ cortes })}
              onSugerirSilencios={sugerirSilencios}
              onCambiarFormato={(formato) => cambiar({ formato })}
              inspector={inspector}
            />
          </div>
        ) : (
          <div className="space-y-4 md:grid md:min-h-0 md:flex-1 md:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] md:gap-4 md:space-y-0">
            <p className="text-sm text-white/50">{tr("videoNoListo")}</p>
            <div className="md:min-h-0">{inspector}</div>
          </div>
        )}
      </div>
    </DashboardLayout>
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
  const tr = useTranslations("editorClip");
  const [texto, setTexto] = useState(valor.toFixed(3));
  useEffect(() => setTexto(valor.toFixed(3)), [valor]);
  return (
    <div>
      <p className="mb-1 text-xs text-white/50">{tr("delEpisodio", { etiqueta })}</p>
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
  const tr = useTranslations("editorClip");
  const [texto, setTexto] = useState(actual ?? palabra.texto);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm">
      <span className="text-white/50">
        {tr("correccion.palabra", { palabra: palabra.texto, seg: palabra.desde.toFixed(2) })}
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
        {tr("correccion.guardar")}
      </button>
      <button onClick={() => onGuardar("")} className="rounded border border-white/15 px-2 py-1 text-xs">
        {tr("correccion.quitar")}
      </button>
      {actual !== undefined && (
        <button onClick={() => onGuardar(null)} className="rounded border border-white/15 px-2 py-1 text-xs">
          {tr("correccion.original")}
        </button>
      )}
      <button onClick={onCancelar} className="text-xs text-white/40">
        {tr("correccion.cancelar")}
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
  delEstilo,
}: {
  /** Con un estilo de texto que no es KARAOKE: la letra, el efecto y las mayúsculas los pone el estilo. */
  delEstilo?: string;
  valor: SubtituloClip | null;
  porDefecto: SubtituloClip;
  onCambiar: (s: SubtituloClip | null) => void;
  deshabilitado: boolean;
}) {
  const tr = useTranslations("editorClip");
  const s = valor ?? porDefecto;
  const poner = (parcial: Partial<SubtituloClip>) => onCambiar({ ...s, ...parcial });
  const boton = (activo: boolean) =>
    `rounded-md px-2.5 py-1 text-xs transition ${activo ? "bg-marca font-medium text-ng-tinta" : "border border-white/10 text-white/60 hover:text-white"}`;
  return (
    <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-white/45">{tr("subtitulo.ayuda")}</p>
      {delEstilo && (
        <p className="text-xs text-white/45">
          {tr("subtitulo.conEstilo", { estilo: delEstilo })}
        </p>
      )}
      {!delEstilo && (
        <>
          <Fila etiqueta={tr("subtitulo.letra")}>
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
          <Fila etiqueta={tr("subtitulo.efecto")}>
            {(["CONTORNO", "SOMBRA", "CAJA", "NINGUNO"] as const).map((e) => (
              <button key={e} disabled={deshabilitado} onClick={() => poner({ efecto: e })} className={boton(s.efecto === e)}>
                {tr(`subtitulo.efectos.${e}`)}
              </button>
            ))}
          </Fila>
        </>
      )}
      <Fila etiqueta={tr("subtitulo.tamano", { n: Math.round(s.tamano) })}>
        <input
          type="range"
          min={SUBTITULO_TAMANO_MIN}
          max={SUBTITULO_TAMANO_MAX}
          step={2}
          value={s.tamano}
          disabled={deshabilitado}
          onChange={(e) => poner({ tamano: Number(e.target.value) })}
          className="w-full accent-[#FFD400]"
        />
      </Fila>
      <Fila etiqueta={tr("subtitulo.lugar")}>
        {(
          [
            ["arriba", 0.2],
            ["centro", 0.5],
            ["abajo", porDefecto.centroY],
          ] as const
        ).map(([lugar, y]) => (
          <button key={lugar} disabled={deshabilitado} onClick={() => poner({ centroY: y })} className={boton(Math.abs(s.centroY - y) < 0.01)}>
            {tr(`subtitulo.lugares.${lugar}`)}
          </button>
        ))}
        {!delEstilo && (
          <label className="ml-2 flex items-center gap-1.5 text-xs text-white/70">
            <input type="checkbox" checked={s.mayusculas} disabled={deshabilitado} onChange={(e) => poner({ mayusculas: e.target.checked })} />
            {tr("subtitulo.mayusculas")}
          </label>
        )}
      </Fila>
      {valor && (
        <button disabled={deshabilitado} onClick={() => onCambiar(null)} className="text-xs text-ng-celeste hover:underline">
          {tr("subtitulo.deSiempre")}
        </button>
      )}
    </div>
  );
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-white/50">{etiqueta}</span>
      {children}
    </div>
  );
}
