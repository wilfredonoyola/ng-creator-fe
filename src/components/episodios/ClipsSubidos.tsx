"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { CalendarClock, Film, Pencil, Trash2, Upload } from "lucide-react";
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

/**
 * Clips ya editados afuera (CapCut, un recorte de YouTube) que entran al flujo
 * de siempre: revisión, programar en las cuatro redes, calendario y métricas
 * (ng-creator-be#181). Se suben de a varios; cada uno sale tal cual o se puede
 * abrir en el editor. No cuentan para las horas del plan.
 */
export function ClipsSubidos({ marcaId, puedeOperar }: { marcaId: string; puedeOperar: boolean }) {
  const t = useTranslations("clipsSubidos");
  const input = useRef<HTMLInputElement>(null);
  const control = useRef<SubidaEpisodio | null>(null);
  const [cola, setCola] = useState<File[]>([]);
  const [subiendo, setSubiendo] = useState<Subiendo | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);

  const { data, refetch, startPolling, stopPolling } = useQuery(CLIPS_SUBIDOS, {
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
  const hayPendientes = lista.some((c) => c.episodio.estado !== "FALLIDO" && (!c.clip || c.clip.estadoRender !== "LISTO"));
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

  return (
    <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{t("titulo")}</h2>
          <p className="mt-1 max-w-xl text-sm text-white/50">{t("descripcion")}</p>
        </div>
        {puedeOperar && (
          <>
            <input
              ref={input}
              type="file"
              accept="video/*,.mov"
              multiple
              className="hidden"
              onChange={(e) => {
                const archivos = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (archivos.length) {
                  setAvisos([]);
                  setCola((c) => [...c, ...archivos]);
                }
              }}
            />
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex items-center gap-2 rounded-lg bg-ng-azul px-4 py-2 text-sm font-semibold text-ng-tinta hover:brightness-110"
            >
              <Upload size={16} aria-hidden />
              {t("subir")}
            </button>
          </>
        )}
      </div>

      {subiendo && (
        <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="truncate">{t("subiendo", { nombre: subiendo.nombre })}</span>
            <span className="shrink-0 tabular-nums text-white/60">{Math.round(subiendo.pct)}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-ng-azul transition-[width]" style={{ width: `${subiendo.pct}%` }} />
          </div>
          {cola.length > 0 && <p className="mt-2 text-xs text-white/40">{t("enCola", { n: cola.length })}</p>}
        </div>
      )}
      {avisos.map((a) => (
        <p key={a} className="mt-3 text-sm text-red-400">
          {a}
        </p>
      ))}

      {lista.length > 0 ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((c) => (
            <FilaClipSubido key={c.episodio._id} c={c} puedeOperar={puedeOperar} onBorrar={() => void quitar(c)} />
          ))}
        </ul>
      ) : (
        !subiendo && <p className="mt-4 text-sm text-white/40">{t("vacio")}</p>
      )}
    </section>
  );
}

function FilaClipSubido({ c, puedeOperar, onBorrar }: { c: ClipSubido; puedeOperar: boolean; onBorrar: () => void }) {
  const t = useTranslations("clipsSubidos");
  const { episodio: ep, clip } = c;
  const listo = clip?.estadoRender === "LISTO";
  const poster = clip?.urlPoster ?? null;
  const estado = (() => {
    if (ep.estado === "FALLIDO") return { texto: ep.error || t("estados.fallo"), clase: "text-red-400" };
    if (clip?.estadoRender === "FALLIDO") return { texto: t("estados.falloCopia"), clase: "text-red-400" };
    if (ep.estado === "SUBIENDO") return { texto: t("estados.subiendo"), clase: "text-white/50" };
    if (!listo) {
      const pct = clip?.progresoRender ? ` ${clip.progresoRender}%` : "";
      return { texto: `${t("estados.preparando")}${pct}`, clase: "text-sky-300" };
    }
    if (clip?.publicacion?.publicadas) return { texto: t("estados.publicado"), clase: "text-ng-teal" };
    if (clip?.publicacion?.programadas) return { texto: t("estados.programado"), clase: "text-ng-teal" };
    return { texto: t("estados.listo"), clase: "text-ng-teal" };
  })();
  const base = clip ? `/episodios/${ep._id}/clips/${clip._id}` : null;

  return (
    <li className="flex min-w-0 gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/5">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="h-full w-full object-cover" />
        ) : (
          <Film size={20} className="text-white/30" aria-hidden />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate font-medium">{clip?.titulo ?? ep.titulo}</p>
        <p className={`text-xs ${estado.clase}`}>{estado.texto}</p>
        <p className="text-xs text-white/40">
          {ep.duracionSeg ? reloj(ep.duracionSeg) : ""}
          {ep.subidoPor?.nombre ? ` · ${t("subidoPor", { nombre: ep.subidoPor.nombre })}` : ""}
          {clip && !clip.usarOriginal ? ` · ${t("editado")}` : ""}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          {listo && base && puedeOperar && (
            <Link href={`${base}/publicar`} className="flex items-center gap-1 rounded-md bg-ng-azul px-2.5 py-1 text-xs font-semibold text-ng-tinta hover:brightness-110">
              <CalendarClock size={13} aria-hidden />
              {t("programar")}
            </Link>
          )}
          {base && ep.estado === "LISTO" && (
            <Link href={base} className="flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1 text-xs hover:bg-white/10">
              <Pencil size={13} aria-hidden />
              {t("editar")}
            </Link>
          )}
          {puedeOperar && (
            <button type="button" onClick={onBorrar} aria-label={t("borrar")} title={t("borrar")} className="ml-auto p-1 text-white/40 hover:text-red-400">
              <Trash2 size={14} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
