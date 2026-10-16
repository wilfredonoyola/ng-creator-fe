"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { CalendarClock, ChartColumn, CircleCheck, Film, Pencil, Send, Trash2, UploadCloud } from "lucide-react";
import { CLIPS_SUBIDOS } from "@/graphql/operations";
import { reloj } from "@/lib/momentos";
import { MAXIMO_SEG_CLIP_SUBIDO as MAXIMO_SEG, useSubirClips } from "./useSubirClips";

export interface ClipSubido {
  episodio: {
    _id: string;
    titulo: string;
    estado: "SUBIENDO" | "PROCESANDO" | "LISTO" | "FALLIDO";
    /** El episodio al que pertenece (be#228); null = de antes, sin episodio. */
    episodioPadreId?: string | null;
    createdAt?: string;
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
    estadoRevision?: "PENDIENTE" | "APROBADA" | "CAMBIOS_PEDIDOS" | null;
  } | null;
}

/** En qué anda cada clip, para el filtro y la etiqueta de la tarjeta. */
type Etapa = "preparando" | "listo" | "programado" | "publicado" | "fallo";
type Filtro = "todos" | Exclude<Etapa, "fallo">;
const FILTROS: Filtro[] = ["todos", "preparando", "listo", "programado", "publicado"];

export function etapaDe(c: ClipSubido): Etapa {
  if (c.episodio.estado === "FALLIDO" || c.clip?.estadoRender === "FALLIDO") return "fallo";
  if (c.clip?.estadoRender !== "LISTO") return "preparando";
  if (c.clip.publicacion?.publicadas) return "publicado";
  if (c.clip.publicacion?.programadas) return "programado";
  return "listo";
}

/**
 * Clips ya editados afuera (CapCut, un recorte de YouTube) que entran al flujo
 * de siempre: revisión, programar en las cuatro redes, calendario y métricas
 * (ng-creator-be#181). Se sueltan o se eligen de a varios; cada uno sale tal
 * cual o se puede abrir en el editor. No cuentan para las horas del plan.
 */
export function ClipsSubidos({ marcaId, puedeOperar }: { marcaId: string; puedeOperar: boolean }) {
  const t = useTranslations("clipsSubidos");
  const input = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const { data, loading, refetch, startPolling, stopPolling } = useQuery(CLIPS_SUBIDOS, {
    variables: { marcaId },
    notifyOnNetworkStatusChange: false,
  });
  const lista: ClipSubido[] = data?.clipsSubidos ?? [];
  const { encolar, borrar, subiendo, enCola, avisos } = useSubirClips({ marcaId, alCambiar: () => void refetch() });

  // Consultar es lo que hace que el backend le pregunte a Bunny: seguido solo
  // mientras algo no esté listo.
  const hayPendientes = lista.some((c) => etapaDe(c) === "preparando");
  useEffect(() => {
    if (hayPendientes || subiendo) startPolling(8000);
    else stopPolling();
    return () => stopPolling();
  }, [hayPendientes, subiendo, startPolling, stopPolling]);

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
                {enCola > 0 && <p className="mt-1 text-xs text-white/40">{t("enCola", { n: enCola })}</p>}
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
                onBorrar={() => void borrar(c)}
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

export function TarjetaClipSubido({
  c,
  subiendoPct,
  puedeOperar,
  onBorrar,
  extra,
}: {
  c: ClipSubido;
  subiendoPct: number | null;
  puedeOperar: boolean;
  onBorrar: () => void;
  /** Algo más al pie de la tarjeta (en Contenido: mover a un episodio). */
  extra?: ReactNode;
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
        <span className={`absolute left-1.5 top-1.5 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${ETIQUETA[etapa]}`}>
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
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2">
        <p className="truncate text-xs font-semibold">{clip?.titulo ?? ep.titulo}</p>
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
          {puedeOperar && (clip?.publicacion?.publicadas ?? 0) > 0 ? (
            <span title={t("noSeBorraPublicado")} className="ml-auto p-1.5 text-white/20" aria-label={t("noSeBorraPublicado")}>
              <Trash2 size={14} aria-hidden />
            </span>
          ) : puedeOperar && (
            <button type="button" onClick={onBorrar} aria-label={t("borrar")} title={t("borrar")} className="ml-auto p-1.5 text-white/40 hover:text-red-400">
              <Trash2 size={14} aria-hidden />
            </button>
          )}
        </div>
        {extra}
      </div>
    </li>
  );
}
