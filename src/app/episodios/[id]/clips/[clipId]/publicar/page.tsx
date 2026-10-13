"use client";

import Link from "next/link";
import { CalendarClock, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import {
  CANCELAR_PUBLICACION,
  CLIP_EPISODIO,
  PROGRAMAR_PUBLICACION,
  PUBLICACIONES_DE_CLIP,
} from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";
import {
  ESTADOS_PUBLICACION,
  REDES,
  aInputLocal,
  diaYHora,
  zonaHoraria,
  type Publicacion,
} from "@/lib/publicaciones";
import type { Red } from "@/lib/upload-post";
import { MAXIMO_ETIQUETADOS_INSTAGRAM, ajustesInstagram, conPersona, textoConMenciones, useElenco, useInvitados, type Persona } from "@/lib/etiquetas";
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
 * No hace falta exportarlo antes: si el MP4 falta o quedó viejo, el backend lo
 * manda a exportar y la publicación espera el video (`esperaVideo`); a la
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
  const versionProcesando = versionEnCurso(clip?.versionFacebook);
  const { startPolling, stopPolling } = clipQ;
  useEffect(() => {
    if (versionProcesando) startPolling(4000);
    else stopPolling();
    return () => stopPolling();
  }, [versionProcesando, startPolling, stopPolling]);
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
  const marcadoDeEntrada = (d: Destino) =>
    !d.motivo && !apagados.has(d.cuentaId) && !yaVa.has(`${d.red}:${d.cuentaId}`);
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
  // La portada es un cuadro del MP4 final: solo se elige si el que hay ya es ese.
  const portadaElegible = conVideo && !editadoSinProcesar ? clip.urlVideo ?? null : null;
  const cuando = fecha ? new Date(fecha) : null;
  const yaPaso = !cuando || Number.isNaN(cuando.getTime()) || cuando.getTime() < Date.now() + MARGEN_MS;

  // A quién se etiqueta (ng-creator-be#198): los invitados del episodio
  // primero y marcados; el elenco de la marca, sin marcar. Se guarda solo lo
  // que la persona cambia, como con los destinos.
  const marcaPersonas = useElenco(marcaId);
  const elenco = marcaPersonas.elenco;
  const inv = useInvitados(episodioId, marcaId);
  const idsInvitados = new Set(inv.invitados.map((p) => p.id));
  const personas: Persona[] = [...inv.invitados, ...elenco.filter((p) => !idsInvitados.has(p.id))];
  const [cambiosEtiquetas, setCambiosEtiquetas] = useState<Map<string, boolean>>(() => new Map());
  const [colaboradores, setColaboradores] = useState<Set<string>>(() => new Set());
  const etiquetadas = personas.filter((p) => cambiosEtiquetas.get(p.id) ?? idsInvitados.has(p.id));
  const idsEtiquetadas = new Set(etiquetadas.map((p) => p.id));
  const colaboradoresElegidos = new Set([...colaboradores].filter((id) => idsEtiquetadas.has(id)));

  const descripcionFinal = conHashtags(descripcion, hashtags);
  // El texto de cada red: con las @menciones donde no hay etiquetas de verdad.
  const textoDe = (red: Red) => textoConMenciones(descripcionFinal, red, etiquetadas);
  const comoSale = comoSaleEnCadaRed(elegidosEnOrden, descripcionFinal, tituloYoutube.trim() || clip.titulo, textoDe);
  const descripcionLarga = descripcionFinal.length > DESCRIPCION_MAX || comoSale.some((c) => c.texto.length > DESCRIPCION_MAX);
  const sePasan = comoSale.filter((c) => c.largo);

  function alternar(d: Destino) {
    if (d.motivo || !opera) return;
    const on = elegidos.has(d.clave);
    setCambios((m) => new Map(m).set(d.clave, !on));
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
    const instagramCompleto = ajustesInstagram(etiquetadas, colaboradoresElegidos);
    const instagram = instagramCompleto
      ? { ...instagramCompleto, etiquetados: instagramCompleto.etiquetados.slice(0, MAXIMO_ETIQUETADOS_INSTAGRAM) }
      : undefined;
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
                    : undefined,
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

  return (
    <div className="space-y-6">
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
      {!conVideo || editadoSinProcesar ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/60">
          {conVideo ? t("cambiosSinProcesar") : t("sinVideo")}
        </p>
      ) : null}

      {opera ? (
        <>
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
              personas={personas}
              invitados={idsInvitados}
              elegidas={idsEtiquetadas}
              onAlternar={(id) => setCambiosEtiquetas((m) => new Map(m).set(id, !idsEtiquetadas.has(id)))}
              colaboradores={colaboradoresElegidos}
              onColaborador={(id) =>
                setColaboradores((c) => {
                  const n = new Set(c);
                  if (n.has(id)) n.delete(id);
                  else n.add(id);
                  return n;
                })
              }
              conInstagram={elegidosEnOrden.some((d) => d.red === "INSTAGRAM")}
              guardando={inv.guardando || marcaPersonas.guardando}
              marcaId={marcaId}
              onAgregarInvitado={async (p, enMarca) => {
                const guardados = await inv.guardar([...inv.invitados, p]);
                // El nuevo es el último: ya sale marcado por ser invitado.
                const nuevo = guardados[guardados.length - 1];
                if (nuevo) setCambiosEtiquetas((m) => new Map(m).set(nuevo.id, true));
                // Con el mismo id: es la misma persona en el episodio y en la marca.
                if (enMarca && nuevo) await marcaPersonas.guardar(conPersona(elenco, nuevo));
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
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={t("descripcionPlaceholder")}
              maxLength={DESCRIPCION_MAX}
              rows={4}
              className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-ng-azul"
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
              <p className="text-xs text-white/45">{t("portadaSinVideo")}</p>
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
                  <p className={`text-sm font-medium ${fecha && yaPaso ? "text-red-400" : "text-white"}`}>
                    {!fecha ? t("elegiDiaHora") : yaPaso ? t("yaPaso") : t("sale", { cuando: diaYHora(cuando!, locale) })}
                    {elegidosEnOrden.length ? <span className="font-normal text-white/50">{` · ${t("nRedes", { n: elegidosEnOrden.length })}`}</span> : null}
                  </p>
                  {elegidosEnOrden.length === 0 ? <p className="text-xs text-amber-300">{t("marcaUnaRed")}</p> : null}
                  {conFacebook && facebookEspera ? (
                    <p className="text-xs text-amber-300">{aProgramar.length ? tv("faltaVersion") : tv("soloFacebook")}</p>
                  ) : null}
                  {revision.activa ? (
                    <p className={`text-xs ${revision.soyRevisor ? "text-white/45" : "text-amber-300"}`}>
                      {revision.soyRevisor ? tr("avisoRevisor") : tr("aviso")}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void enviar()}
                disabled={enviando || aProgramar.length === 0 || yaPaso || descripcionLarga}
                className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-marca px-5 py-3 text-sm font-bold text-ng-tinta transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                {enviando ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <CalendarClock size={16} aria-hidden />}
                {enviando
                  ? t("programando")
                  : aProgramar.length > 1
                    ? t("programarEnN", { n: aProgramar.length })
                    : t("programar")}
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/50">
          {t("soloMira")}
        </p>
      )}

      {publicaciones.length > 0 && (
        <Seccion titulo={t("secciones.publicaciones")}>
          {publicaciones.map((p) => (
            <FilaPublicacionClip
              key={p._id}
              p={p}
              marcaId={marcaId}
              opera={opera}
              estadoRevision={clip.estadoRevision}
              onCambio={refrescar}
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
}: {
  p: Publicacion;
  marcaId: string;
  opera: boolean;
  estadoRevision?: EstadoRevision | null;
  onCambio: () => void;
}) {
  const t = useTranslations("publicarClip");
  const locale = useLocale();
  const [cancelar, { loading }] = useMutation(CANCELAR_PUBLICACION, {
    refetchQueries: ["ClipsListosSinProgramar", "PublicacionesDeMarca", "ClipsDeEpisodio", "ClipEpisodio"],
  });
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
    <div className={`rounded-xl border border-white/10 bg-white/[0.03] p-3 ${p.estado === "CANCELADA" ? "opacity-50" : ""}`}>
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
        <span className={`rounded-full px-2 py-0.5 text-[11px] ${e.clase}`}>{e.texto}</span>
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
      {p.error ? <p className="mt-1 break-words text-xs text-red-400">{p.error}</p> : null}
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
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
