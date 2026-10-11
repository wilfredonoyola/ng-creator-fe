"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { Mic, Square, X } from "lucide-react";
import {
  APROBAR_REVISION,
  COMENTAR_REVISION,
  PEDIR_CAMBIOS_REVISION,
  PEDIR_REVISION,
  REVISION_DE_CLIP,
} from "@/graphql/operations";
import { aInputLocal } from "@/lib/publicaciones";
import { tiempoRelativo, fechaCompleta } from "@/lib/time";
import { ErrorDeSubida, uploadVozRevision, type VozRevisionSubida } from "@/lib/upload";
import {
  useRevisionMarca,
  type ComentarioRevision,
  type ComentarioRevisionInput,
  type EstadoRevision,
  type Revision,
} from "@/lib/revision";

/** Lo que el panel mira de cada publicación del clip. */
interface PubDelClip {
  estado: string;
  publicarEn: string;
  createdAt?: string;
  esperaAprobacion?: boolean | null;
}

const REFRESCAR = ["RevisionDeClip", "PublicacionesDeClip", "PublicacionesDeMarca", "ClipsDeEpisodio", "RevisionesDeMarca"];

const CLASE_ESTADO: Record<EstadoRevision, string> = {
  PENDIENTE: "bg-amber-400/15 text-amber-300",
  APROBADA: "bg-ng-teal/15 text-ng-teal",
  CAMBIOS_PEDIDOS: "bg-orange-400/15 text-orange-300",
};

/**
 * La revisión de un clip antes de publicarlo (ng-creator-be#175): el estado,
 * el hilo de comentarios (texto y voz) y lo que puede hacer cada uno.
 *
 * - Un revisor aprueba o pide cambios. Si hay publicaciones que se vencieron
 *   esperando, elige si salen ya o a otra hora.
 * - Quien opera la marca manda el clip a revisar (o de nuevo, después de
 *   corregir) y comenta.
 *
 * Sin revisión en la marca y sin hilo previo no se dibuja.
 */
export function PanelRevision({
  marcaId,
  clipId,
  urlVideo,
  opera,
  publicaciones,
}: {
  marcaId: string;
  clipId: string;
  urlVideo?: string | null;
  opera: boolean;
  publicaciones: PubDelClip[];
}) {
  const t = useTranslations("revisionClip.panel");
  const { activa, soyRevisor } = useRevisionMarca(marcaId || undefined);
  const q = useQuery(REVISION_DE_CLIP, {
    variables: { marcaId, clipId },
    skip: !marcaId,
    pollInterval: 30_000,
    errorPolicy: "all",
  });
  const revision: Revision | null = q.data?.revisionDeClip ?? null;

  const [aprobar, { loading: aprobando }] = useMutation(APROBAR_REVISION, { refetchQueries: REFRESCAR });
  const [pedirCambios, { loading: pidiendo }] = useMutation(PEDIR_CAMBIOS_REVISION, { refetchQueries: REFRESCAR });
  const [pedir, { loading: mandando }] = useMutation(PEDIR_REVISION, { refetchQueries: REFRESCAR });
  const [comentar, { loading: comentando }] = useMutation(COMENTAR_REVISION, { refetchQueries: REFRESCAR });

  const [texto, setTexto] = useState("");
  const [voz, setVoz] = useState<VozRevisionSubida | null>(null);
  const [transcripcion, setTranscripcion] = useState("");
  const [verVideo, setVerVideo] = useState(false);
  const [vencidasAl, setVencidasAl] = useState<"ya" | "otra">("ya");
  const [nuevaHora, setNuevaHora] = useState("");
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  // Al abrir desde un aviso (…/publicar#revision), el panel queda a la vista.
  const ancla = useRef<HTMLElement>(null);
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#revision") {
      ancla.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [revision?._id]);

  if (!activa && !revision) return null;

  const ahora = Date.now();
  const vencidas = publicaciones.filter((p) => {
    if (!p.esperaAprobacion || p.estado !== "PROGRAMADA") return false;
    const hora = new Date(p.publicarEn).getTime();
    const pedida = p.createdAt ? new Date(p.createdAt).getTime() : 0;
    return hora < ahora && hora - pedida > 60_000;
  }).length;

  const estado = revision?.estado ?? null;
  const ocupado = aprobando || pidiendo || mandando || comentando;

  function comentario(): ComentarioRevisionInput | null {
    const limpio = texto.trim();
    if (!limpio && !voz) return null;
    return {
      ...(limpio ? { texto: limpio } : {}),
      ...(voz
        ? {
            audioUrl: voz.url,
            audioDuracionSeg: voz.duracionSeg,
            ...(transcripcion.trim() ? { transcripcion: transcripcion.trim() } : {}),
          }
        : {}),
    };
  }

  function limpiar() {
    setTexto("");
    setVoz(null);
    setTranscripcion("");
  }

  async function correr(fn: () => Promise<unknown>, ok: string) {
    setAviso(null);
    try {
      await fn();
      limpiar();
      setAviso({ tono: "ok", texto: ok });
    } catch (e) {
      setAviso({ tono: "error", texto: e instanceof Error ? e.message : t("error") });
    }
  }

  function alAprobar() {
    let hora: Date | undefined;
    if (vencidas > 0 && vencidasAl === "otra") {
      hora = nuevaHora ? new Date(nuevaHora) : undefined;
      if (!hora || Number.isNaN(hora.getTime()) || hora.getTime() < Date.now() + 60_000) {
        setAviso({ tono: "error", texto: t("horaPasada") });
        return;
      }
    }
    const c = comentario();
    void correr(
      () =>
        aprobar({
          variables: {
            marcaId,
            clipId,
            ...(c ? { comentario: c } : {}),
            ...(hora ? { nuevaHora: hora.toISOString() } : {}),
          },
        }),
      t("aprobado"),
    );
  }

  function alPedirCambios() {
    const c = comentario();
    if (!c) {
      setAviso({ tono: "error", texto: t("faltaComentario") });
      return;
    }
    void correr(
      () => pedirCambios({ variables: { marcaId, clipId, comentario: c } }),
      t("cambiosMandados", { nombre: revision?.pedidaPor.nombre ?? "" }),
    );
  }

  function alMandar() {
    const c = comentario();
    void correr(
      () => pedir({ variables: { marcaId, clipId, ...(c ? { comentario: c } : {}) } }),
      t("mandadoARevisar"),
    );
  }

  function alComentar() {
    const c = comentario();
    if (!c) {
      setAviso({ tono: "error", texto: t("faltaComentario") });
      return;
    }
    void correr(() => comentar({ variables: { marcaId, clipId, comentario: c } }), "");
  }

  // Quien opera manda a revisar si nunca se mandó o si le pidieron cambios.
  const puedeMandar = opera && activa && (!estado || estado === "CAMBIOS_PEDIDOS");
  const puedeComentar = !!revision && (opera || soyRevisor);
  const escribe = soyRevisor || puedeMandar || puedeComentar;

  return (
    <section id="revision" ref={ancla} className="scroll-mt-20 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/45">{t("titulo")}</h2>
        {estado && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] ${CLASE_ESTADO[estado]}`}>{t(`estado.${estado}`)}</span>
        )}
        {urlVideo && (
          <button
            type="button"
            onClick={() => setVerVideo((v) => !v)}
            className="ml-auto text-xs text-ng-celeste hover:underline"
          >
            {t("verVideo")}
          </button>
        )}
      </div>

      {verVideo && urlVideo && (
        <video src={urlVideo} controls playsInline className="mx-auto max-h-[60vh] rounded-xl bg-black" />
      )}

      {!revision && <p className="text-sm text-white/50">{t("sinRevision")}</p>}

      {revision && revision.comentarios.length > 0 && (
        <ol className="space-y-2">
          {revision.comentarios.map((c) => (
            <ItemComentario key={c._id} c={c} />
          ))}
        </ol>
      )}

      {escribe && (
        <div className="space-y-2 border-t border-white/10 pt-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder={t("placeholder")}
            className="w-full resize-y rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-ng-azul"
          />
          <GrabadorVoz
            marcaId={marcaId}
            voz={voz}
            onVoz={(v) => {
              setVoz(v);
              setTranscripcion(v?.transcripcion ?? "");
            }}
          />
          {voz && (
            <label className="block">
              <span className="text-xs text-white/45">{t("transcripcion")}</span>
              <textarea
                value={transcripcion}
                onChange={(e) => setTranscripcion(e.target.value)}
                rows={2}
                maxLength={4000}
                className="mt-1 w-full resize-y rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-ng-azul"
              />
              <span className="text-[11px] text-white/35">{t("transcripcionAyuda")}</span>
            </label>
          )}

          {soyRevisor && vencidas > 0 && estado !== "APROBADA" && (
            <div className="space-y-1.5 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3 text-sm">
              <p className="text-red-300">{t("vencidas", { n: vencidas })}</p>
              <label className="flex items-center gap-2">
                <input type="radio" checked={vencidasAl === "ya"} onChange={() => setVencidasAl("ya")} className="accent-[#FFD400]" />
                {t("publicarYa")}
              </label>
              <label className="flex flex-wrap items-center gap-2">
                <input
                  type="radio"
                  checked={vencidasAl === "otra"}
                  onChange={() => {
                    setVencidasAl("otra");
                    if (!nuevaHora) setNuevaHora(aInputLocal(new Date(Date.now() + 60 * 60_000)));
                  }}
                  className="accent-[#FFD400]"
                />
                {t("otraHora")}
                {vencidasAl === "otra" && (
                  <input
                    type="datetime-local"
                    value={nuevaHora}
                    min={aInputLocal(new Date())}
                    onChange={(e) => setNuevaHora(e.target.value)}
                    className="rounded-lg border border-white/15 bg-white/[0.03] px-2 py-1 text-sm [color-scheme:dark]"
                  />
                )}
              </label>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {soyRevisor && estado !== "APROBADA" && (
              <>
                <button
                  type="button"
                  onClick={alAprobar}
                  disabled={ocupado}
                  className="rounded-lg bg-marca px-4 py-2 text-sm font-medium text-ng-tinta transition hover:brightness-110 disabled:opacity-40"
                >
                  {aprobando ? t("aprobando") : t("aprobar")}
                </button>
                <button
                  type="button"
                  onClick={alPedirCambios}
                  disabled={ocupado}
                  className="rounded-lg border border-orange-400/40 px-4 py-2 text-sm text-orange-200 transition hover:bg-orange-400/10 disabled:opacity-40"
                >
                  {pidiendo ? t("pidiendo") : t("pedirCambios")}
                </button>
              </>
            )}
            {puedeMandar && !soyRevisor && (
              <button
                type="button"
                onClick={alMandar}
                disabled={ocupado}
                className="rounded-lg bg-marca px-4 py-2 text-sm font-medium text-ng-tinta transition hover:brightness-110 disabled:opacity-40"
              >
                {estado === "CAMBIOS_PEDIDOS" ? t("mandarDeNuevo") : t("mandarARevisar")}
              </button>
            )}
            {puedeComentar && (
              <button
                type="button"
                onClick={alComentar}
                disabled={ocupado}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5 disabled:opacity-40"
              >
                {comentando ? t("comentando") : t("comentar")}
              </button>
            )}
          </div>
          {!soyRevisor && estado === "PENDIENTE" && <p className="text-xs text-white/40">{t("noSoyRevisor")}</p>}
        </div>
      )}

      {aviso && aviso.texto && (
        <p className={`text-xs ${aviso.tono === "ok" ? "text-ng-teal" : "text-red-400"}`}>{aviso.texto}</p>
      )}
    </section>
  );
}

function ItemComentario({ c }: { c: ComentarioRevision }) {
  const t = useTranslations("revisionClip.panel");
  const locale = useLocale();
  const tieneCuerpo = c.texto || c.audioUrl;
  return (
    <li className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-white/50">
        <span className="font-medium text-white/80">{c.autor.nombre}</span> {t(`acciones.${c.accion}`)}
        {" · "}
        <span title={fechaCompleta(c.autor.en, locale)}>{tiempoRelativo(c.autor.en, Date.now(), locale)}</span>
      </p>
      {tieneCuerpo && (
        <div className="mt-1.5 space-y-1.5">
          {c.texto && <p className="whitespace-pre-wrap break-words text-sm text-white/85">{c.texto}</p>}
          {c.audioUrl && (
            <>
              <audio src={c.audioUrl} controls preload="none" className="h-9 w-full max-w-sm" />
              {c.transcripcion && <p className="text-xs italic text-white/55">“{c.transcripcion}”</p>}
            </>
          )}
        </div>
      )}
    </li>
  );
}

/** Grabar una nota de voz y subirla. Al terminar, el backend la devuelve transcrita. */
function GrabadorVoz({
  marcaId,
  voz,
  onVoz,
}: {
  marcaId: string;
  voz: VozRevisionSubida | null;
  onVoz: (v: VozRevisionSubida | null) => void;
}) {
  const t = useTranslations("revisionClip.voz");
  const tErr = useTranslations("erroresSubida");
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const grabador = useRef<MediaRecorder | null>(null);
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (reloj.current) clearInterval(reloj.current);
      grabador.current?.stream.getTracks().forEach((tr) => tr.stop());
    },
    [],
  );

  async function empezar() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: tipo });
      const partes: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) partes.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const audio = new Blob(partes, { type: rec.mimeType });
        if (!audio.size) return;
        setSubiendo(true);
        try {
          const subida = await uploadVozRevision(audio, marcaId);
          onVoz(subida);
          if (!subida.transcripcion) setError(t("sinTranscripcion"));
        } catch (e) {
          setError(e instanceof ErrorDeSubida ? tErr(e.clave, e.datos) : e instanceof Error ? e.message : String(e));
        } finally {
          setSubiendo(false);
        }
      };
      grabador.current = rec;
      rec.start();
      setGrabando(true);
      setSegundos(0);
      reloj.current = setInterval(() => setSegundos((s) => s + 1), 1000);
    } catch {
      setError(t("sinMicrofono"));
    }
  }

  function parar() {
    if (reloj.current) clearInterval(reloj.current);
    reloj.current = null;
    grabador.current?.stop();
    setGrabando(false);
  }

  const mmss = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-1">
      {voz ? (
        <div className="flex items-center gap-2">
          <audio src={voz.url} controls className="h-9 w-full max-w-sm" />
          <button
            type="button"
            onClick={() => onVoz(null)}
            aria-label={t("quitar")}
            title={t("quitar")}
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ) : grabando ? (
        <button
          type="button"
          onClick={parar}
          className="inline-flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/30"
        >
          <Square size={14} aria-hidden />
          {t("parar")} · {t("grabando", { seg: mmss })}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void empezar()}
          disabled={subiendo}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
        >
          <Mic size={14} aria-hidden />
          {subiendo ? t("subiendo") : t("grabar")}
        </button>
      )}
      {error && <p className="text-xs text-amber-300">{error}</p>}
    </div>
  );
}
