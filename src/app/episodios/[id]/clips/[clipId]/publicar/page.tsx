"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import {
  CANCELAR_PUBLICACION,
  CLIP_EPISODIO,
  PROGRAMAR_PUBLICACION,
  PUBLICACIONES_DE_CLIP,
  YOUTUBE_CANALES,
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
import type { CanalYoutube } from "@/components/CanalesYoutube";
import { IndicadorCalidad } from "@/components/episodios/IndicadorCalidad";
import type { CalidadClip } from "@/lib/calidad";
import { IconoRed, Poster } from "@/components/IconoRed";
import {
  REEL_FACEBOOK_MAX_SEG,
  SeccionVersionFacebook,
  versionEnCurso,
  type VersionCortaClip,
} from "@/components/episodios/VersionFacebook";

type Red = "FACEBOOK" | "INSTAGRAM" | "YOUTUBE";

/** Un lugar a donde puede salir el clip: la página de Facebook, su Instagram o un canal de YouTube de la marca. */
interface Destino {
  clave: string;
  red: Red;
  cuentaId: string;
  nombre: string;
  foto?: string | null;
  formato: string;
  etiqueta: string;
  /** Si no se puede usar, por qué (clave en `publicarClip.motivos`). */
  motivo?: "reconectar" | "desactivado";
}

/** Lo mismo que el backend: lo que va abajo del video y el título de YouTube. */
const DESCRIPCION_MAX = 2200;
const TITULO_YOUTUBE_MAX = 100;
/** Con menos margen, la hora ya pasó cuando llega al servidor. */
const MARGEN_MS = 60_000;

/**
 * Programar un clip ya procesado en las redes de la marca (#70, ng-creator-be#71).
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
  const canalesQ = useQuery(YOUTUBE_CANALES, { variables: { marcaId }, skip: !activa, errorPolicy: "all" });
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
  const destinos: Destino[] = [];
  const pagina = activa?.paginaFacebook;
  if (pagina) {
    destinos.push({
      clave: `fb:${pagina.pageId}`,
      red: "FACEBOOK",
      cuentaId: pagina.pageId,
      nombre: pagina.nombre,
      foto: pagina.fotoUrl,
      formato: "REEL",
      etiqueta: "Reel",
    });
    // Instagram sale con la misma conexión que Facebook: la cuenta ligada a
    // la página, si Meta dio el permiso al conectar (ng-creator-be#60).
    if (pagina.instagramId) {
      destinos.push({
        clave: `ig:${pagina.instagramId}`,
        red: "INSTAGRAM",
        cuentaId: pagina.instagramId,
        nombre: pagina.instagramUsuario ? `@${pagina.instagramUsuario}` : pagina.nombre,
        foto: pagina.instagramFotoUrl,
        formato: "REEL",
        etiqueta: "Reel",
      });
    }
  }
  for (const c of (canalesQ.data?.youtubeCanales ?? []) as CanalYoutube[]) {
    destinos.push({
      clave: `yt:${c.canalId}`,
      red: "YOUTUBE",
      cuentaId: c.canalId,
      nombre: c.nombre,
      foto: c.miniaturaUrl,
      formato: "SHORT",
      etiqueta: "Short",
      motivo: c.requiereReconexion
        ? "reconectar"
        : !c.activa
          ? "desactivado"
          : undefined,
    });
  }

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

  if (clip.estadoRender !== "LISTO" || !clip.urlVideo) {
    return (
      <DashboardLayout>
        {volver}
        <div className="mt-4">
          <Vacio titulo={t("primeroProcesa")} detalle={t("primeroProcesaDetalle")} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {volver}
      <h1 className="mb-5 mt-2 text-2xl font-bold">{t("titulo")}</h1>
      <div className="mx-auto max-w-2xl">
        <Formulario
          clip={clip}
          marcaId={marcaId}
          opera={opera}
          destinos={destinos}
          faltaInstagram={!!pagina && !pagina.instagramId}
          publicaciones={pubsQ.data?.publicacionesDeClip ?? []}
          refrescar={() => void pubsQ.refetch()}
        />
      </div>
    </DashboardLayout>
  );
}

function Formulario({
  clip,
  marcaId,
  opera,
  destinos,
  faltaInstagram,
  publicaciones,
  refrescar,
}: {
  clip: {
    _id: string;
    titulo: string;
    urlPoster?: string | null;
    hastaSeg: number;
    desdeSeg: number;
    editadoEn?: string | null;
    renderizadoEn?: string | null;
    urlVideo: string;
    versionFacebook?: VersionCortaClip | null;
    calidad?: CalidadClip | null;
  };
  marcaId: string;
  opera: boolean;
  destinos: Destino[];
  /** La marca tiene página pero Meta no dio (o no hay) su Instagram. */
  faltaInstagram: boolean;
  publicaciones: Publicacion[];
  refrescar: () => void;
}) {
  const t = useTranslations("publicarClip");
  const tv = useTranslations("versionFacebook");
  const tc = useTranslations("calidadClip");
  const locale = useLocale();
  const [elegidos, setElegidos] = useState<Set<string>>(
    () =>
      new Set(
        destinos
          .filter((d) => !d.motivo)
          .slice(0, 1)
          .map((d) => d.clave),
      ),
  );
  const [descripcion, setDescripcion] = useState("");
  const [tituloYoutube, setTituloYoutube] = useState(clip.titulo.slice(0, TITULO_YOUTUBE_MAX));
  const [fecha, setFecha] = useState(() => aInputLocal(sugerida()));
  const [programar] = useMutation(PROGRAMAR_PUBLICACION);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  const elegidosEnOrden = destinos.filter((d) => elegidos.has(d.clave));
  // Un Reel de Facebook dura hasta 90 s: un clip más largo sale en Facebook con
  // su versión corta, y hasta que esté lista Facebook espera. Las otras redes no.
  const duracionClip = clip.hastaSeg - clip.desdeSeg;
  const necesitaVersion = duracionClip > REEL_FACEBOOK_MAX_SEG;
  const conFacebook = elegidosEnOrden.some((d) => d.red === "FACEBOOK");
  const facebookEspera = necesitaVersion && clip.versionFacebook?.estadoRender !== "LISTO";
  const esperaVersion = (d: Destino) => d.red === "FACEBOOK" && facebookEspera;
  const aProgramar = elegidosEnOrden.filter((d) => !esperaVersion(d));
  const conYoutube = destinos.some((d) => d.red === "YOUTUBE" && elegidos.has(d.clave));
  const editadoSinProcesar =
    clip.editadoEn &&
    clip.renderizadoEn &&
    new Date(clip.editadoEn).getTime() > new Date(clip.renderizadoEn).getTime() + 1000;
  const cuando = fecha ? new Date(fecha) : null;
  const yaPaso = !cuando || Number.isNaN(cuando.getTime()) || cuando.getTime() < Date.now() + MARGEN_MS;

  function alternar(d: Destino) {
    if (d.motivo || !opera) return;
    setElegidos((s) => {
      const n = new Set(s);
      if (n.has(d.clave)) n.delete(d.clave);
      else n.add(d.clave);
      return n;
    });
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
    setEnviando(true);
    const fallas: string[] = [];
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
              descripcion: descripcion.trim() || undefined,
              ajustes: d.red === "YOUTUBE" ? { titulo: tituloYoutube.trim() || clip.titulo } : undefined,
              publicarEn: cuando.toISOString(),
            },
          },
          // El clip sale de "Listos para programar" y su tarjeta pasa a "Programado".
          refetchQueries: ["ClipsListosSinProgramar", "PublicacionesDeMarca", "ClipsDeEpisodio", "ClipEpisodio"],
        });
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
          <p className="text-sm text-white/45">{t("duracionListo", { seg: Math.round(clip.hastaSeg - clip.desdeSeg) })}</p>
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
      {editadoSinProcesar ? (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/[0.06] p-3 text-sm text-amber-300">
          {t("cambiosSinProcesar")}
        </p>
      ) : null}

      {opera ? (
        <>
          {/* Dónde y cuándo sale, al día con lo que se marca abajo, y el botón
              arriba: no hace falta bajar hasta el final para programar. */}
          <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-ng-fondo/95 p-3 backdrop-blur">
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className={`text-xs ${fecha && yaPaso ? "text-red-400" : "text-white/55"}`}>
                {!fecha ? t("elegiDiaHora") : yaPaso ? t("yaPaso") : t("sale", { cuando: diaYHora(cuando!, locale) })}
              </p>
              {elegidosEnOrden.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {elegidosEnOrden.map((d) => (
                    <span
                      key={d.clave}
                      className={`flex max-w-full items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2 text-xs ${
                        esperaVersion(d) ? "border-amber-300/50 bg-amber-300/10" : "border-ng-azul/60 bg-ng-azul/10"
                      }`}
                    >
                      <IconoRed url={d.foto} red={d.red} chico />
                      <span className="truncate">
                        {REDES[d.red]?.nombre ?? d.red} · {d.nombre}
                        {esperaVersion(d) ? ` · ${tv("faltaVersionCorto")}` : ""}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-300">{t("marcaUnaRed")}</p>
              )}
              {conFacebook && facebookEspera ? (
                <p className="text-xs text-amber-300">
                  {aProgramar.length ? tv("faltaVersion") : tv("soloFacebook")}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={enviando || aProgramar.length === 0 || yaPaso}
              className="shrink-0 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {enviando
                ? t("programando")
                : aProgramar.length > 1
                  ? t("programarEnN", { n: aProgramar.length })
                  : t("programar")}
            </button>
          </div>

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
              destinos.map((d) => {
                const on = elegidos.has(d.clave);
                return (
                  <button
                    key={d.clave}
                    type="button"
                    onClick={() => alternar(d)}
                    disabled={Boolean(d.motivo)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      on ? "border-ng-azul bg-ng-azul/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                    } ${d.motivo ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <IconoRed url={d.foto} red={d.red} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{d.nombre}</span>
                      <span className={`block text-xs ${d.motivo ? "text-amber-300" : "text-white/45"}`}>
                        {d.motivo ? t(`motivos.${d.motivo}`) : `${REDES[d.red].nombre} · ${d.etiqueta}`}
                      </span>
                    </span>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs font-bold ${
                        on ? "border-ng-azul bg-ng-azul text-ng-tinta" : "border-white/30"
                      }`}
                    >
                      {on ? "✓" : ""}
                    </span>
                  </button>
                );
              })
            )}
            {faltaInstagram ? (
              <p className="text-xs text-white/40">
                {t("faltaInstagram")}
              </p>
            ) : null}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 opacity-45">
              <IconoRed red="TIKTOK" />
              <span>
                <span className="block text-sm font-medium">TikTok</span>
                <span className="block text-xs text-white/45">{t("pronto")}</span>
              </span>
            </div>
          </Seccion>

          {conFacebook && necesitaVersion ? (
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
            {conYoutube && (
              <label className="block">
                <span className="mb-1 block text-xs text-white/45">{t("tituloYoutube")}</span>
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

        </>
      ) : (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/50">
          {t("soloMira")}
        </p>
      )}

      {publicaciones.length > 0 && (
        <Seccion titulo={t("secciones.publicaciones")}>
          {publicaciones.map((p) => (
            <FilaPublicacionClip key={p._id} p={p} marcaId={marcaId} opera={opera} onCambio={refrescar} />
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
  onCambio,
}: {
  p: Publicacion;
  marcaId: string;
  opera: boolean;
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
