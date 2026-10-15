"use client";

import Link from "next/link";
import { CalendarClock, Loader2, MoreHorizontal, PencilLine, RotateCcw, Trash2, TriangleAlert, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import {
  CANCELAR_PUBLICACION,
  ELIMINAR_PUBLICACION,
  CLIP_EPISODIO,
  EDITAR_PUBLICACION,
  PROGRAMAR_PUBLICACION,
  PUBLICACIONES_DE_CLIP,
  REINTENTAR_PUBLICACION,
  RENDERIZAR_CLIP_EPISODIO,
  REPROGRAMAR_PUBLICACION,
} from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ModalConfirmar } from "@/components/ModalConfirmar";
import { useMarcaActiva } from "@/lib/marca-activa";
import { borrarBorradorProgramar, guardarBorradorProgramar, leerBorradorProgramar, type BorradorProgramar } from "@/lib/borrador-programar";
import { useSesion } from "@/lib/sesion";
import {
  ESTADOS_PUBLICACION,
  REDES,
  aInputLocal,
  diaYHora,
  esRechazoDeEtiquetas,
  fallaReemplazada,
  ordenarPorDestino,
  salidaEn,
  zonaHoraria,
  type Publicacion,
} from "@/lib/publicaciones";
import type { Red } from "@/lib/upload-post";
import {
  MAXIMO_ETIQUETADOS_INSTAGRAM,
  ajustesFacebook,
  ajustesInstagram,
  mencionadas,
  sinRepetir,
  textoParaRed,
  useAccionesPersonas,
  useInvitados,
  usePersonas,
  useSugeridas,
  type Persona,
} from "@/lib/etiquetas";
import { EditorMenciones } from "@/components/etiquetas/EditorMenciones";
import { EtiquetarPublicacion } from "@/components/etiquetas/EtiquetarPublicacion";
import {
  DESCRIPCION_MAX,
  TITULO_YOUTUBE_MAX,
  comoSaleEnCadaRed,
  type Destino,
  useDestinosMarca,
} from "@/lib/destinos";
import { conHashtags, useAjustesPublicacion } from "@/lib/ajustes-publicacion";
import { HashtagsChips } from "@/components/HashtagsChips";
import { IndicadorCalidad } from "@/components/episodios/IndicadorCalidad";
import type { CalidadClip } from "@/lib/calidad";
import { IconoRed, Poster } from "@/components/IconoRed";
import {
  REEL_FACEBOOK_MAX_SEG,
  SeccionVersionFacebook,
  versionEnCurso,
  type VersionCortaClip,
} from "@/components/episodios/VersionFacebook";
import { EtiquetaProveedor } from "@/components/EtiquetaProveedor";
import { CuadroPortada, ElegirPortadaClip } from "@/components/episodios/ElegirPortadaClip";
import { ComoSaleEnCadaRed } from "@/components/episodios/ComoSaleEnCadaRed";
import { MetricasClip } from "@/components/metricas/MetricasClip";
import { PanelRevision } from "@/components/revision/PanelRevision";
import { EtiquetaRevision } from "@/components/revision/EtiquetaRevision";
import { etiquetaRevision, useRevisionMarca, type EstadoRevision } from "@/lib/revision";

/** Lo que todavía va a salir: esa cuenta no se vuelve a marcar para este clip. */
const PENDIENTES: string[] = ["PROGRAMADA", "SUBIENDO", "PROCESANDO", "AGENDADA_EN_RED"];

/** Con menos margen, la hora ya pasó cuando llega al servidor. */
const MARGEN_MS = 60_000;

/**
 * Programar un clip en las redes de la marca (#70, ng-creator-be#71).
 *
 * No hace falta exportarlo antes: si el MP4 falta o quedó viejo, la pantalla
 * lo manda a exportar al entrar y deja programar recién cuando está listo
 * (así la portada se elige de entrada). Mientras, se llena el resto. Lo que se
 * llena queda en el navegador (`borrador-programar`): recargar no lo pierde.
 * El backend igual espera el video (`esperaVideo`) si se editó después: a la
 * hora sale siempre el MP4 de la última edición.
 *
 * La misma pantalla que la de la app (ng-creator-app, episodio/[id]/publicar),
 * menos "Publicar ahora": por ahora los clips solo se programan, y quedan en el
 * calendario para que el equipo vea qué sale y cuándo. Sale por la cola del
 * backend: se puede cerrar la pestaña y sale igual.
 */
export default function ProgramarClipPage({
  params,
}: {
  // Objeto plano, no promesa: ver publicados/[id].
  params: { id: string; clipId: string };
}) {
  const t = useTranslations("publicarClip");
  const { id: episodioId, clipId } = params;
  const { activa } = useMarcaActiva();
  const { puedeOperar } = useSesion();
  const marcaId = activa?._id ?? "";
  const opera = puedeOperar(activa?._id);

  const clipQ = useQuery(CLIP_EPISODIO, { variables: { id: clipId, marcaId }, skip: !activa });
  const { destinos, proveedores, faltanUploadPost } = useDestinosMarca(activa);
  const ajustes = useAjustesPublicacion(marcaId || undefined);
  const pubsQ = useQuery(PUBLICACIONES_DE_CLIP, {
    variables: { marcaId, clipId },
    skip: !activa,
    pollInterval: 10_000,
    errorPolicy: "all",
  });

  const clip = clipQ.data?.clipEpisodio;
  // Mientras se procesa la versión para Facebook, el clip se refresca solo,
  // como en el editor con el render del clip.
  // Y mientras se exporta el clip, para habilitar Programar apenas termina.
  const versionProcesando = versionEnCurso(clip?.versionFacebook);
  const videoProcesando = clip?.estadoRender === "EN_COLA" || clip?.estadoRender === "RENDERIZANDO";
  const { startPolling, stopPolling } = clipQ;
  useEffect(() => {
    if (versionProcesando || videoProcesando) startPolling(videoProcesando ? 3000 : 4000);
    else stopPolling();
    return () => stopPolling();
  }, [versionProcesando, videoProcesando, startPolling, stopPolling]);
  const pagina = activa?.paginaFacebook;

  const volver = (
    <Link href={`/episodios/${episodioId}/clips/${clipId}`} className="text-sm text-white/50 hover:text-white/80">
      ← {clip?.titulo ?? t("editorDelClip")}
    </Link>
  );

  if (!clip) {
    return (
      <DashboardLayout>
        {clipQ.loading || !activa ? (
          <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
        ) : (
          <Vacio titulo={t("noEncontrado")} detalle={t("otraMarca")}>
            <Link href={`/episodios/${episodioId}`} className="mt-4 inline-block text-sm text-ng-teal">
              {t("volverAlEpisodio")}
            </Link>
          </Vacio>
        )}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {volver}
      <h1 className="mb-5 mt-2 text-2xl font-bold">{t("titulo")}</h1>
      <div className="mx-auto max-w-2xl">
        {/* La revisión antes de publicar (ng-creator-be#175): arriba, que es lo que se busca al llegar por un aviso. */}
        <div className="mb-6">
          <PanelRevision
            marcaId={marcaId}
            clipId={clip._id}
            urlVideo={clip.urlVideo}
            opera={opera}
            publicaciones={pubsQ.data?.publicacionesDeClip ?? []}
          />
        </div>
        <Formulario
          episodioId={episodioId}
          clip={clip}
          marcaId={marcaId}
          opera={opera}
          destinos={destinos}
          hashtagsMarca={ajustes.hashtags}
          destinosApagados={ajustes.destinosApagados}
          faltaInstagram={!!pagina && !pagina.instagramId && proveedores.INSTAGRAM === "propio"}
          faltanUploadPost={faltanUploadPost}
          tiktokPronto={proveedores.TIKTOK === "propio"}
          publicaciones={pubsQ.data?.publicacionesDeClip ?? []}
          refrescar={() => void pubsQ.refetch()}
        />
        {/* Cómo le fue a lo que ya salió. Sin publicaciones no se dibuja. */}
        <div className="mt-6">
          <MetricasClip
            marcaId={marcaId}
            clipId={clip._id}
            puntuacion={clip.origen === "MANUAL" ? null : clip.puntuacion}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

function Formulario({
  episodioId,
  clip,
  marcaId,
  opera,
  destinos,
  hashtagsMarca,
  destinosApagados,
  faltaInstagram,
  faltanUploadPost,
  tiktokPronto,
  publicaciones,
  refrescar,
}: {
  clip: {
    _id: string;
    titulo: string;
    urlPoster?: string | null;
    hastaSeg: number;
    /** Ya sin los cortes del medio. */
    duracionEfectivaSeg?: number | null;
    /** Lo que dura el MP4: sin los cortes y con la velocidad (be#173). */
    duracionFinalSeg?: number | null;
    desdeSeg: number;
    editadoEn?: string | null;
    renderizadoEn?: string | null;
    estadoRender?: string | null;
    progresoRender?: number | null;
    urlVideo?: string | null;
    versionFacebook?: VersionCortaClip | null;
    calidad?: CalidadClip | null;
    estadoRevision?: EstadoRevision | null;
  };
  marcaId: string;
  opera: boolean;
  destinos: Destino[];
  /** Los hashtags por defecto de la marca: se precargan y se pueden quitar para este clip. */
  hashtagsMarca: string[];
  /** Los `cuentaId` que la marca no quiere marcados de entrada (Redes conectadas). */
  destinosApagados: string[];
  /** La marca tiene página pero Meta no dio (o no hay) su Instagram. */
  faltaInstagram: boolean;
  /** Redes que publican por Upload-Post y no tienen cuenta conectada. */
  faltanUploadPost: Red[];
  /** TikTok por la integración propia todavía no se programa desde acá. */
  tiktokPronto: boolean;
  publicaciones: Publicacion[];
  refrescar: () => void;
  episodioId: string;
}) {
  const t = useTranslations("publicarClip");
  const tEtq = useTranslations("etiquetas");
  const tv = useTranslations("versionFacebook");
  const tc = useTranslations("calidadClip");
  const tr = useTranslations("revisionClip.programar");
  const locale = useLocale();
  const revision = useRevisionMarca(marcaId || undefined);
  // De entrada sale marcado todo destino usable que la marca no apagó en
  // Redes conectadas. Se guarda solo lo que la persona cambia (no la lista
  // entera), así las cuentas y los ajustes que llegan después de montar
  // también cuentan.
  const [cambios, setCambios] = useState<Map<string, boolean>>(() => new Map());
  const apagados = new Set(destinosApagados);
  // Una cuenta donde este clip ya está por salir no se vuelve a marcar: si no,
  // reintentar después de un fallo parcial lo programaba dos veces.
  const yaVa = new Set(
    publicaciones.filter((p) => PENDIENTES.includes(p.estado)).map((p) => `${p.red}:${p.cuentaId}`),
  );
  // Lo que ya salió en esa cuenta tampoco: publicarlo otra vez se elige a propósito.
  const yaSalioEn = (d: Destino) => salidaEn(d, publicaciones);
  const marcadoDeEntrada = (d: Destino) =>
    !d.motivo && !apagados.has(d.cuentaId) && !yaVa.has(`${d.red}:${d.cuentaId}`) && !yaSalioEn(d);
  const elegidos = new Set(
    destinos.filter((d) => !d.motivo && (cambios.get(d.clave) ?? marcadoDeEntrada(d))).map((d) => d.clave),
  );
  // Null = los de la marca tal cual; al tocar uno, quedan los de este clip.
  const [hashtagsClip, setHashtagsClip] = useState<string[] | null>(null);
  const hashtags = hashtagsClip ?? hashtagsMarca;
  // Arranca con el título del clip (nunca con el gancho): se revisa y se programa.
  const [descripcion, setDescripcion] = useState(clip.titulo);
  const [tituloYoutube, setTituloYoutube] = useState(clip.titulo.slice(0, TITULO_YOUTUBE_MAX));
  const [fecha, setFecha] = useState(() => aInputLocal(sugerida()));
  /** El segundo del MP4 final que va de portada; null = la automática de cada red. */
  const [portadaSeg, setPortadaSeg] = useState<number | null>(null);
  const [programar] = useMutation(PROGRAMAR_PUBLICACION);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  const elegidosEnOrden = destinos.filter((d) => elegidos.has(d.clave));
  // Un Reel de Facebook dura hasta 90 s: un clip más largo sale en Facebook con
  // su versión corta, y hasta que esté lista Facebook espera. Las otras redes no.
  // Lo que dura el MP4, sin los cortes y con la velocidad: sobre eso se elige la versión para Facebook.
  const duracionClip: number = clip.duracionFinalSeg ?? clip.duracionEfectivaSeg ?? clip.hastaSeg - clip.desdeSeg;
  const necesitaVersion = duracionClip > REEL_FACEBOOK_MAX_SEG;
  const conFacebook = elegidosEnOrden.some((d) => d.red === "FACEBOOK");
  const facebookEspera = necesitaVersion && clip.versionFacebook?.estadoRender !== "LISTO";
  const esperaVersion = (d: Destino) => d.red === "FACEBOOK" && facebookEspera;
  const aProgramar = elegidosEnOrden.filter((d) => !esperaVersion(d));
  const conYoutube = destinos.some((d) => d.red === "YOUTUBE" && elegidos.has(d.clave));
  const conVideo = clip.estadoRender === "LISTO" && Boolean(clip.urlVideo);
  const editadoSinProcesar =
    clip.editadoEn &&
    clip.renderizadoEn &&
    new Date(clip.editadoEn).getTime() > new Date(clip.renderizadoEn).getTime() + 1000;
  // Programar espera el MP4 de la última edición: con él se elige la portada y
  // se sabe que lo que sale es lo que se ve. Si falta o quedó viejo, se exporta solo.
  const videoListo = conVideo && !editadoSinProcesar;
  const exportando = clip.estadoRender === "EN_COLA" || clip.estadoRender === "RENDERIZANDO";
  const [renderizar] = useMutation(RENDERIZAR_CLIP_EPISODIO);
  const [pidiendoVideo, setPidiendoVideo] = useState(false);
  const [errorVideo, setErrorVideo] = useState<string | null>(null);
  const pidioVideo = useRef(false);
  async function pedirVideo() {
    setPidiendoVideo(true);
    setErrorVideo(null);
    try {
      await renderizar({ variables: { id: clip._id, marcaId } });
    } catch (e) {
      setErrorVideo(e instanceof Error ? e.message : t("noSePudo"));
    } finally {
      setPidiendoVideo(false);
    }
  }
  // Una vez al entrar; si falla, se reintenta con el botón.
  useEffect(() => {
    if (!opera || videoListo || exportando || clip.estadoRender === "FALLIDO" || pidioVideo.current) return;
    pidioVideo.current = true;
    void pedirVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opera, videoListo, exportando, clip.estadoRender]);
  const esperandoVideo = !videoListo;
  // La portada es un cuadro del MP4 final: solo se elige si el que hay ya es ese.
  const portadaElegible = videoListo ? clip.urlVideo ?? null : null;
  const cuando = fecha ? new Date(fecha) : null;
  const yaPaso = !cuando || Number.isNaN(cuando.getTime()) || cuando.getTime() < Date.now() + MARGEN_MS;

  // A quién se etiqueta: los invitados del episodio salen marcados; el resto
  // (elenco, Global, sugeridas por lo que se dice) se suma con un toque o
  // mencionándolo con @ en la descripción. Se guarda solo lo que se cambia.
  const { personas: deLaMarca } = usePersonas(marcaId);
  const { invitados } = useInvitados(marcaId, episodioId);
  const { sugeridas } = useSugeridas(marcaId, clip._id);
  const accionesPersonas = useAccionesPersonas(marcaId);
  const [creadas, setCreadas] = useState<Persona[]>([]);
  const [cambiosEtiquetas, setCambiosEtiquetas] = useState<Map<string, boolean>>(() => new Map());
  // Editando lo programado, la base es a quién se etiquetó al programar (no
  // los invitados del episodio): quien se quitó no vuelve a salir marcado.
  const [etiquetasGuardadas, setEtiquetasGuardadas] = useState<Set<string> | null>(null);
  const [colaboradoresIg, setColaboradoresIg] = useState<Set<string>>(() => new Set());
  const [colaboradoresFb, setColaboradoresFb] = useState<Set<string>>(() => new Set());
  const idsInvitados = new Set(invitados.map((p) => p._id));
  const todasLasPersonas = sinRepetir(invitados, deLaMarca, sugeridas.map((x) => x.persona), creadas);
  const enTexto = mencionadas(descripcion, todasLasPersonas);
  const idsEnTexto = new Set(enTexto.map((p) => p._id));
  const etiquetadas = todasLasPersonas.filter((p) => idsEnTexto.has(p._id) || (cambiosEtiquetas.get(p._id) ?? (etiquetasGuardadas ?? idsInvitados).has(p._id)));
  const idsEtiquetadas = new Set(etiquetadas.map((p) => p._id));
  const soloEtiquetadas = (c: Set<string>) => new Set([...c].filter((id) => idsEtiquetadas.has(id)));
  const alternarEn = (set: typeof setColaboradoresIg) => (id: string) =>
    set((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const descripcionFinal = conHashtags(descripcion, hashtags);
  // El texto de cada red: cada @Nombre pasa a su usuario en esa red, y donde
  // no hay etiquetas de verdad van las @menciones de quien no se nombró.
  const textoDe = (red: Red) => textoParaRed(descripcionFinal, red, enTexto, etiquetadas);
  const comoSale = comoSaleEnCadaRed(elegidosEnOrden, descripcionFinal, tituloYoutube.trim() || clip.titulo, textoDe);
  const descripcionLarga = descripcionFinal.length > DESCRIPCION_MAX || comoSale.some((c) => c.texto.length > DESCRIPCION_MAX);
  const sePasan = comoSale.filter((c) => c.largo);

  // ---- Editar lo que ya está programado ----
  // Con publicaciones pendientes la pantalla abre en modo editar: lo marcado,
  // la fecha, el texto y las etiquetas salen de lo programado, y el botón
  // guarda los cambios (edita, mueve, suma o cancela) en vez de programar de nuevo.
  const programadas = publicaciones.filter((p) => PENDIENTES.includes(p.estado));
  // "Editar y reintentar" (desde la fila que falló o con ?reintentar= desde el
  // calendario): la pantalla se enfoca en esa publicación sola. Se corrige lo
  // que haga falta y se vuelve a mandar la misma, sin programar otra.
  const paramReintentar = useSearchParams().get("reintentar");
  const [reintentandoId, setReintentandoId] = useState<string | null>(paramReintentar);
  const reintentando = publicaciones.find((p) => p._id === reintentandoId && p.estado === "FALLIDA") ?? null;
  const modoReintento = Boolean(reintentando);
  const pendientes = reintentando ? [reintentando] : programadas;
  const modoEditar = pendientes.length > 0;
  const pendienteDe = (d: Destino) => pendientes.find((p) => p.red === d.red && p.cuentaId === d.cuentaId);
  const horasPendientes = [...new Set(pendientes.map((p) => Math.round(new Date(p.publicarEn).getTime() / 60_000)))];
  const horasDistintas = horasPendientes.length > 1;
  const inicializado = useRef(false);
  const fechaInicial = useRef<string | null>(null);
  // Al entrar o salir de un reintento se vuelve a leer lo que corresponde.
  const objetivoClave = pendientes.map((p) => p._id).join(",");
  const objetivoAnterior = useRef(objetivoClave);
  if (objetivoAnterior.current !== objetivoClave) {
    objetivoAnterior.current = objetivoClave;
    inicializado.current = false;
  }
  // Cuando lo que se editaba sale (o se reintentó y salió), la pantalla deja
  // el modo editar: lo marcado vuelve a lo de entrada, que ya no incluye las
  // cuentas donde salió. Si no, el botón quedaba listo para publicar otra vez.
  const habiaObjetivo = useRef(objetivoClave !== "");
  useEffect(() => {
    if (objetivoClave === "" && habiaObjetivo.current) {
      setCambios(new Map());
      setCambiosEtiquetas(new Map());
      setEtiquetasGuardadas(null);
    }
    habiaObjetivo.current = objetivoClave !== "";
  }, [objetivoClave]);
  const colaboradoresIniciados = useRef(false);
  const [editarPub] = useMutation(EDITAR_PUBLICACION);
  const [reprogramar] = useMutation(REPROGRAMAR_PUBLICACION);
  const [cancelarPub] = useMutation(CANCELAR_PUBLICACION);
  const [reintentarPub] = useMutation(REINTENTAR_PUBLICACION);
  useEffect(() => {
    if (inicializado.current || !pendientes.length || !destinos.length) return;
    inicializado.current = true;
    colaboradoresIniciados.current = false;
    setCambios(new Map(destinos.map((d) => [d.clave, Boolean(pendienteDe(d))])));
    const conTexto = pendientes.find((p) => p.textoBase) ?? pendientes.find((p) => p.red === "INSTAGRAM") ?? pendientes[0];
    // El texto guardado ya trae los hashtags: no se vuelven a sumar.
    setDescripcion(conTexto.textoBase ?? conTexto.descripcion ?? clip.titulo);
    setHashtagsClip([]);
    // Lo que se reintenta sale apenas pueda (se puede elegir otra hora).
    const primera = modoReintento ? Date.now() + 2 * MARGEN_MS : Math.min(...pendientes.map((p) => new Date(p.publicarEn).getTime()));
    const inicial = aInputLocal(new Date(primera));
    fechaInicial.current = inicial;
    setFecha(inicial);
    const yt = pendientes.find((p) => p.red === "YOUTUBE");
    const titulo = (yt?.ajustes as { titulo?: string } | null | undefined)?.titulo;
    if (titulo) setTituloYoutube(titulo);
    const conPortada = pendientes.find((p) => p.portadaSeg != null);
    if (conPortada?.portadaSeg != null) setPortadaSeg(conPortada.portadaSeg);
    setEtiquetasGuardadas(new Set(pendientes.flatMap((p) => p.personaIds ?? [])));
    setCambiosEtiquetas(new Map());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objetivoClave, destinos.length]);
  // Los colaboradores se guardaron como usuario (Instagram) o id de página
  // (Facebook): se vuelven personas cuando la lista de personas ya llegó.
  useEffect(() => {
    if (colaboradoresIniciados.current || !inicializado.current || !todasLasPersonas.length) return;
    colaboradoresIniciados.current = true;
    const colabs = (red: string) =>
      ((pendientes.find((p) => p.red === red)?.ajustes as { colaboradores?: string[] } | null | undefined)?.colaboradores ?? []);
    const ig = colabs("INSTAGRAM");
    const fb = colabs("FACEBOOK");
    if (ig.length) setColaboradoresIg(new Set(todasLasPersonas.filter((p) => p.instagram && ig.includes(p.instagram)).map((p) => p._id)));
    if (fb.length) setColaboradoresFb(new Set(todasLasPersonas.filter((p) => p.facebookPaginaId && fb.includes(p.facebookPaginaId)).map((p) => p._id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todasLasPersonas.length, inicializado.current, objetivoClave]);

  // ---- Lo que se llenó queda en el navegador ----
  // Se guarda recién cuando la persona toca algo (`tocado`, desde el
  // contenedor del formulario): lo que llega del servidor no se pisa con un
  // borrador que nadie escribió. Se recupera después de leer lo programado.
  const tocado = useRef(false);
  const restaurado = useRef<string | null>(null);
  const [recuperado, setRecuperado] = useState(false);
  const borrador: BorradorProgramar = {
    descripcion,
    hashtagsClip,
    tituloYoutube,
    fecha,
    portadaSeg,
    cambios: [...cambios],
    cambiosEtiquetas: [...cambiosEtiquetas],
    colaboradoresIg: [...colaboradoresIg],
    colaboradoresFb: [...colaboradoresFb],
  };
  const borradorJson = JSON.stringify(borrador);
  useEffect(() => {
    if (restaurado.current === objetivoClave) return;
    if (modoEditar && !inicializado.current) return;
    restaurado.current = objetivoClave;
    tocado.current = false;
    const b = leerBorradorProgramar(clip._id, objetivoClave);
    setRecuperado(Boolean(b));
    if (!b) return;
    tocado.current = true;
    setDescripcion(b.descripcion);
    setHashtagsClip(b.hashtagsClip);
    setTituloYoutube(b.tituloYoutube);
    // Una hora que ya pasó no se recupera: queda la sugerida.
    const f = new Date(b.fecha);
    if (b.fecha && !Number.isNaN(f.getTime()) && f.getTime() > Date.now() + MARGEN_MS) setFecha(b.fecha);
    setPortadaSeg(b.portadaSeg);
    setCambios(new Map(b.cambios));
    setCambiosEtiquetas(new Map(b.cambiosEtiquetas));
    setColaboradoresIg(new Set(b.colaboradoresIg));
    setColaboradoresFb(new Set(b.colaboradoresFb));
    // Ya restaurados, los colaboradores no se vuelven a leer de lo programado.
    colaboradoresIniciados.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objetivoClave, inicializado.current, destinos.length]);
  useEffect(() => {
    if (!tocado.current || restaurado.current !== objetivoClave) return;
    guardarBorradorProgramar(clip._id, objetivoClave, JSON.parse(borradorJson) as BorradorProgramar);
  }, [borradorJson, objetivoClave, clip._id]);
  function olvidarBorrador() {
    tocado.current = false;
    setRecuperado(false);
    borrarBorradorProgramar(clip._id, objetivoClave);
  }
  const marcarTocado = () => {
    tocado.current = true;
  };
  const fechaTocada = modoEditar && fecha !== fechaInicial.current;
  // Lo que se cancela al guardar: lo programado en una red que se desmarcó.
  const aCancelar = modoReintento
    ? []
    : pendientes.filter(
        (p) => p.estado === "PROGRAMADA" && destinos.some((d) => d.red === p.red && d.cuentaId === p.cuentaId && !elegidos.has(d.clave)),
      );
  const resumenProgramado = pendientes
    .map((p) => REDES[p.red as Red]?.nombre ?? p.red)
    .filter((x, i, a) => a.indexOf(x) === i)
    .join(", ");
  // Con la fecha sin tocar, lo que ya está programado no se mueve (pueden ser horas distintas).
  // Un reintento sin tocar la hora sale ya: la hora que se mostró al abrir
  // pudo quedar atrás mientras se corregían las etiquetas.
  const reintentoYa = modoReintento && !fechaTocada;
  const faltaFecha = modoReintento
    ? fechaTocada && yaPaso
    : modoEditar
      ? (fechaTocada || aProgramar.some((d) => !pendienteDe(d))) && yaPaso
      : yaPaso;
  // Lo que falló por las etiquetas: a quién se etiquetó o invitó, para revisarlo.
  const ajustesReintento = (reintentando?.ajustes ?? {}) as { etiquetados?: string[]; colaboradores?: string[] };
  const falloPorEtiquetas = Boolean(
    reintentando &&
      (reintentando.etiquetasDescartadas ||
        esRechazoDeEtiquetas(reintentando.error) ||
        /etiquet|colaborador/i.test(reintentando.error ?? "")),
  );
  const nombreRed = (red: string) => REDES[red as Red]?.nombre ?? red;

  /**
   * Cancelar todo lo programado del clip de un toque (también se puede por
   * fila o desmarcando). Solo lo PROGRAMADA: lo que se está subiendo o quedó
   * agendado en la red no se corta desde acá.
   */
  const cancelables = programadas.filter((p) => p.estado === "PROGRAMADA");
  const [cancelandoTodo, setCancelandoTodo] = useState(false);
  // Lo que se confirma en el modal: programar o guardar, cancelar todo, o eliminar.
  const [confirmando, setConfirmando] = useState<"enviar" | "cancelar" | "eliminar" | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cuentaDe = (p: { red: string; cuentaNombre?: string | null }) => [nombreRed(p.red), p.cuentaNombre].filter(Boolean).join(" · ");
  async function cancelarTodo() {
    setAviso(null);
    setCancelandoTodo(true);
    const fallas: string[] = [];
    for (const p of cancelables) {
      try {
        await cancelarPub({
          variables: { marcaId, id: p._id },
          refetchQueries: ["ClipsListosSinProgramar", "PublicacionesDeMarca", "ClipsDeEpisodio", "ClipEpisodio"],
        });
      } catch (e) {
        fallas.push(`${nombreRed(p.red)}: ${e instanceof Error ? e.message : t("noSePudo")}`);
      }
    }
    setCancelandoTodo(false);
    setConfirmando(null);
    olvidarBorrador();
    if (modoReintento) salirDelReintento();
    refrescar();
    setAviso(
      fallas.length
        ? { tono: "error", texto: t("editar.fallas", { detalle: fallas.join(" · ") }) }
        : { tono: "ok", texto: t("editar.canceladoTodo") },
    );
  }

  /**
   * Eliminar: borra el registro de lo que no salió (programado, fallido o
   * cancelado). Lo que ya salió en las redes no se toca (be#226).
   */
  const eliminables = publicaciones.filter((p) => ["PROGRAMADA", "FALLIDA", "CANCELADA"].includes(p.estado));
  const [eliminarPub] = useMutation(ELIMINAR_PUBLICACION);
  const [eliminando, setEliminando] = useState(false);
  async function eliminarTodo() {
    setAviso(null);
    setEliminando(true);
    const fallas: string[] = [];
    for (const p of eliminables) {
      try {
        await eliminarPub({
          variables: { marcaId, id: p._id },
          refetchQueries: ["ClipsListosSinProgramar", "PublicacionesDeMarca", "ClipsDeEpisodio", "ClipEpisodio"],
        });
      } catch (e) {
        fallas.push(`${nombreRed(p.red)}: ${e instanceof Error ? e.message : t("noSePudo")}`);
      }
    }
    setEliminando(false);
    setConfirmando(null);
    olvidarBorrador();
    if (modoReintento) salirDelReintento();
    refrescar();
    setAviso(
      fallas.length
        ? { tono: "error", texto: t("editar.fallas", { detalle: fallas.join(" · ") }) }
        : { tono: "ok", texto: t("menu.eliminado") },
    );
  }

  function salirDelReintento() {
    setReintentandoId(null);
    setAviso(null);
    if (paramReintentar) window.history.replaceState(null, "", window.location.pathname);
  }

  function empezarReintento(id: string) {
    setReintentandoId(id);
    setAviso(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function alternar(d: Destino) {
    if (d.motivo || !opera) return;
    // Reintentando, la pantalla es de esa publicación sola.
    if (modoReintento && !pendienteDe(d)) return;
    const on = elegidos.has(d.clave);
    const salio = !on && !pendienteDe(d) ? yaSalioEn(d) : null;
    if (salio && !window.confirm(confirmacionDuplicado([d]))) return;
    setCambios((m) => new Map(m).set(d.clave, !on));
  }

  /** "Ya salió en Instagram el mar 13, 15:50. ¿Publicarlo otra vez?" para cada destino donde ya salió. */
  function confirmacionDuplicado(ds: Destino[]): string {
    const lineas = ds.map((d) => {
      const s = yaSalioEn(d)!;
      return t("duplicado.linea", {
        red: [nombreRed(d.red), d.nombre].filter(Boolean).join(" · "),
        cuando: diaYHora(new Date(s.publicadaEn ?? s.publicarEn), locale),
      });
    });
    return `${lineas.join("\n")}\n\n${t("duplicado.pregunta", { n: ds.length })}`;
  }

  /** Antes de crear publicaciones nuevas: si alguna ya salió en esa cuenta, se pregunta. */
  function confirmarSinDuplicados(nuevos: Destino[]): boolean {
    const repetidos = nuevos.filter((d) => yaSalioEn(d));
    return !repetidos.length || window.confirm(confirmacionDuplicado(repetidos));
  }

  /** Deja el día elegido y cambia la hora: los atajos de la app (12, 18, 20). */
  function aLas(hora: number) {
    const d = cuando && !Number.isNaN(cuando.getTime()) ? new Date(cuando) : sugerida();
    d.setHours(hora, 0, 0, 0);
    setFecha(aInputLocal(d));
  }

  async function enviar() {
    const aEnviar = aProgramar;
    if (!aEnviar.length) return;
    setAviso(null);
    if (!confirmarSinDuplicados(aEnviar)) return;
    if (!cuando || yaPaso) {
      setAviso({ tono: "error", texto: t("yaPasoLargo") });
      return;
    }
    if (descripcionLarga) {
      setAviso({ tono: "error", texto: t("descripcionLarga", { max: DESCRIPCION_MAX }) });
      return;
    }
    setEnviando(true);
    const fallas: string[] = [];
    // Instagram acepta hasta 20 etiquetas: las demás quedan afuera ahí (se avisa arriba).
    const instagramCompleto = ajustesInstagram(etiquetadas, soloEtiquetadas(colaboradoresIg));
    const instagram = instagramCompleto
      ? { ...instagramCompleto, etiquetados: instagramCompleto.etiquetados.slice(0, MAXIMO_ETIQUETADOS_INSTAGRAM) }
      : undefined;
    const facebook = ajustesFacebook(etiquetadas, soloEtiquetadas(colaboradoresFb));
    const personaIds = etiquetadas.map((p) => p._id);
    // Una por destino: si una red rechaza, las otras salen igual.
    for (const d of aEnviar) {
      try {
        await programar({
          variables: {
            input: {
              marcaId,
              red: d.red,
              cuentaId: d.cuentaId,
              clipId: clip._id,
              formato: d.formato,
              descripcion: textoDe(d.red) || undefined,
              ajustes:
                d.red === "YOUTUBE"
                  ? { titulo: tituloYoutube.trim() || clip.titulo }
                  : d.red === "INSTAGRAM"
                    ? instagram
                    : d.red === "FACEBOOK"
                      ? facebook
                      : undefined,
              textoBase: descripcionFinal || undefined,
              ...(personaIds.length ? { personaIds } : {}),
              ...(portadaSeg != null && portadaElegible ? { portadaSeg } : {}),
              publicarEn: cuando.toISOString(),
            },
          },
          // El clip sale de "Listos para programar" y su tarjeta pasa a "Programado".
          refetchQueries: ["ClipsListosSinProgramar", "PublicacionesDeMarca", "ClipsDeEpisodio", "ClipEpisodio"],
        });
        // Ya programada: se desmarca, así reintentar manda solo las que fallaron.
        setCambios((m) => new Map(m).set(d.clave, false));
      } catch (e) {
        fallas.push(`${REDES[d.red]?.nombre ?? d.red}: ${e instanceof Error ? e.message : t("noSePudo")}`);
      }
    }
    if (!fallas.length) olvidarBorrador();
    setEnviando(false);
    refrescar();
    if (fallas.length) {
      setAviso({
        tono: "error",
        texto: t(fallas.length === aEnviar.length ? "fallaTodas" : "fallaAlgunas", { detalle: fallas.join(" · ") }),
      });
    } else {
      setAviso({
        tono: "ok",
        texto: t("programado", { cuando: diaYHora(cuando, locale) }),
      });
    }
  }

  /**
   * Modo editar: cada red marcada que ya tenía algo programado se edita (y se
   * mueve si cambió la fecha), las nuevas se programan, y las desmarcadas se
   * cancelan después de confirmar. Una por una: si una falla, las otras siguen.
   */
  async function guardarCambios() {
    setAviso(null);
    if (faltaFecha) {
      setAviso({ tono: "error", texto: t("yaPasoLargo") });
      return;
    }
    if (descripcionLarga) {
      setAviso({ tono: "error", texto: t("descripcionLarga", { max: DESCRIPCION_MAX }) });
      return;
    }
    const nombre = (red: string) => REDES[red as Red]?.nombre ?? red;
    if (aCancelar.length && !window.confirm(t("editar.confirmarCancelar", { redes: aCancelar.map((p) => nombre(p.red)).join(", ") }))) return;
    if (!confirmarSinDuplicados(aProgramar.filter((d) => !pendienteDe(d)))) return;
    setEnviando(true);
    const fallas: string[] = [];
    const instagramCompleto = ajustesInstagram(etiquetadas, soloEtiquetadas(colaboradoresIg));
    const instagram = instagramCompleto
      ? { ...instagramCompleto, etiquetados: instagramCompleto.etiquetados.slice(0, MAXIMO_ETIQUETADOS_INSTAGRAM) }
      : { etiquetados: [], colaboradores: [] };
    const facebook = ajustesFacebook(etiquetadas, soloEtiquetadas(colaboradoresFb)) ?? { colaboradores: [] };
    const personaIds = etiquetadas.map((p) => p._id);
    const refetchQueries = ["ClipsListosSinProgramar", "PublicacionesDeMarca", "ClipsDeEpisodio", "ClipEpisodio"];
    for (const d of aProgramar) {
      const p = pendienteDe(d);
      try {
        if (!p) {
          if (!cuando) continue;
          await programar({
            variables: {
              input: {
                marcaId,
                red: d.red,
                cuentaId: d.cuentaId,
                clipId: clip._id,
                formato: d.formato,
                descripcion: textoDe(d.red) || undefined,
                ajustes:
                  d.red === "YOUTUBE"
                    ? { titulo: tituloYoutube.trim() || clip.titulo }
                    : d.red === "INSTAGRAM"
                      ? instagramCompleto ?? undefined
                      : d.red === "FACEBOOK"
                        ? ajustesFacebook(etiquetadas, soloEtiquetadas(colaboradoresFb))
                        : undefined,
                textoBase: descripcionFinal || undefined,
                ...(personaIds.length ? { personaIds } : {}),
                ...(portadaSeg != null && portadaElegible ? { portadaSeg } : {}),
                publicarEn: cuando.toISOString(),
              },
            },
            refetchQueries,
          });
          continue;
        }
        // Lo que ya sube o ya tiene la red no se toca desde acá (salvo lo que se reintenta).
        const esReintento = modoReintento && p._id === reintentando?._id;
        if (p.estado !== "PROGRAMADA" && !esReintento) continue;
        await editarPub({
          variables: {
            marcaId,
            id: p._id,
            descripcion: textoDe(d.red),
            textoBase: descripcionFinal,
            personaIds,
            etiquetas: d.red === "INSTAGRAM" ? instagram : d.red === "FACEBOOK" ? facebook : undefined,
            ...(d.red === "YOUTUBE" ? { tituloYoutube: tituloYoutube.trim() || clip.titulo } : {}),
            ...(portadaSeg != null && portadaElegible
              ? { portadaSeg }
              : portadaSeg == null && p.portadaSeg != null
                ? { quitarPortada: true }
                : {}),
          },
          refetchQueries,
        });
        if (esReintento) {
          await reintentarPub({ variables: { marcaId, id: p._id, publicarEn: reintentoYa ? undefined : cuando?.toISOString() }, refetchQueries });
          continue;
        }
        if (fechaTocada && cuando && Math.abs(new Date(p.publicarEn).getTime() - cuando.getTime()) >= 60_000) {
          await reprogramar({ variables: { marcaId, id: p._id, publicarEn: cuando.toISOString() }, refetchQueries });
        }
      } catch (e) {
        fallas.push(`${nombre(d.red)}: ${e instanceof Error ? e.message : t("noSePudo")}`);
      }
    }
    for (const p of aCancelar) {
      try {
        await cancelarPub({ variables: { marcaId, id: p._id }, refetchQueries });
      } catch (e) {
        fallas.push(`${nombre(p.red)}: ${e instanceof Error ? e.message : t("noSePudo")}`);
      }
    }
    if (!fallas.length) olvidarBorrador();
    setEnviando(false);
    // Lo nuevo se vuelve a leer de lo programado.
    inicializado.current = false;
    colaboradoresIniciados.current = false;
    refrescar();
    if (modoReintento && !fallas.length && reintentando) {
      const red = nombreRed(reintentando.red);
      salirDelReintento();
      setAviso({ tono: "ok", texto: t("reintentar.listo", { red }) });
      return;
    }
    setAviso(
      fallas.length
        ? { tono: "error", texto: t("editar.fallas", { detalle: fallas.join(" · ") }) }
        : { tono: "ok", texto: t("editar.guardado") },
    );
  }

  return (
    <div className="space-y-6">
      {modoReintento && opera && reintentando ? (
        <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] p-3 text-sm">
          <div className="flex items-start gap-3">
            <RotateCcw size={18} className="mt-0.5 shrink-0 text-red-300" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">
                {t("reintentar.titulo", { red: [nombreRed(reintentando.red), reintentando.cuentaNombre].filter(Boolean).join(" · ") })}
              </p>
              <p className="mt-0.5 text-white/60">{t("reintentar.ayuda")}</p>
              {reintentando.error ? <ErrorPublicacion error={reintentando.error} red={nombreRed(reintentando.red)} /> : null}
            </div>
            <button type="button" onClick={salirDelReintento} className="shrink-0 text-xs text-white/50 hover:text-white/80">
              {t("reintentar.salir")}
            </button>
          </div>
          {falloPorEtiquetas ? (
            <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.06] p-2.5 text-xs text-amber-100/90">
              <p className="font-medium">{t("reintentar.etiquetas.titulo")}</p>
              <p className="mt-0.5 text-amber-100/70">{t("reintentar.etiquetas.ayuda")}</p>
              {[
                ...(ajustesReintento.colaboradores ?? reintentando.etiquetasDescartadas?.colaboradores ?? []).map((u) => [u, true] as const),
                ...(ajustesReintento.etiquetados ?? reintentando.etiquetasDescartadas?.etiquetados ?? []).map((u) => [u, false] as const),
              ].length ? (
                <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  {[
                    ...(ajustesReintento.colaboradores ?? reintentando.etiquetasDescartadas?.colaboradores ?? []).map((u) => [u, true] as const),
                    ...(ajustesReintento.etiquetados ?? reintentando.etiquetasDescartadas?.etiquetados ?? []).map((u) => [u, false] as const),
                  ].map(([u, colab]) => (
                    <li key={`${u}-${colab}`}>
                      <a
                        href={reintentando.red === "FACEBOOK" ? `https://www.facebook.com/${/^\d+$/.test(u) ? `profile.php?id=${u}` : u}` : `https://www.instagram.com/${u}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ng-celeste hover:underline"
                      >
                        @{u} ↗
                      </a>
                      <span className="text-amber-100/50"> · {colab ? t("reintentar.etiquetas.colaborador") : t("reintentar.etiquetas.etiquetado")}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {colaboradoresIg.size || colaboradoresFb.size ? (
                <button
                  type="button"
                  onClick={() => {
                    setColaboradoresIg(new Set());
                    setColaboradoresFb(new Set());
                  }}
                  className="mt-2 rounded-md border border-amber-300/40 px-2 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-300/10"
                >
                  {t("reintentar.etiquetas.pasarATag")}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : modoEditar && opera ? (
        <div className="flex items-start gap-3 rounded-xl border border-marca/30 bg-marca/[0.06] p-3">
          <PencilLine size={18} className="mt-0.5 shrink-0 text-marca" aria-hidden />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-white">
              {horasDistintas
                ? t("editar.tituloHoras", { redes: resumenProgramado })
                : t("editar.titulo", { cuando: diaYHora(new Date(pendientes[0].publicarEn), locale), redes: resumenProgramado })}
            </p>
            <p className="mt-0.5 text-white/55">{t("editar.ayuda")}</p>
            {cancelables.length > 0 ? (
              <button
                type="button"
                onClick={() => setConfirmando("cancelar")}
                disabled={cancelandoTodo || enviando}
                className="mt-2 rounded-lg border border-red-400/40 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-400/10 disabled:opacity-50"
              >
                {cancelandoTodo ? t("editar.cancelandoTodo") : t("editar.cancelarTodo")}
              </button>
            ) : null}
            {horasDistintas ? (
              <ul className="mt-1.5 space-y-0.5 text-xs text-white/55">
                {pendientes.map((p) => (
                  <li key={p._id}>
                    {REDES[p.red as Red]?.nombre ?? p.red}
                    {p.cuentaNombre ? ` · ${p.cuentaNombre}` : ""}: {diaYHora(new Date(p.publicarEn), locale)}
                  </li>
                ))}
                <li className="text-white/40">{t("editar.horasAyuda")}</li>
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="flex items-center gap-4">
        <Poster url={clip.urlPoster} className="h-32 w-[72px]" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">{clip.titulo}</p>
          <p className="text-sm text-white/45">{t("duracionListo", { seg: Math.round(duracionClip) })}</p>
          {clip.calidad || clip.versionFacebook?.calidad ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {clip.calidad ? <IndicadorCalidad calidad={clip.calidad} medida /> : null}
              {clip.versionFacebook?.calidad && clip.versionFacebook.estadoRender === "LISTO" ? (
                <IndicadorCalidad calidad={clip.versionFacebook.calidad} medida etiqueta={tc("versionFacebook")} />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {esperandoVideo ? (
        clip.estadoRender === "FALLIDO" && !exportando && !pidiendoVideo ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] p-3 text-sm">
            <TriangleAlert size={18} className="shrink-0 text-red-300" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">{t("video.fallo")}</p>
              <p className="mt-0.5 text-white/60">{errorVideo ?? t("video.falloAyuda")}</p>
            </div>
            {opera ? (
              <button
                type="button"
                onClick={() => void pedirVideo()}
                className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/5"
              >
                {t("video.reintentar")}
              </button>
            ) : null}
          </div>
        ) : (
          <div role="status" className="flex items-start gap-3 rounded-xl border border-ng-azul/30 bg-ng-azul/[0.06] p-3 text-sm">
            <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-ng-azul" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">
                {clip.estadoRender === "RENDERIZANDO" && clip.progresoRender
                  ? t("video.preparandoProgreso", { n: Math.round(clip.progresoRender) })
                  : t("video.preparando")}
              </p>
              <p className="mt-0.5 text-white/60">{opera ? t("video.ayuda") : t("video.ayudaSoloMira")}</p>
              {errorVideo ? <p className="mt-1 text-xs text-red-400">{errorVideo}</p> : null}
            </div>
          </div>
        )
      ) : null}

      {opera && recuperado ? (
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-white/50">
          {t("borrador.recuperado")}
        </p>
      ) : null}

      {opera ? (
        <div className="space-y-6" onPointerDownCapture={marcarTocado} onKeyDownCapture={marcarTocado} onInputCapture={marcarTocado}>
          <Seccion titulo={t("secciones.donde")}>
            {destinos.length === 0 ? (
              <p className="text-sm text-white/60">
                {t.rich("sinRedes", {
                  link: (c) => (
                    <Link href="/admin/facebook" className="text-ng-celeste hover:underline">
                      {c}
                    </Link>
                  ),
                })}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {destinos.map((d) => {
                  const on = elegidos.has(d.clave);
                  const red = REDES[d.red]?.nombre ?? d.red;
                  return (
                    <button
                      key={d.clave}
                      type="button"
                      onClick={() => alternar(d)}
                      disabled={Boolean(d.motivo)}
                      aria-pressed={on}
                      title={
                        d.motivo
                          ? t(`motivos.${d.motivo}`)
                          : esperaVersion(d) && on
                            ? tv("faltaVersionCorto")
                            : `${red} · ${d.etiqueta}`
                      }
                      className={`flex max-w-full items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs transition ${
                        on
                          ? "border-white/15 bg-white/10 text-white"
                          : "border-white/10 text-white/45 hover:border-white/20 hover:text-white/70"
                      } ${d.motivo ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                      <IconoRed url={d.foto} red={d.red} chico />
                      <span className="truncate">
                        <span className={on ? "text-white/55" : ""}>{red}</span> {d.nombre}
                      </span>
                      {esperaVersion(d) && on ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" /> : null}
                      {!pendienteDe(d) && yaSalioEn(d) ? (
                        <span
                          className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 text-[10px] text-emerald-300"
                          title={t("duplicado.chipAyuda", {
                            cuando: diaYHora(new Date(yaSalioEn(d)!.publicadaEn ?? yaSalioEn(d)!.publicarEn), locale),
                          })}
                        >
                          {t("duplicado.chip")}
                        </span>
                      ) : null}
                      {on ? <span className="text-[10px] text-white/70">✓</span> : null}
                    </button>
                  );
                })}
                {tiktokPronto && (
                  <span
                    title={t("pronto")}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 py-0.5 pl-0.5 pr-2.5 text-xs text-white/30"
                  >
                    <IconoRed red="TIKTOK" chico />
                    TikTok · {t("pronto")}
                  </span>
                )}
              </div>
            )}
            {faltaInstagram ? (
              <p className="text-xs text-white/40">
                {t("faltaInstagram")}
              </p>
            ) : null}
            {destinos.length > 0 &&
              faltanUploadPost.map((r) => (
                <p key={r} className="text-xs text-white/40">
                  {t.rich("faltaRed", {
                    red: REDES[r]?.nombre ?? r,
                    link: (c) => (
                      <Link href="/admin/facebook" className="text-ng-celeste hover:underline">
                        {c}
                      </Link>
                    ),
                  })}
                </p>
              ))}
          </Seccion>

          <Seccion titulo={tEtq("publicar.titulo")}>
            <EtiquetarPublicacion
              sugeridas={sugeridas}
              personas={todasLasPersonas}
              etiquetadas={etiquetadas}
              enTexto={idsEnTexto}
              onAgregar={(p) => {
                if (!todasLasPersonas.some((x) => x._id === p._id)) setCreadas((c) => [...c, p]);
                setCambiosEtiquetas((m) => new Map(m).set(p._id, true));
              }}
              onQuitar={(p) => setCambiosEtiquetas((m) => new Map(m).set(p._id, false))}
              colaboradoresIg={soloEtiquetadas(colaboradoresIg)}
              onColaboradorIg={alternarEn(setColaboradoresIg)}
              conInstagram={elegidosEnOrden.some((d) => d.red === "INSTAGRAM")}
              colaboradoresFb={soloEtiquetadas(colaboradoresFb)}
              onColaboradorFb={alternarEn(setColaboradoresFb)}
              conFacebook={elegidosEnOrden.some((d) => d.red === "FACEBOOK")}
              guardando={accionesPersonas.guardando}
              marcaId={marcaId}
              onNuevoInvitado={async (d) => {
                // Queda como invitado del episodio (y en Global si lo marcó), ya etiquetado.
                const nueva = await accionesPersonas.crear(d, episodioId);
                if (nueva) {
                  setCreadas((c) => [...c, nueva]);
                  setCambiosEtiquetas((m) => new Map(m).set(nueva._id, true));
                }
              }}
            />
          </Seccion>

          <Seccion titulo={t("secciones.cuando")}>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="datetime-local"
                value={fecha}
                min={aInputLocal(new Date(Date.now() + MARGEN_MS))}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-ng-azul"
              />
              {[12, 18, 20].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => aLas(h)}
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    cuando && cuando.getHours() === h && cuando.getMinutes() === 0
                      ? "border-ng-azul bg-ng-azul/15 text-white"
                      : "border-white/15 text-white/60 hover:bg-white/5"
                  }`}
                >
                  {h}:00
                </button>
              ))}
            </div>
            <p className={`text-xs ${fecha && yaPaso ? "text-red-400" : "text-white/40"}`}>
              {!fecha
                ? t("elegiDiaHoraPunto")
                : yaPaso
                  ? t("yaPasoLargo")
                  : t("salePunto", { cuando: diaYHora(cuando!, locale) })}{" "}
              {t("horaDe", { zona: zonaHoraria(locale) })}
            </p>
          </Seccion>

          {conFacebook && necesitaVersion && conVideo && clip.urlVideo ? (
            <SeccionVersionFacebook
              clipId={clip._id}
              marcaId={marcaId}
              duracionClip={duracionClip}
              urlVideoClip={clip.urlVideo}
              version={clip.versionFacebook}
            />
          ) : null}

          <Seccion titulo={t("secciones.descripcion")}>
            <EditorMenciones
              valor={descripcion}
              onCambio={setDescripcion}
              personas={todasLasPersonas}
              onMencionar={(p) => setCambiosEtiquetas((m) => new Map(m).set(p._id, true))}
              placeholder={t("descripcionPlaceholder")}
              maxLength={DESCRIPCION_MAX}
            />
            <div className="space-y-1">
              <span className="block text-xs text-white/45">{t("hashtags")}</span>
              <HashtagsChips valor={hashtags} onChange={setHashtagsClip} />
              <p className={`text-xs ${descripcionLarga ? "text-red-400" : "text-white/40"}`}>
                {descripcionLarga
                  ? t("descripcionLarga", { max: DESCRIPCION_MAX })
                  : hashtags.length
                    ? t("hashtagsAlFinal")
                    : t("hashtagsVacio")}
              </p>
            </div>
            <ComoSaleEnCadaRed comoSale={comoSale} />
            {conYoutube && (
              <label className="block">
                <span className="mb-1 block text-xs text-white/45">{t("tituloYoutube")}</span>
                <span className="mb-1 block text-[11px] text-white/35">{t("tituloYoutubeAyuda")}</span>
                <input
                  value={tituloYoutube}
                  onChange={(e) => setTituloYoutube(e.target.value)}
                  placeholder={t("tituloYoutube")}
                  maxLength={TITULO_YOUTUBE_MAX}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-ng-azul"
                />
              </label>
            )}
          </Seccion>

          <Seccion titulo={t("portada.titulo")}>
            {portadaElegible ? (
              <ElegirPortadaClip url={portadaElegible} duracion={duracionClip} valor={portadaSeg} onCambiar={setPortadaSeg} />
            ) : (
              <p className="flex items-center gap-2 text-xs text-white/45">
                {exportando || pidiendoVideo ? <Loader2 size={14} className="shrink-0 animate-spin" aria-hidden /> : null}
                {t("portadaSinVideo")}
              </p>
            )}
          </Seccion>

          {/* Lo que se va a programar y el botón, fijos abajo como en un
              checkout: se arma de arriba hacia abajo (dónde, cuándo, qué
              dice) y el botón queda a mano sin volver a subir. */}
          <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 space-y-2 lg:bottom-4">
            {aviso && (
              <p
                className={`rounded-lg border p-3 text-sm ${
                  aviso.tono === "ok"
                    ? "border-ng-teal/30 bg-ng-teal/[0.06] text-ng-teal"
                    : "border-red-500/30 bg-red-500/[0.06] text-red-400"
                }`}
              >
                {aviso.texto}
                {aviso.tono === "ok" && (
                  <Link href="/calendario" className="ml-2 underline underline-offset-2">
                    {t("irAlCalendario")}
                  </Link>
                )}
              </p>
            )}
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-ng-fondo/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {portadaSeg != null && portadaElegible ? (
                  <CuadroPortada url={portadaElegible} seg={portadaSeg} className="h-12 w-[27px]" titulo={t("portada.elegida")} />
                ) : null}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className={`text-sm font-medium ${fecha && faltaFecha ? "text-red-400" : "text-white"}`}>
                    {!fecha
                      ? t("elegiDiaHora")
                      : modoEditar && !modoReintento && horasDistintas && !fechaTocada
                        ? t("editar.horasPorRed")
                        : reintentoYa
                          ? t("reintentar.saleYa")
                          : faltaFecha
                          ? t("yaPaso")
                          : t("sale", { cuando: diaYHora(cuando!, locale) })}
                    {elegidosEnOrden.length ? <span className="font-normal text-white/50">{` · ${t("nRedes", { n: elegidosEnOrden.length })}`}</span> : null}
                  </p>
                  {elegidosEnOrden.length === 0 && !aCancelar.length ? <p className="text-xs text-amber-300">{t("marcaUnaRed")}</p> : null}
                  {modoEditar && aCancelar.length ? (
                    <p className="text-xs text-amber-300">
                      {t("editar.seCancela", { redes: aCancelar.map((p) => REDES[p.red as Red]?.nombre ?? p.red).join(", ") })}
                    </p>
                  ) : null}
                  {conFacebook && facebookEspera ? (
                    <p className="text-xs text-amber-300">{aProgramar.length ? tv("faltaVersion") : tv("soloFacebook")}</p>
                  ) : null}
                  {esperandoVideo ? <p className="text-xs text-ng-azul">{t("video.botonAyuda")}</p> : null}
                  {revision.activa ? (
                    <p className={`text-xs ${revision.soyRevisor ? "text-white/45" : "text-amber-300"}`}>
                      {revision.soyRevisor ? tr("avisoRevisor") : tr("aviso")}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex w-full items-stretch gap-2 sm:w-auto sm:shrink-0">
              <button
                type="button"
                onClick={() => setConfirmando("enviar")}
                disabled={enviando || esperandoVideo || (modoEditar ? aProgramar.length === 0 && aCancelar.length === 0 : aProgramar.length === 0) || faltaFecha || descripcionLarga}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-marca px-5 py-3 text-sm font-bold text-ng-tinta transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
              >
                {enviando || esperandoVideo ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                ) : modoReintento ? (
                  <RotateCcw size={16} aria-hidden />
                ) : (
                  <CalendarClock size={16} aria-hidden />
                )}
                {esperandoVideo && !enviando
                  ? t("video.boton")
                  : enviando
                  ? modoReintento
                    ? t("reintentar.enviando")
                    : modoEditar
                      ? t("editar.guardando")
                      : t("programando")
                  : modoReintento && reintentando
                    ? t("reintentar.boton", { red: nombreRed(reintentando.red) })
                    : modoEditar
                      ? t("editar.guardar")
                    : aProgramar.length > 1
                      ? t("programarEnN", { n: aProgramar.length })
                      : t("programar")}
              </button>
              {cancelables.length > 0 || eliminables.length > 0 ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuAbierto((v) => !v)}
                    disabled={enviando || cancelandoTodo || eliminando}
                    aria-label={t("menu.abrir")}
                    aria-haspopup="menu"
                    aria-expanded={menuAbierto}
                    className="flex h-full items-center rounded-xl border border-white/15 px-3 text-white/70 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
                  >
                    <MoreHorizontal size={18} aria-hidden />
                  </button>
                  {menuAbierto ? (
                    <>
                      <button type="button" aria-hidden tabIndex={-1} className="fixed inset-0 z-40 cursor-default" onClick={() => setMenuAbierto(false)} />
                      <div role="menu" className="absolute bottom-full right-0 z-50 mb-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-ng-superficie py-1 shadow-xl">
                        {cancelables.length > 0 ? (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuAbierto(false);
                              setConfirmando("cancelar");
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/85 hover:bg-white/5"
                          >
                            <XCircle size={15} aria-hidden /> {t("menu.cancelar")}
                          </button>
                        ) : null}
                        {eliminables.length > 0 ? (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuAbierto(false);
                              setConfirmando("eliminar");
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 size={15} aria-hidden /> {t("menu.eliminar")}
                          </button>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
              </div>
            </div>
            {confirmando === "enviar" ? (
              <ModalConfirmar
                titulo={t("confirmar.titulo")}
                textoVolver={t("confirmar.volver")}
                textoConfirmar={modoReintento ? t("confirmar.siReintentar") : modoEditar ? t("confirmar.siGuardar") : t("confirmar.siProgramar")}
                onCerrar={() => setConfirmando(null)}
                onConfirmar={() => {
                  setConfirmando(null);
                  void (modoEditar ? guardarCambios() : enviar());
                }}
              >
                <p className="text-lg font-semibold text-white">
                  {reintentoYa
                    ? t("reintentar.saleYa")
                    : modoEditar && !modoReintento && horasDistintas && !fechaTocada
                      ? t("editar.horasPorRed")
                      : cuando
                        ? diaYHora(cuando, locale)
                        : ""}
                </p>
                {!reintentoYa && !(modoEditar && !modoReintento && horasDistintas && !fechaTocada) ? (
                  <p className="text-xs text-white/45">{t("horaDe", { zona: zonaHoraria(locale) })}</p>
                ) : null}
                {aProgramar.length ? (
                  <div>
                    <p className="text-xs text-white/45">{t("confirmar.salenEn")}</p>
                    <ul className="mt-1 space-y-0.5">
                      {aProgramar.map((d) => (
                        <li key={d.clave}>{[nombreRed(d.red), d.nombre].filter(Boolean).join(" · ")}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {modoEditar && aCancelar.length ? (
                  <p className="text-amber-300">{t("editar.seCancela", { redes: aCancelar.map(cuentaDe).join(", ") })}</p>
                ) : null}
              </ModalConfirmar>
            ) : null}
            {confirmando === "cancelar" ? (
              <ModalConfirmar
                titulo={t("menu.cancelarTitulo")}
                textoVolver={t("confirmar.volver")}
                textoConfirmar={cancelandoTodo ? t("editar.cancelandoTodo") : t("menu.cancelarSi")}
                cargando={cancelandoTodo}
                peligro
                onCerrar={() => setConfirmando(null)}
                onConfirmar={() => void cancelarTodo()}
              >
                <ul className="space-y-0.5">
                  {cancelables.map((p) => (
                    <li key={p._id}>
                      {cuentaDe(p)}: {diaYHora(new Date(p.publicarEn), locale)}
                    </li>
                  ))}
                </ul>
                <p className="text-white/55">{t("menu.cancelarDetalle")}</p>
              </ModalConfirmar>
            ) : null}
            {confirmando === "eliminar" ? (
              <ModalConfirmar
                titulo={t("menu.eliminarTitulo")}
                textoVolver={t("confirmar.volver")}
                textoConfirmar={eliminando ? t("menu.eliminando") : t("menu.eliminarSi")}
                cargando={eliminando}
                peligro
                onCerrar={() => setConfirmando(null)}
                onConfirmar={() => void eliminarTodo()}
              >
                <ul className="space-y-0.5">
                  {eliminables.map((p) => (
                    <li key={p._id}>
                      {cuentaDe(p)}: {t(`estados.${p.estado}`)}
                    </li>
                  ))}
                </ul>
                <p className="text-red-300">{t("menu.eliminarDetalle")}</p>
              </ModalConfirmar>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/50">
          {t("soloMira")}
        </p>
      )}

      {publicaciones.length > 0 && (
        <Seccion titulo={t("secciones.publicaciones")}>
          {ordenarPorDestino(publicaciones).map((p) => (
            <FilaPublicacionClip
              key={p._id}
              p={p}
              reemplazada={fallaReemplazada(p, publicaciones)}
              marcaId={marcaId}
              opera={opera}
              estadoRevision={clip.estadoRevision}
              onCambio={refrescar}
              reintentando={p._id === reintentando?._id}
              onEditarYReintentar={() => empezarReintento(p._id)}
            />
          ))}
        </Seccion>
      )}
    </div>
  );
}

function FilaPublicacionClip({
  p,
  marcaId,
  opera,
  estadoRevision,
  onCambio,
  reintentando,
  onEditarYReintentar,
  reemplazada,
}: {
  p: Publicacion;
  /** Falló, pero en esa cuenta salió otra: es un intento anterior, no hay nada que reintentar. */
  reemplazada: boolean;
  marcaId: string;
  opera: boolean;
  estadoRevision?: EstadoRevision | null;
  onCambio: () => void;
  /** Es la que se está reintentando arriba. */
  reintentando: boolean;
  onEditarYReintentar: () => void;
}) {
  const t = useTranslations("publicarClip");
  const locale = useLocale();
  const refetchQueries = ["ClipsListosSinProgramar", "PublicacionesDeMarca", "ClipsDeEpisodio", "ClipEpisodio"];
  const [cancelar, { loading }] = useMutation(CANCELAR_PUBLICACION, { refetchQueries });
  const [reintentar, { loading: reintentandoAhora }] = useMutation(REINTENTAR_PUBLICACION, { refetchQueries });
  const fallo = p.estado === "FALLIDA";
  const red = REDES[p.red]?.nombre ?? p.red;

  /** La misma publicación otra vez, sin cambios. `forzar`: aunque quizás haya salido. */
  async function reintentarla(forzar = false) {
    if (forzar && !window.confirm(t("reintentar.confirmarForzar", { red }))) return;
    setError(null);
    try {
      await reintentar({ variables: { marcaId, id: p._id, ...(forzar ? { forzar: true } : {}) } });
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("noSePudo"));
    }
  }
  const [error, setError] = useState<string | null>(null);
  const e = ESTADOS_PUBLICACION[p.estado]
    ? { texto: t(`estados.${p.estado}`), clase: ESTADOS_PUBLICACION[p.estado].clase }
    : { texto: p.estado, clase: "bg-white/10 text-white/60" };
  const fecha = p.publicadaEn ?? p.publicarEn;

  async function cancelarla() {
    if (!window.confirm(t("confirmarCancelar", { red: REDES[p.red]?.nombre ?? p.red }))) return;
    setError(null);
    try {
      await cancelar({ variables: { marcaId, id: p._id } });
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorCancelar"));
    }
  }

  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.03] p-3 ${p.estado === "CANCELADA" || reemplazada ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-2">
        <IconoRed red={p.red} chico />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {REDES[p.red]?.nombre ?? p.red}
          {p.cuentaNombre ? ` · ${p.cuentaNombre}` : ""}
        </p>
        <EtiquetaProveedor proveedor={p.proveedor} />
        {p.esperaVideo && p.estado === "PROGRAMADA" ? (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">{t("esperaVideo")}</span>
        ) : null}
        <EtiquetaRevision etiqueta={etiquetaRevision([p], estadoRevision, Date.now())} />
        {reemplazada ? (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">{t("reemplazada.chip")}</span>
        ) : (
          <span className={`rounded-full px-2 py-0.5 text-[11px] ${e.clase}`}>{e.texto}</span>
        )}
      </div>
      {fecha ? (
        <p className="mt-1 text-xs text-white/45">
          {p.estado === "PUBLICADA"
            ? t("fila.salio", { cuando: diaYHora(new Date(fecha), locale) })
            : p.estado === "PROGRAMADA"
              ? t("fila.sale", { cuando: diaYHora(new Date(fecha), locale) })
              : diaYHora(new Date(fecha), locale)}
          {p.creadoPor?.nombre ? t("fila.por", { nombre: p.creadoPor.nombre }) : ""}
        </p>
      ) : null}
      {reemplazada ? <p className="mt-1 text-xs text-white/55">{t("reemplazada.texto", { red })}</p> : null}
      {p.error ? <ErrorPublicacion error={p.error} red={red} apagado={reemplazada} /> : null}
      {p.aviso ? (
        <p className="mt-1 flex items-start gap-1.5 break-words text-xs text-amber-300">
          <TriangleAlert size={13} className="mt-px shrink-0" aria-hidden />
          {p.aviso}
        </p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
      {opera && fallo && !reintentando && !reemplazada ? (
        p.quizasPublicada ? (
          <div className="mt-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] p-2 text-xs text-amber-100/90">
            <p>{t("reintentar.quizas", { red })}</p>
            <div className="mt-1.5 flex flex-wrap gap-3">
              {p.permalink ? (
                <a href={p.permalink} target="_blank" rel="noreferrer" className="text-ng-celeste hover:underline">
                  {t("reintentar.verCuenta")}
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => void reintentarla(true)}
                disabled={reintentandoAhora}
                className="font-medium text-amber-200 hover:underline disabled:opacity-50"
              >
                {reintentandoAhora ? t("reintentar.enviando") : t("reintentar.igual")}
              </button>
            </div>
          </div>
        ) : p.puedeReintentar ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onEditarYReintentar}
              className="flex items-center gap-1.5 rounded-lg bg-marca px-3 py-1.5 text-xs font-semibold text-ng-tinta hover:brightness-105"
            >
              <RotateCcw size={13} aria-hidden />
              {t("reintentar.editar")}
            </button>
            <button
              type="button"
              onClick={() => void reintentarla()}
              disabled={reintentandoAhora}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/75 hover:bg-white/5 disabled:opacity-50"
            >
              {reintentandoAhora ? t("reintentar.enviando") : t("reintentar.sinCambios")}
            </button>
          </div>
        ) : null
      ) : null}
      {reintentando ? <p className="mt-1 text-xs text-white/45">{t("reintentar.arriba")}</p> : null}
      {(p.permalink || (opera && p.estado === "PROGRAMADA")) && (
        <div className="mt-2 flex gap-4 text-xs">
          {p.permalink ? (
            <a href={p.permalink} target="_blank" rel="noreferrer" className="text-ng-celeste hover:underline">
              {t("fila.verPublicacion")}
            </a>
          ) : null}
          {opera && p.estado === "PROGRAMADA" ? (
            <button onClick={() => void cancelarla()} disabled={loading} className="text-red-400/80 hover:text-red-400 disabled:opacity-50">
              {loading ? t("fila.cancelando") : t("fila.cancelar")}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * El error de una publicación. El de Upload-Post cuando Instagram rechaza una
 * etiqueta es un párrafo largo en inglés: se resume y el texto original queda
 * en "Ver detalle". Los demás se muestran tal cual.
 */
function ErrorPublicacion({ error, red, apagado = false }: { error: string; red: string; apagado?: boolean }) {
  const t = useTranslations("publicarClip");
  const [abierto, setAbierto] = useState(false);
  const resumir = apagado || esRechazoDeEtiquetas(error);
  const color = apagado ? "text-white/45" : "text-red-400";
  if (!resumir) return <p className={`mt-1 break-words text-xs ${color}`}>{error}</p>;
  return (
    <div className={`mt-1 text-xs ${color}`}>
      {esRechazoDeEtiquetas(error) ? <p>{t("errorEtiquetas", { red })}</p> : null}
      <button type="button" onClick={() => setAbierto((v) => !v)} className="mt-0.5 text-white/45 underline-offset-2 hover:underline">
        {abierto ? t("ocultarDetalle") : t("verDetalle")}
      </button>
      {abierto ? <p className="mt-1 break-words text-white/40">{error}</p> : null}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-white/45">{titulo}</h2>
      {children}
    </section>
  );
}

function Vacio({ titulo, detalle, children }: { titulo: string; detalle: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
      <p className="font-medium text-white/70">{titulo}</p>
      <p className="mt-1 text-sm text-white/40">{detalle}</p>
      {children}
    </div>
  );
}

/** En dos horas, o mañana a las 12 si ya es tarde: un punto de partida razonable. */
function sugerida(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  if (d.getHours() < 17) d.setHours(d.getHours() + 2);
  else {
    d.setDate(d.getDate() + 1);
    d.setHours(12);
  }
  return d;
}
