"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { CalendarClock, ChartColumn, CircleCheck, Film, Pencil, Send, Trash2, UploadCloud } from "lucide-react";
import {
  BORRAR_EPISODIO,
  CLIPS_SUBIDOS,
  CONFIRMAR_SUBIDA_EPISODIO,
  PREPARAR_SUBIDA_CLIP,
  RENOVAR_SUBIDA_EPISODIO,
} from "@/graphql/operations";
import { iniciarSubidaTus, type CredencialesTus, type SubidaEpisodio } from "@/lib/subida-episodio";
import { reloj } from "@/lib/momentos";

/** Lo mismo que acepta el backend (CLIP_SUBIDO_MAXIMO_SEG): lo que deja el editor y YouTube Shorts. */
const MAXIMO_SEG = 180;

interface ClipSubido {
  episodio: {
    _id: string;
    titulo: string;
    estado: "SUBIENDO" | "PROCESANDO" | "LISTO" | "FALLIDO";
    error?: string | null;
    duracionSeg?: number | null;
    miniaturaUrl?: string | null;
    subidoPor?: { nombre: string } | null;
  };
  clip: {
    _id: string;
    titulo: string;
    formato?: "VERTICAL" | "CUADRADO" | "HORIZONTAL" | null;
    estadoRender?: "EN_COLA" | "RENDERIZANDO" | "LISTO" | "FALLIDO" | null;
    progresoRender?: number | null;
    urlPoster?: string | null;
    usarOriginal: boolean;
    listoPor?: { nombre: string } | null;
    publicacion?: { programadas: number; publicadas: number } | null;
  } | null;
}

/** Lo que se está subiendo desde esta pestaña. */
interface Subiendo {
  nombre: string;
  episodioId: string | null;
  pct: number;
}

/** En qué anda cada clip, para el filtro y la etiqueta de la tarjeta. */
type Etapa = "preparando" | "listo" | "programado" | "publicado" | "fallo";
type Filtro = "todos" | Exclude<Etapa, "fallo">;
const FILTROS: Filtro[] = ["todos", "preparando", "listo", "programado", "publicado"];

function etapaDe(c: ClipSubido): Etapa {
  if (c.episodio.estado === "FALLIDO" || c.clip?.estadoRender === "FALLIDO") return "fallo";
  if (c.clip?.estadoRender !== "LISTO") return "preparando";
  if (c.clip.publicacion?.publicadas) return "publicado";
  if (c.clip.publicacion?.programadas) return "programado";
  return "listo";
}

/**
 * Cuánto dura un video del disco, leyendo solo sus metadatos. null si el
 * navegador no lo puede leer (un HEVC en Chrome, por ejemplo): el backend
 * igual lo frena si pasa del máximo.
 */
function duracionDe(archivo: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(archivo);
    const v = document.createElement("video");
    const fin = (d: number | null) => {
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.preload = "metadata";
    v.onloadedmetadata = () => fin(Number.isFinite(v.duration) ? v.duration : null);
    v.onerror = () => fin(null);
    setTimeout(() => fin(null), 8000);
    v.src = url;
  });
}

const esVideo = (f: File) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(f.name);

/**
 * Clips ya editados afuera (CapCut, un recorte de YouTube) que entran al flujo
 * de siempre: revisión, programar en las cuatro redes, calendario y métricas
 * (ng-creator-be#181). Se sueltan o se eligen de a varios; cada uno sale tal
 * cual o se puede abrir en el editor. No cuentan para las horas del plan.
 */
export function ClipsSubidos({ marcaId, puedeOperar }: { marcaId: string; puedeOperar: boolean }) {
  const t = useTranslations("clipsSubidos");
  const input = useRef<HTMLInputElement>(null);
  const control = useRef<SubidaEpisodio | null>(null);
  const [cola, setCola] = useState<File[]>([]);
  const [subiendo, setSubiendo] = useState<Subiendo | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const { data, loading, refetch, startPolling, stopPolling } = useQuery(CLIPS_SUBIDOS, {
    variables: { marcaId },
    notifyOnNetworkStatusChange: false,
  });
  const lista: ClipSubido[] = data?.clipsSubidos ?? [];

  const [preparar] = useMutation(PREPARAR_SUBIDA_CLIP);
  const [renovar] = useMutation(RENOVAR_SUBIDA_EPISODIO);
  const [confirmar] = useMutation(CONFIRMAR_SUBIDA_EPISODIO);
  const [borrar] = useMutation(BORRAR_EPISODIO);

  // Consultar es lo que hace que el backend le pregunte a Bunny: seguido solo
  // mientras algo no esté listo.
  const hayPendientes = lista.some((c) => etapaDe(c) === "preparando");
  useEffect(() => {
    if (hayPendientes || subiendo) startPolling(8000);
    else stopPolling();
    return () => stopPolling();
  }, [hayPendientes, subiendo, startPolling, stopPolling]);

  useEffect(() => () => control.current?.detener(), []);

  // Los archivos elegidos suben de a uno, en orden.
  useEffect(() => {
    if (subiendo || !cola.length) return;
    const [archivo, ...resto] = cola;
    setCola(resto);
    void subir(archivo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cola, subiendo]);

  function encolar(archivos: File[]) {
    const videos = archivos.filter(esVideo);
    const otros = archivos.length - videos.length;
    setAvisos(otros ? [t("noEsVideo", { n: otros })] : []);
    if (videos.length) setCola((c) => [...c, ...videos]);
  }

  async function subir(archivo: File) {
    const dura = await duracionDe(archivo);
    if (dura !== null && dura > MAXIMO_SEG + 1) {
      setAvisos((a) => [...a, t("muyLargo", { nombre: archivo.name, dura: Math.round(dura), maximo: MAXIMO_SEG })]);
      return;
    }
    setSubiendo({ nombre: archivo.name, episodioId: null, pct: 0 });
    let cred: CredencialesTus & { episodio: { _id: string; titulo: string } };
    try {
      const r = await preparar({
        variables: { input: { marcaId, nombreArchivo: archivo.name, tamanoBytes: archivo.size, tipoArchivo: archivo.type || null } },
      });
      cred = r.data.prepararSubidaClip;
    } catch (e) {
      setAvisos((a) => [...a, `${archivo.name}: ${e instanceof Error ? e.message : t("errorSubir")}`]);
      setSubiendo(null);
      return;
    }
    const episodioId = cred.episodio._id;
    setSubiendo({ nombre: archivo.name, episodioId, pct: 0 });
    void refetch();
    try {
      control.current = await iniciarSubidaTus({
        archivo,
        titulo: cred.episodio.titulo,
        credenciales: cred,
        renovar: async () => (await renovar({ variables: { id: episodioId, marcaId } })).data.renovarSubidaEpisodio as CredencialesTus,
        onProgreso: (subidos, total) => setSubiendo((s) => s && { ...s, pct: total ? (subidos / total) * 100 : 0 }),
        onEstado: (estado) => {
          if (estado === "terminada") {
            void confirmar({ variables: { id: episodioId, marcaId } })
              .catch(() => undefined)
              .finally(() => {
                control.current = null;
                setSubiendo(null);
                void refetch();
              });
          } else if (estado === "error") {
            setAvisos((a) => [...a, `${archivo.name}: ${t("errorSubir")}`]);
            control.current = null;
            setSubiendo(null);
          }
        },
      });
    } catch (e) {
      setAvisos((a) => [...a, `${archivo.name}: ${e instanceof Error ? e.message : t("errorSubir")}`]);
      setSubiendo(null);
    }
  }

  async function quitar(c: ClipSubido) {
    if (!window.confirm(t("confirmarBorrar", { titulo: c.clip?.titulo ?? c.episodio.titulo }))) return;
    if (subiendo?.episodioId === c.episodio._id) {
      control.current?.detener();
      control.current = null;
      setSubiendo(null);
    }
    try {
      await borrar({ variables: { id: c.episodio._id, marcaId } });
    } finally {
      void refetch();
    }
  }

  const cuenta = (f: Filtro) => (f === "todos" ? lista.length : lista.filter((c) => etapaDe(c) === f).length);
  const visibles = filtro === "todos" ? lista : lista.filter((c) => etapaDe(c) === filtro);

  return (
    <div className="flex flex-col gap-8">
      {/* ---- Portada: qué es, cómo funciona y dónde se suelta ---- */}
      <section className="grid gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center">
        <div className="flex min-w-0 flex-col gap-4">
          <span className="w-fit rounded-full bg-ng-azul/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ng-azul">
            {t("etiqueta")}
          </span>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{t("titulo")}</h1>
          <p className="max-w-xl text-white/60">{t("descripcion")}</p>
          <ol className="mt-1 grid gap-3 sm:grid-cols-3">
            {(
              [
                { icono: UploadCloud, clave: "subi" },
                { icono: Send, clave: "programa" },
                { icono: ChartColumn, clave: "medi" },
              ] as const
            ).map(({ icono: Icono, clave }, i) => (
              <li key={clave} className="flex items-start gap-2.5 rounded-xl bg-black/25 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ng-azul text-ng-tinta">
                  <Icono size={15} aria-hidden />
                </span>
                <span className="min-w-0 text-sm">
                  <span className="block font-semibold">
                    {i + 1}. {t(`pasos.${clave}.titulo`)}
                  </span>
                  <span className="block text-xs text-white/50">{t(`pasos.${clave}.texto`)}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {puedeOperar ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastrando(false);
              encolar(Array.from(e.dataTransfer.files));
            }}
            className={`relative flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition ${
              arrastrando ? "border-ng-azul bg-ng-azul/10" : "border-white/20 bg-black/20"
            }`}
          >
            <input
              ref={input}
              type="file"
              accept="video/*,.mov"
              multiple
              className="hidden"
              onChange={(e) => {
                const archivos = Array.from(e.target.files ?? []);
                e.target.value = "";
                encolar(archivos);
              }}
            />
            {subiendo ? (
              <div className="w-full max-w-sm">
                <UploadCloud size={36} className="mx-auto text-ng-azul" aria-hidden />
                <p className="mt-3 truncate font-semibold">{t("subiendo", { nombre: subiendo.nombre })}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-ng-azul transition-[width]" style={{ width: `${subiendo.pct}%` }} />
                </div>
                <p className="mt-2 text-sm tabular-nums text-white/60">{Math.round(subiendo.pct)}%</p>
                {cola.length > 0 && <p className="mt-1 text-xs text-white/40">{t("enCola", { n: cola.length })}</p>}
              </div>
            ) : (
              <>
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ng-azul text-ng-tinta">
                  <UploadCloud size={28} aria-hidden />
                </span>
                <p className="text-lg font-bold">{t("soltar")}</p>
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-ng-tinta hover:bg-white/90"
                >
                  {t("elegir")}
                </button>
                <ul className="mt-1 flex flex-wrap justify-center gap-1.5 text-xs text-white/60">
                  {(["formatos", "duracion", "horas"] as const).map((k) => (
                    <li key={k} className="rounded-full border border-white/10 px-2.5 py-1">
                      {t(`chips.${k}`, { maximo: MAXIMO_SEG / 60 })}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-white/50">{t("soloVer")}</p>
        )}
      </section>

      {avisos.length > 0 && (
        <div className="flex flex-col gap-1 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          {avisos.map((a) => (
            <p key={a} className="text-sm text-red-300">
              {a}
            </p>
          ))}
        </div>
      )}

      {/* ---- Los clips subidos ---- */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{t("tusClips")}</h2>
          {lista.length > 0 && (
            <div role="tablist" className="flex flex-wrap gap-1.5">
              {FILTROS.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={filtro === f}
                  onClick={() => setFiltro(f)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    filtro === f ? "bg-ng-azul text-ng-tinta" : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {t(`filtros.${f}`)} <span className="tabular-nums opacity-60">{cuenta(f)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && !data ? (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-white/5" />
            ))}
          </ul>
        ) : visibles.length > 0 ? (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibles.map((c) => (
              <TarjetaClipSubido
                key={c.episodio._id}
                c={c}
                subiendoPct={subiendo?.episodioId === c.episodio._id ? subiendo.pct : null}
                puedeOperar={puedeOperar}
                onBorrar={() => void quitar(c)}
              />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-12 text-center">
            <Film size={28} className="text-white/30" aria-hidden />
            <p className="font-medium">{lista.length ? t("sinEnFiltro") : t("vacio")}</p>
            {!lista.length && <p className="max-w-sm text-sm text-white/50">{t("vacioDetalle")}</p>}
          </div>
        )}
      </section>
    </div>
  );
}

const ETIQUETA: Record<Etapa, string> = {
  preparando: "bg-sky-400/90 text-ng-tinta",
  listo: "bg-ng-azul text-ng-tinta",
  programado: "bg-white text-ng-tinta",
  publicado: "bg-ng-teal text-ng-tinta",
  fallo: "bg-red-500 text-white",
};

function TarjetaClipSubido({
  c,
  subiendoPct,
  puedeOperar,
  onBorrar,
}: {
  c: ClipSubido;
  subiendoPct: number | null;
  puedeOperar: boolean;
  onBorrar: () => void;
}) {
  const t = useTranslations("clipsSubidos");
  const { episodio: ep, clip } = c;
  const etapa = etapaDe(c);
  const base = clip ? `/episodios/${ep._id}/clips/${clip._id}` : null;
  const listo = etapa !== "preparando" && etapa !== "fallo";
  const pct = subiendoPct ?? (clip?.estadoRender === "RENDERIZANDO" ? clip.progresoRender ?? null : null);
  const etiqueta =
    subiendoPct !== null ? t("estados.subiendo") : etapa === "fallo" ? t("estados.fallo") : t(`estados.${etapa}`);

  return (
    <li className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-ng-azul/40">
      <div className="relative aspect-[9/16] bg-black">
        {clip?.urlPoster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clip.urlPoster}
            alt=""
            className={`h-full w-full ${clip.formato === "VERTICAL" ? "object-cover" : "object-contain"}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Film size={26} className="text-white/20" aria-hidden />
          </div>
        )}
        <span className={`absolute left-2 top-2 flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${ETIQUETA[etapa]}`}>
          {etapa === "publicado" && <CircleCheck size={11} aria-hidden />}
          {etiqueta}
        </span>
        {ep.duracionSeg ? (
          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] tabular-nums">{reloj(ep.duracionSeg)}</span>
        ) : null}
        {pct !== null && (
          <div className="absolute inset-x-2 bottom-9 h-1.5 overflow-hidden rounded-full bg-black/60">
            <div className="h-full rounded-full bg-ng-azul transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        )}
        {etapa === "fallo" && (
          <p className="absolute inset-x-2 bottom-9 rounded bg-black/80 p-1.5 text-[11px] leading-snug text-red-300">
            {ep.error || t("estados.falloCopia")}
          </p>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <p className="truncate text-sm font-semibold">{clip?.titulo ?? ep.titulo}</p>
        <p className="truncate text-[11px] text-white/40">
          {clip && !clip.usarOriginal ? t("editado") : ep.subidoPor?.nombre ? t("subidoPor", { nombre: ep.subidoPor.nombre }) : ""}
        </p>
        <div className="mt-auto flex items-center gap-1.5">
          {listo && base && puedeOperar && (
            <Link
              href={`${base}/publicar`}
              className="flex flex-1 items-center justify-center gap-1 rounded-md bg-ng-azul px-2 py-1.5 text-xs font-semibold text-ng-tinta hover:brightness-110"
            >
              <CalendarClock size={13} aria-hidden />
              {t("programar")}
            </Link>
          )}
          {base && ep.estado === "LISTO" && (
            <Link
              href={base}
              aria-label={t("editar")}
              title={t("editar")}
              className="flex items-center justify-center rounded-md border border-white/15 p-1.5 hover:bg-white/10"
            >
              <Pencil size={13} aria-hidden />
            </Link>
          )}
          {puedeOperar && (
            <button type="button" onClick={onBorrar} aria-label={t("borrar")} title={t("borrar")} className="ml-auto p-1.5 text-white/40 hover:text-red-400">
              <Trash2 size={14} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
