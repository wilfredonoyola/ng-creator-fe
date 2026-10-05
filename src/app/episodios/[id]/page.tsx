"use client";

import { esMotivo, reloj } from "@/lib/momentos";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import {
  ANALIZAR_MOMENTOS_EPISODIO,
  CLIPS_DE_EPISODIO,
  EPISODIO,
} from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  ReproductorEpisodio,
  type ControlReproductor,
} from "@/components/ReproductorEpisodio";
import { useMarcaActiva } from "@/lib/marca-activa";
import { AvisoFuente } from "@/components/episodios/AvisoFuente";
import { CrearClipGuiado } from "@/components/episodios/CrearClipGuiado";
import { TomarClip, type Autoria } from "@/components/episodios/TomarClip";
import {
  EstadoPublicacionClip,
  ListoClip,
  type ResumenPublicacionClip,
} from "@/components/episodios/ListoClip";
import { useSesion } from "@/lib/sesion";

type EstadoMomentos = "EN_COLA" | "ANALIZANDO" | "LISTO" | "FALLIDO";

interface Clip {
  _id: string;
  desdeSeg: number;
  hastaSeg: number;
  puntuacion: number;
  motivo: string;
  titulo: string;
  explicacion: string;
  gancho?: string | null;
  texto: string;
  origen?: "IA" | "MANUAL";
  estadoRender?: "EN_COLA" | "RENDERIZANDO" | "LISTO" | "FALLIDO" | null;
  /** Quién lo está haciendo (#70); null = libre. */
  tomadoPor?: Autoria | null;
  urlVideo?: string | null;
  /** Quién lo dio por terminado (#70); null = en trabajo. */
  listoPor?: Autoria | null;
  publicacion?: ResumenPublicacionClip | null;
}


/**
 * Un episodio y los clips que la IA propone sacarle (ng-creator-be#68).
 *
 * Los clips son SUGERIDOS: la puntuación es la opinión de la IA, y esta
 * pantalla existe para que una persona los escuche y decida. Cada uno se
 * reproduce desde el episodio mismo, saltando a su tramo; todavía no hay un
 * archivo por clip (eso llega con el editor, #69).
 */
export default function DetalleEpisodioPage({
  params,
}: {
  // Objeto plano, no promesa: ver publicados/[id].
  params: { id: string };
}) {
  const t = useTranslations("episodioDetalle");
  const locale = useLocale();
  const { id } = params;
  const { activa } = useMarcaActiva();
  const { puedeOperar } = useSesion();
  const marcaId = activa?._id ?? null;
  const opera = puedeOperar(marcaId);
  const reproductor = useRef<ControlReproductor>(null);
  const [sonando, setSonando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creandoClip, setCreandoClip] = useState(false);

  const variables = { id, marcaId: marcaId ?? "" };
  const episodioQ = useQuery(EPISODIO, { variables, skip: !marcaId, errorPolicy: "all" });
  const clipsQ = useQuery(CLIPS_DE_EPISODIO, { variables, skip: !marcaId });
  const [analizar, { loading: pidiendo }] = useMutation(ANALIZAR_MOMENTOS_EPISODIO);

  const ep = episodioQ.data?.episodio;
  const clips: Clip[] = clipsQ.data?.clipsDeEpisodio ?? [];
  const estado: EstadoMomentos | null = ep?.estadoMomentos ?? null;
  const trabajando =
    estado === "EN_COLA" ||
    estado === "ANALIZANDO" ||
    ep?.estadoTranscripcion === "EN_COLA" ||
    ep?.estadoTranscripcion === "TRANSCRIBIENDO";

  // Mientras la IA trabaja se consulta seguido; al terminar, se traen los clips.
  const { startPolling, stopPolling } = episodioQ;
  const refetchClips = clipsQ.refetch;
  const antes = useRef<EstadoMomentos | null>(null);
  useEffect(() => {
    if (trabajando) startPolling(10_000);
    else stopPolling();
    return () => stopPolling();
  }, [trabajando, startPolling, stopPolling]);
  useEffect(() => {
    if (antes.current && antes.current !== "LISTO" && estado === "LISTO") void refetchClips();
    antes.current = estado;
  }, [estado, refetchClips]);

  async function buscarDeNuevo() {
    if (!marcaId) return;
    if (
      estado === "LISTO" &&
      !window.confirm(t("confirmarBuscar"))
    ) {
      return;
    }
    setError(null);
    try {
      await analizar({ variables: { id, marcaId } });
      void episodioQ.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorAnalisis"));
    }
  }

  function reproducir(c: Clip) {
    setSonando(c._id);
    reproductor.current?.reproducirTramo(c.desdeSeg, c.hastaSeg);
  }

  if (episodioQ.loading && !ep) {
    return (
      <DashboardLayout>
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
      </DashboardLayout>
    );
  }

  if (!ep) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="font-medium text-white/70">{t("noEncontrado")}</p>
          <p className="mt-1 text-sm text-white/40">
            {t("otraMarca")}
          </p>
          <Link href="/episodios" className="mt-4 inline-block text-sm text-ng-teal">
            {t("volverAEpisodios")}
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const costo = (ep.costoTranscripcionUsd ?? 0) + (ep.costoMomentosUsd ?? 0);

  return (
    <DashboardLayout>
      <Link href="/episodios" className="text-sm text-white/50 hover:text-white/80">
        {t("volver")}
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{ep.titulo}</h1>
          <p className="mt-1 text-sm text-white/50">
            {ep.duracionSeg ? reloj(ep.duracionSeg) : ""}
            {ep.palabrasTranscritas
              ? t("palabras", { n: ep.palabrasTranscritas, cantidad: ep.palabrasTranscritas.toLocaleString(locale) })
              : ""}
            {costo > 0 ? t("costo", { usd: costo.toFixed(2) }) : ""}
          </p>
        </div>
        {opera && ep.estadoTranscripcion === "LISTA" && !trabajando && (
          <button
            onClick={() => void buscarDeNuevo()}
            disabled={pidiendo}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
          >
            {estado === "FALLIDO" ? t("reintentar") : t("buscarOtraVez")}
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          {ep.urlReproduccion ? (
            <ReproductorEpisodio
              ref={reproductor}
              url={ep.urlReproduccion}
              poster={ep.miniaturaUrl}
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl bg-white/5 text-sm text-white/40">
              {t("videoNoListo")}
            </div>
          )}
          <AvisoFuente resolucion={ep.resolucionOriginal} className="mt-3" />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">{t("clips")}</h2>
            {opera && ep.estadoTranscripcion === "LISTA" && !creandoClip && (
              <button
                onClick={() => setCreandoClip(true)}
                title={t("crearClipAyuda")}
                className="rounded-lg bg-ng-violeta px-3 py-1 text-xs font-medium text-ng-tinta hover:brightness-110"
              >
                {t("crearClip")}
              </button>
            )}
          </div>
          {creandoClip && marcaId && (
            <div className="mb-4">
              <CrearClipGuiado
                episodioId={id}
                marcaId={marcaId}
                duracionEpisodio={ep.duracionSeg ?? 0}
                reproductor={reproductor}
                onCerrar={() => setCreandoClip(false)}
              />
            </div>
          )}
          <EstadoDelAnalisis ep={ep} />
          {clips.length > 0 && (
            <ol className="space-y-3">
              {clips.map((c, i) => (
                <TarjetaClip
                  key={c._id}
                  editar={`/episodios/${id}/clips/${c._id}`}
                  clip={c}
                  marcaId={marcaId ?? ""}
                  opera={opera}
                  puesto={i + 1}
                  sonando={sonando === c._id}
                  puedeReproducir={Boolean(ep.urlReproduccion)}
                  onReproducir={() => reproducir(c)}
                />
              ))}
            </ol>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function EstadoDelAnalisis({
  ep,
}: {
  ep: {
    estadoTranscripcion?: string | null;
    progresoTranscripcion?: number | null;
    estadoMomentos?: EstadoMomentos | null;
    errorMomentos?: string | null;
    errorTranscripcion?: string | null;
    clipsSugeridos?: number | null;
  };
}) {
  const t = useTranslations("episodioDetalle");
  const aviso = (texto: string, clase = "text-white/50") => (
    <p className={`mb-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm ${clase}`}>
      {texto}
    </p>
  );
  if (ep.estadoTranscripcion !== "LISTA") {
    if (ep.estadoTranscripcion === "TRANSCRIBIENDO") {
      return aviso(
        t("analisis.transcribiendo", { p: ep.progresoTranscripcion ?? 0 }),
      );
    }
    if (ep.estadoTranscripcion === "FALLIDA") {
      return aviso(
        t("analisis.falloTranscripcion", { error: ep.errorTranscripcion ?? t("analisis.sinDetalle") }),
        "text-red-400",
      );
    }
    return aviso(t("analisis.sinTranscripcion"));
  }
  switch (ep.estadoMomentos) {
    case "EN_COLA":
    case "ANALIZANDO":
      return aviso(t("analisis.analizando"));
    case "FALLIDO":
      return aviso(t("analisis.falloMomentos", { error: ep.errorMomentos ?? t("analisis.sinDetalle") }), "text-red-400");
    case "LISTO":
      return ep.clipsSugeridos
        ? null
        : aviso(t("analisis.sinMomentos"));
    default:
      return null;
  }
}

function TarjetaClip({
  editar,
  clip,
  marcaId,
  opera,
  puesto,
  sonando,
  puedeReproducir,
  onReproducir,
}: {
  editar: string;
  clip: Clip;
  marcaId: string;
  opera: boolean;
  puesto: number;
  sonando: boolean;
  puedeReproducir: boolean;
  onReproducir: () => void;
}) {
  const t = useTranslations("episodioDetalle");
  const tMotivo = useTranslations("episodiosMotivos");
  const [verTexto, setVerTexto] = useState(false);
  const [viendoFinal, setViendoFinal] = useState(false);
  const tieneVideo = clip.estadoRender === "LISTO" && Boolean(clip.urlVideo);
  return (
    <li
      className={`rounded-xl border p-3 transition ${
        sonando ? "border-ng-azul/60 bg-ng-teal/[0.04]" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="w-6 shrink-0 pt-0.5 text-right text-sm tabular-nums text-white/30">
          {puesto}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{clip.titulo}</p>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
              {clip.origen === "MANUAL" ? t("tarjeta.hechoAMano") : esMotivo(clip.motivo) ? tMotivo(clip.motivo) : clip.motivo}
            </span>
            {clip.estadoRender === "LISTO" && (
              <span className="rounded-full bg-ng-teal/15 px-2 py-0.5 text-[11px] text-ng-teal">{t("tarjeta.mp4Listo")}</span>
            )}
            {(clip.estadoRender === "EN_COLA" || clip.estadoRender === "RENDERIZANDO") && (
              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-300">{t("tarjeta.renderizando")}</span>
            )}
            <EstadoPublicacionClip publicacion={clip.publicacion} />
          </div>
          <p className="mt-0.5 text-xs tabular-nums text-white/45">
            {t("tarjeta.tramo", {
              desde: reloj(clip.desdeSeg),
              hasta: reloj(clip.hastaSeg),
              seg: Math.round(clip.hastaSeg - clip.desdeSeg),
            })}
            {clip.origen !== "MANUAL" && t("tarjeta.puntuacion", { n: clip.puntuacion })}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <TomarClip clipId={clip._id} marcaId={marcaId} tomadoPor={clip.tomadoPor} puedeOperar={opera} />
            <ListoClip
              clipId={clip._id}
              marcaId={marcaId}
              listoPor={clip.listoPor}
              tieneVideo={tieneVideo}
              puedeOperar={opera}
            />
          </div>
          <p className="mt-2 text-sm text-white/70">{clip.explicacion}</p>
          {clip.gancho && (
            <p className="mt-1 text-sm text-white/50">
              {t.rich("tarjeta.gancho", {
                gancho: clip.gancho,
                g: (c) => <span className="text-white/80">{c}</span>,
              })}
            </p>
          )}
          <button
            onClick={() => setVerTexto((v) => !v)}
            className="mt-2 text-xs text-white/40 hover:text-white/70"
          >
            {verTexto ? t("tarjeta.ocultarTexto") : t("tarjeta.verTexto")}
          </button>
          {verTexto && <p className="mt-1 text-sm leading-relaxed text-white/60">{clip.texto}</p>}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
        <Link
          href={editar}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-center text-xs text-white/80 hover:bg-white/5"
        >
          {t("tarjeta.editar")}
        </Link>
        {tieneVideo && (
          <button
            onClick={() => setViendoFinal(true)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-center text-xs text-white/80 hover:bg-white/5"
          >
            {t("tarjeta.verFinal")}
          </button>
        )}
        {opera && tieneVideo && (
          <Link
            href={`${editar}/publicar`}
            className="rounded-lg border border-indigo-400/40 px-3 py-1.5 text-center text-xs text-indigo-200 hover:bg-indigo-400/10"
          >
            {t("tarjeta.programar")}
          </Link>
        )}
        {puedeReproducir && (
          <button
            onClick={onReproducir}
            title={t("tarjeta.reproducirTramo")}
            className="shrink-0 rounded-lg bg-marca px-3 py-1.5 text-xs font-medium text-ng-tinta"
          >
            {t("tarjeta.escuchar")}
          </button>
        )}
        </div>
      </div>
      {viendoFinal && clip.urlVideo && (
        <VideoFinalModal url={clip.urlVideo} titulo={clip.titulo} onCerrar={() => setViendoFinal(false)} />
      )}
    </li>
  );
}

/** El MP4 procesado, encima de la lista: se mira sin salir del episodio. */
function VideoFinalModal({ url, titulo, onCerrar }: { url: string; titulo: string; onCerrar: () => void }) {
  const t = useTranslations("episodioDetalle");
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("modal.etiqueta", { titulo })}
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-full flex-col items-center gap-3">
        <div className="flex w-full items-center justify-between gap-4">
          <p className="truncate text-sm font-medium">{titulo}</p>
          <button onClick={onCerrar} className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5">
            {t("modal.cerrar")}
          </button>
        </div>
        <video src={url} controls autoPlay playsInline className="max-h-[80vh] max-w-full rounded-xl bg-black" />
      </div>
    </div>
  );
}

/** 5423.7 → "1:30:23". */
