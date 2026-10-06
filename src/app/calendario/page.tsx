"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  CANCELAR_PUBLICACION,
  CLIPS_LISTOS_SIN_PROGRAMAR,
  EDITAR_PUBLICACION,
  PUBLICACIONES_DE_MARCA,
  REPROGRAMAR_PUBLICACION,
} from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { IconoRed, Poster } from "@/components/IconoRed";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";
import {
  ESTADOS_PUBLICACION,
  REDES,
  aInputLocal,
  diaYHora,
  horaCorta,
  zonaHoraria,
  type EstadoPublicacion,
  type Publicacion,
} from "@/lib/publicaciones";
import type { Red } from "@/lib/upload-post";
import { fechaCompleta, tiempoRelativo, useAhora } from "@/lib/time";
import type { Autoria } from "@/components/episodios/TomarClip";
import { ElegirPortadaClip } from "@/components/episodios/ElegirPortadaClip";
import { ComoSaleEnCadaRed } from "@/components/episodios/ComoSaleEnCadaRed";
import { DESCRIPCION_MAX, TITULO_YOUTUBE_MAX, comoSaleEnCadaRed } from "@/lib/destinos";

interface PublicacionCalendario extends Publicacion {
  /** El MP4 que sale en esta red (en Facebook puede ser la versión corta). */
  mediaUrl?: string | null;
  /** El cuadro de portada elegido; null = la automática de cada red. */
  portadaSeg?: number | null;
  /** Lo propio de la red: en YouTube, `titulo`. */
  ajustes?: { titulo?: string } | null;
  /** El clip de la publicación; null en las de expedientes o si se borró. */
  clip?: {
    _id: string;
    episodioId: string;
    titulo: string;
    urlPoster?: string | null;
    urlVideo?: string | null;
    desdeSeg?: number | null;
    hastaSeg?: number | null;
    duracionEfectivaSeg?: number | null;
    editadoPor?: { nombre: string } | null;
    tomadoPor?: { nombre: string } | null;
  } | null;
}

interface ClipListo {
  _id: string;
  episodioId: string;
  titulo: string;
  desdeSeg: number;
  hastaSeg: number;
  urlPoster?: string | null;
  listoPor?: Autoria | null;
}

const FILTROS = ["FACEBOOK", "INSTAGRAM", "YOUTUBE", "TIKTOK"] as const;
const MARGEN_MS = 60_000;
const REFETCH = ["PublicacionesDeMarca", "ClipsListosSinProgramar", "ClipsDeEpisodio", "ClipEpisodio"];

/**
 * Las publicaciones del mismo clip a la misma hora: una tarjeta, con un logo
 * por red. Es como se programan (un clip, varias redes, una hora), y así se
 * quita una red sin tocar las otras. Lo que no es de un clip va solo.
 */
interface Grupo {
  clave: string;
  pubs: PublicacionCalendario[];
}

function agrupar(pubs: PublicacionCalendario[]): Grupo[] {
  const grupos = new Map<string, Grupo>();
  for (const p of pubs) {
    const minuto = Math.floor(new Date(p.publicarEn).getTime() / 60_000);
    const clave = p.clip ? `${p.clip._id}@${minuto}` : p._id;
    const g = grupos.get(clave);
    if (g) g.pubs.push(p);
    else grupos.set(clave, { clave, pubs: [p] });
  }
  return Array.from(grupos.values());
}

/**
 * El calendario de la marca (#70, ng-creator-be#63): qué está programado y qué
 * ya salió, semana por semana, y los clips que alguien marcó listos y nadie
 * programó todavía.
 *
 * Las horas son las del navegador, y se dice cuál es: el equipo puede estar en
 * países distintos. Mover una publicación es elegir la hora nueva, no
 * arrastrarla; y solo se mueven las programadas: lo publicado ya salió.
 */
export default function CalendarioPage() {
  const t = useTranslations("calendario");
  const locale = useLocale();
  const { activa } = useMarcaActiva();
  const { puedeOperar } = useSesion();
  const marcaId = activa?._id ?? "";
  const opera = puedeOperar(activa?._id);
  // Null hasta montar: el lunes depende de la zona del navegador, no de la del servidor.
  const [inicio, setInicio] = useState<Date | null>(null);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [moviendo, setMoviendo] = useState<PublicacionCalendario[] | null>(null);
  /**
   * La tarjeta abierta en el detalle, por los ids de sus publicaciones y no por
   * la clave: la clave lleva la hora, y el detalle tiene que seguir abierto
   * (y al día con cada consulta) después de cambiarla o de quitar una red.
   */
  const [abierta, setAbierta] = useState<string[] | null>(null);
  const [zona, setZona] = useState("");
  const ahora = useAhora();

  useEffect(() => {
    setInicio(lunesDe(new Date()));
    setZona(zonaHoraria(locale));
  }, [locale]);

  const hasta = inicio ? sumarDias(inicio, 7) : null;
  const pubsQ = useQuery(PUBLICACIONES_DE_MARCA, {
    variables: { marcaId, desde: inicio?.toISOString(), hasta: hasta?.toISOString() },
    skip: !activa || !inicio,
    pollInterval: 30_000,
    errorPolicy: "all",
  });
  const listosQ = useQuery(CLIPS_LISTOS_SIN_PROGRAMAR, {
    variables: { marcaId },
    skip: !activa,
    pollInterval: 60_000,
    errorPolicy: "all",
  });

  const todas: PublicacionCalendario[] = useMemo(() => pubsQ.data?.publicacionesDeMarca ?? [], [pubsQ.data]);
  const listos: ClipListo[] = listosQ.data?.clipsListosSinProgramar ?? [];
  const visibles = useMemo(() => (filtro ? todas.filter((p) => p.red === filtro) : todas), [todas, filtro]);

  const dias = useMemo(() => {
    if (!inicio) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const dia = sumarDias(inicio, i);
      const desde = dia.getTime();
      const fin = sumarDias(dia, 1).getTime();
      const pubs = visibles
        .filter((p) => {
          if (p.estado === "CANCELADA") return false;
          const ms = new Date(p.publicarEn).getTime();
          return ms >= desde && ms < fin;
        })
        .sort((a, b) => new Date(a.publicarEn).getTime() - new Date(b.publicarEn).getTime());
      return { dia, grupos: agrupar(pubs) };
    });
  }, [inicio, visibles]);

  // Del total y no de lo filtrado: el detalle muestra todas las redes del clip.
  const grupoAbierto = useMemo(() => {
    if (!abierta) return null;
    return (
      agrupar(todas.filter((p) => p.estado !== "CANCELADA")).find((g) => g.pubs.some((p) => abierta.includes(p._id))) ??
      null
    );
  }, [abierta, todas]);

  const programadas = visibles.filter((p) => p.estado === "PROGRAMADA" || p.estado === "AGENDADA_EN_RED").length;
  const publicadas = visibles.filter((p) => p.estado === "PUBLICADA").length;
  const fallidas = visibles.filter((p) => p.estado === "FALLIDA").length;
  const esEstaSemana = inicio ? lunesDe(new Date(ahora)).getTime() === inicio.getTime() : true;

  return (
    <DashboardLayout>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("titulo")}</h1>
          <p className="mt-1 text-sm text-white/50">
            {activa ? t("subtituloEn", { marca: activa.nombre }) : t("subtitulo")}
          </p>
        </div>
        {zona && <p className="text-xs text-white/40">{t("horasDe", { zona })}</p>}
      </div>

      <ListosParaProgramar listos={listos} opera={opera} cargando={listosQ.loading && !listosQ.data} />

      {/* Semana */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => inicio && setInicio(sumarDias(inicio, -7))}
            aria-label={t("semanaAnterior")}
            className="rounded-lg border border-white/15 p-1.5 text-white/70 hover:bg-white/5"
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button
            onClick={() => setInicio(lunesDe(new Date()))}
            disabled={esEstaSemana}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5 disabled:opacity-40"
          >
            {t("hoy")}
          </button>
          <button
            onClick={() => inicio && setInicio(sumarDias(inicio, 7))}
            aria-label={t("semanaSiguiente")}
            className="rounded-lg border border-white/15 p-1.5 text-white/70 hover:bg-white/5"
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
        <p className="font-medium">{inicio ? rangoDeSemana(inicio, locale) : ""}</p>
        <p className="text-xs text-white/40">
          {t("programadas", { n: programadas })} · {t("publicadas", { n: publicadas })}
          {fallidas ? ` · ${t("fallidas", { n: fallidas })}` : ""}
        </p>
      </div>

      {/* Filtro por red */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Chip activo={!filtro} onClick={() => setFiltro(null)}>
          {t("todas")}
        </Chip>
        {FILTROS.map((r) => (
          <Chip key={r} activo={filtro === r} onClick={() => setFiltro(filtro === r ? null : r)}>
            <IconoRed red={r} chico />
            {REDES[r].nombre}
          </Chip>
        ))}
      </div>

      {pubsQ.error && !pubsQ.data && (
        <p className="mb-4 text-sm text-red-400">{t("errorCargar", { mensaje: pubsQ.error.message })}</p>
      )}

      {/* En el teléfono, una lista por día; en pantallas anchas, las siete columnas. */}
      <div className="space-y-4 xl:grid xl:grid-cols-7 xl:gap-2 xl:space-y-0">
        {dias.map(({ dia, grupos }) => {
          const hoy = dia.toDateString() === new Date(ahora).toDateString();
          return (
            <section
              key={dia.toISOString()}
              className={`min-w-0 rounded-xl border p-2 xl:min-h-[12rem] ${
                hoy ? "border-ng-azul/50 bg-ng-azul/[0.04]" : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <h2 className="mb-2 flex items-baseline gap-2 px-1 text-sm">
                <span className={`font-semibold capitalize ${hoy ? "text-ng-celeste" : ""}`}>
                  {dia.toLocaleDateString(locale, { weekday: "long" })}
                </span>
                <span className="text-white/40">{dia.toLocaleDateString(locale, { day: "numeric", month: "short" })}</span>
                {hoy && <span className="ml-auto rounded-full bg-ng-azul/20 px-1.5 text-[10px] text-ng-celeste">{t("hoy")}</span>}
              </h2>
              {grupos.length === 0 ? (
                <p className="px-1 pb-1 text-xs text-white/25">{pubsQ.loading && !pubsQ.data ? "…" : t("nada")}</p>
              ) : (
                <ul className="space-y-2">
                  {grupos.map((g) => (
                    <TarjetaGrupo
                      key={g.clave}
                      pubs={g.pubs}
                      opera={opera}
                      onMover={() => setMoviendo(g.pubs.filter((p) => p.estado === "PROGRAMADA"))}
                      onAbrir={() => setAbierta(g.pubs.map((p) => p._id))}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {grupoAbierto && (
        <DetalleAgendada
          pubs={grupoAbierto.pubs}
          opera={opera}
          tapado={!!moviendo}
          onMover={() => setMoviendo(grupoAbierto.pubs.filter((p) => p.estado === "PROGRAMADA"))}
          onCerrar={() => setAbierta(null)}
        />
      )}
      {moviendo && moviendo.length > 0 && <CambiarHora pubs={moviendo} onCerrar={() => setMoviendo(null)} />}
    </DashboardLayout>
  );
}

/** Los clips que alguien marcó listos y nadie programó: lo que le queda a quien programa. */
function ListosParaProgramar({ listos, opera, cargando }: { listos: ClipListo[]; opera: boolean; cargando: boolean }) {
  const t = useTranslations("calendario.listos");
  const locale = useLocale();
  if (cargando) return null;
  return (
    <section className="mb-6 rounded-xl border border-ng-teal/25 bg-ng-teal/[0.03] p-3">
      <h2 className="mb-2 text-sm font-semibold">
        {t("titulo")}
        {listos.length > 0 && <span className="ml-2 rounded-full bg-ng-teal/15 px-2 text-xs text-ng-teal">{listos.length}</span>}
      </h2>
      {listos.length === 0 ? (
        <p className="text-xs text-white/40">
          {t("vacio")}
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {listos.map((c) => (
            <li key={c._id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2">
              <Poster url={c.urlPoster} className="h-16 w-9" />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/episodios/${c.episodioId}/clips/${c._id}`}
                  className="line-clamp-2 text-sm font-medium hover:underline"
                >
                  {c.titulo}
                </Link>
                {c.listoPor && (
                  <p className="text-xs text-white/45" title={fechaCompleta(c.listoPor.en, locale)}>
                    {t("listoPor", { nombre: c.listoPor.nombre, tiempo: tiempoRelativo(c.listoPor.en, undefined, locale) })}
                  </p>
                )}
              </div>
              {opera && (
                <Link
                  href={`/episodios/${c.episodioId}/clips/${c._id}/publicar`}
                  className="shrink-0 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:brightness-110"
                >
                  {t("programar")}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TarjetaGrupo({
  pubs,
  opera,
  onMover,
  onAbrir,
}: {
  pubs: PublicacionCalendario[];
  opera: boolean;
  onMover: () => void;
  /** Abre el detalle: la miniatura y el título de una tarjeta de clip. */
  onAbrir: () => void;
}) {
  const t = useTranslations("calendario");
  const locale = useLocale();
  const p = pubs[0];
  const hora = new Date(p.publicarEn);
  const titulo = p.clip?.titulo ?? (p.descripcion?.split("\n")[0].trim() || t("tarjeta.sinDescripcion"));
  // Quién editó el clip: el último que lo guardó, o quien lo tomó si nadie lo editó todavía.
  const editor = p.clip?.editadoPor?.nombre ?? p.clip?.tomadoPor?.nombre;
  const enlace = p.clip
    ? `/episodios/${p.clip.episodioId}/clips/${p.clip._id}/publicar`
    : p.expedienteId
      ? `/publicados/${p.expedienteId}`
      : null;
  const hayProgramadas = pubs.some((x) => x.estado === "PROGRAMADA");

  return (
    <li className="min-w-0 rounded-lg border border-white/10 bg-ng-tarjeta p-2">
      <div className="flex gap-2">
        {p.clip ? (
          <button onClick={onAbrir} aria-label={t("detalle.titulo")} className="shrink-0 rounded-lg hover:brightness-125">
            <Poster url={p.clip.urlPoster ?? p.portadaUrl} className="h-16 w-9" />
          </button>
        ) : (
          <Poster url={p.portadaUrl} className="h-16 w-9" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs">
            <span className="font-semibold tabular-nums" title={fechaCompleta(hora.toISOString(), locale)}>
              {horaCorta(hora, locale)}
            </span>
          </p>
          {p.clip ? (
            <button
              onClick={onAbrir}
              className="mt-0.5 line-clamp-2 break-words text-left text-sm leading-snug hover:underline"
            >
              {titulo}
            </button>
          ) : enlace ? (
            <Link href={enlace} className="mt-0.5 line-clamp-2 break-words text-sm leading-snug hover:underline">
              {titulo}
            </Link>
          ) : (
            <p className="mt-0.5 line-clamp-2 break-words text-sm leading-snug">{titulo}</p>
          )}
          {editor && <p className="truncate text-[11px] text-white/55">{t("tarjeta.editadoPor", { nombre: editor })}</p>}
        </div>
      </div>
      <LogosDeRedes pubs={pubs} opera={opera} />
      {opera && hayProgramadas && (
        <button onClick={onMover} className="mt-1.5 text-[11px] text-white/55 hover:text-white hover:underline">
          {t("tarjeta.cambiarHora")}
        </button>
      )}
    </li>
  );
}

/** Las cuatro redes, siempre en este orden: encendida la que tiene publicación del clip a esa hora. */
const ORDEN_REDES = ["TIKTOK", "YOUTUBE", "INSTAGRAM", "FACEBOOK"] as const;

/**
 * Una fila de logos en vez de una fila por publicación: se ve de un vistazo en
 * qué redes sale el clip, y no se desborda de la columna. El estado va en el
 * logo mismo: ✓ verde publicada, punto rojo fallida, pulso subiendo. Las
 * canceladas ya vienen afuera. Si hay otras redes (no debería), van al final.
 */
function LogosDeRedes({ pubs, opera }: { pubs: PublicacionCalendario[]; opera: boolean }) {
  const otras = Array.from(new Set(pubs.map((x) => x.red))).filter((r) => !(ORDEN_REDES as readonly string[]).includes(r));
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {[...ORDEN_REDES, ...otras].map((r) => (
        <LogoRed key={r} red={r} pubs={pubs.filter((x) => x.red === r)} opera={opera} />
      ))}
    </div>
  );
}

function LogoRed({ red, pubs, opera }: { red: string; pubs: PublicacionCalendario[]; opera: boolean }) {
  const t = useTranslations("calendario");
  const [cancelar, { loading: cancelando }] = useMutation(CANCELAR_PUBLICACION, { refetchQueries: REFETCH });
  const [error, setError] = useState<string | null>(null);
  const nombre = REDES[red]?.nombre ?? red;

  if (!pubs.length) {
    return (
      <span title={t("tarjeta.apagada", { red: nombre })} className="opacity-25 grayscale">
        <IconoRed red={red} tamano="h-[22px] w-[22px] text-[10px]" />
      </span>
    );
  }

  const fallida = pubs.find((x) => x.estado === "FALLIDA");
  const publicada = pubs.find((x) => x.estado === "PUBLICADA");
  const programadas = pubs.filter((x) => x.estado === "PROGRAMADA");
  const reintento = programadas.find((x) => x.error);
  const subiendo = pubs.some((x) => x.estado === "SUBIENDO" || x.estado === "PROCESANDO");
  const quitable = opera && programadas.length > 0;
  const estado = (e: EstadoPublicacion) => (e in ESTADOS_PUBLICACION ? t(`estados.${e}`) : e);
  // El detalle de cada publicación de la red, con el motivo si falló: es lo que hay que leer para arreglarlo.
  const detalle = pubs
    .map((x) => {
      const base = `${nombre}${x.cuentaNombre ? ` · ${x.cuentaNombre}` : ""} · ${estado(x.estado)}`;
      if (!x.error || (x.estado !== "FALLIDA" && x.estado !== "PROGRAMADA")) return base;
      return `${base}\n${x.estado === "PROGRAMADA" ? t("tarjeta.reintentando") : ""}${x.error}`;
    })
    .join("\n");

  async function quitar() {
    if (!window.confirm(t("tarjeta.confirmarQuitar", { red: nombre }))) return;
    setError(null);
    try {
      // Con duplicados se quitan todas las programadas de la red: es "sacar TikTok del clip".
      for (const x of programadas) await cancelar({ variables: { marcaId: x.marcaId, id: x._id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("tarjeta.errorCancelar"));
    }
  }

  const logo = (
    <span className={`relative block ${subiendo ? "animate-pulse" : ""}`}>
      <IconoRed red={red} tamano="h-[22px] w-[22px] text-[10px]" />
      {fallida ? (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-ng-tarjeta" />
      ) : publicada ? (
        <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold leading-none text-white ring-2 ring-ng-tarjeta">
          ✓
        </span>
      ) : reintento ? (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-ng-tarjeta" />
      ) : null}
      {pubs.length > 1 && (
        <span className="absolute -bottom-1 -right-1.5 rounded-full bg-black/80 px-0.5 text-[8px] font-semibold leading-tight text-white">
          ×{pubs.length}
        </span>
      )}
    </span>
  );

  return (
    <span className="group relative" title={detalle}>
      {publicada?.permalink ? (
        <a href={publicada.permalink} target="_blank" rel="noreferrer" aria-label={t("tarjeta.verEn", { red: nombre })}>
          {logo}
        </a>
      ) : (
        <span tabIndex={quitable ? 0 : undefined} aria-label={detalle} className="block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ng-azul">
          {logo}
        </span>
      )}
      {quitable && (
        <button
          onClick={() => void quitar()}
          disabled={cancelando}
          aria-label={t("tarjeta.quitarRed", { red: nombre })}
          title={t("tarjeta.quitarRed", { red: nombre })}
          className="absolute -right-1.5 -top-1.5 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-neutral-800 text-[8px] leading-none text-white/80 opacity-0 ring-1 ring-white/30 transition hover:bg-red-500 hover:text-white focus:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 disabled:opacity-100"
        >
          {cancelando ? "…" : "✕"}
        </button>
      )}
      {error && (
        <span role="alert" title={error} className="absolute left-0 top-full z-10 mt-0.5 whitespace-nowrap text-[10px] text-red-400">
          {t("tarjeta.errorCancelar")}
        </span>
      )}
    </span>
  );
}

/**
 * El detalle de una tarjeta de clip: el video que sale, cuándo, quién lo
 * programó y cómo va en cada red. Mientras quede alguna red PROGRAMADA, se
 * edita acá mismo: la descripción (una para todas), el título de YouTube, la
 * portada y la hora. Lo que ya salió es solo para ver.
 */
function DetalleAgendada({
  pubs,
  opera,
  tapado,
  onMover,
  onCerrar,
}: {
  pubs: PublicacionCalendario[];
  opera: boolean;
  /** Hay otro diálogo encima (Cambiar hora): Escape es de ese. */
  tapado: boolean;
  onMover: () => void;
  onCerrar: () => void;
}) {
  const t = useTranslations("calendario");
  const locale = useLocale();
  const p = pubs[0];
  const clip = p.clip;
  const hora = new Date(p.publicarEn);
  const programadas = pubs.filter((x) => x.estado === "PROGRAMADA");
  const editable = opera && programadas.length > 0;
  const todoSalio = pubs.every((x) => x.estado === "PUBLICADA");
  // El MP4 que sale: el de la cola (en Facebook puede ser la versión corta, así que se prefiere otra red).
  const videoUrl = pubs.find((x) => x.red !== "FACEBOOK" && x.mediaUrl)?.mediaUrl ?? clip?.urlVideo ?? p.mediaUrl ?? null;
  const poster = clip?.urlPoster ?? p.portadaUrl ?? undefined;
  const quien = pubs.find((x) => x.creadoPor?.nombre)?.creadoPor?.nombre;
  const enlaceClip = clip ? `/episodios/${clip.episodioId}/clips/${clip._id}/publicar` : null;
  const otras = Array.from(new Set(pubs.map((x) => x.red))).filter((r) => !(ORDEN_REDES as readonly string[]).includes(r));

  useEffect(() => {
    if (tapado) return;
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar, tapado]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal
        aria-label={t(todoSalio ? "detalle.tituloSalio" : "detalle.titulo")}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-white/10 bg-ng-elevada p-4 sm:rounded-2xl sm:p-5"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{t(todoSalio ? "detalle.tituloSalio" : "detalle.titulo")}</h2>
          <button
            onClick={onCerrar}
            aria-label={t("detalle.cerrar")}
            className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="mx-auto w-full max-w-[220px] shrink-0 sm:mx-0">
            {videoUrl ? (
              <video
                src={videoUrl}
                poster={poster}
                controls
                playsInline
                preload="metadata"
                className="aspect-[9/16] w-full rounded-xl bg-black object-contain"
              />
            ) : (
              <Poster url={poster} className="aspect-[9/16] w-full rounded-xl" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-1">
              <p className="font-medium">{clip?.titulo ?? (p.descripcion?.split("\n")[0].trim() || t("tarjeta.sinDescripcion"))}</p>
              <p className="text-sm text-white/80" title={fechaCompleta(hora.toISOString(), locale)}>
                {t(todoSalio ? "detalle.salio" : "detalle.sale", { cuando: diaYHora(hora, locale) })}
              </p>
              <p className="text-xs text-white/40">{t("detalle.horaDe", { zona: zonaHoraria(locale) })}</p>
              {quien && <p className="text-xs text-white/55">{t("detalle.programadoPor", { nombre: quien })}</p>}
              {enlaceClip && (
                <Link href={enlaceClip} className="inline-block text-xs text-ng-celeste hover:underline">
                  {t("detalle.abrirClip")}
                </Link>
              )}
            </div>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">{t("detalle.redes")}</h3>
              <ul className="space-y-1.5">
                {[...ORDEN_REDES, ...otras].map((r) => (
                  <FilaRed key={r} red={r} pubs={pubs.filter((x) => x.red === r)} opera={opera} />
                ))}
              </ul>
            </section>

            {editable ? (
              <EditarAgendada
                programadas={programadas}
                videoUrl={videoUrl}
                duracionClip={clip ? clip.duracionEfectivaSeg ?? (clip.hastaSeg ?? 0) - (clip.desdeSeg ?? 0) : 0}
                enlaceClip={enlaceClip}
                onMover={onMover}
              />
            ) : (
              <section className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-white/45">{t("detalle.descripcion")}</h3>
                <p className="whitespace-pre-line break-words text-sm text-white/70">
                  {p.descripcion || t("detalle.sinDescripcion")}
                </p>
                {todoSalio && <p className="pt-1 text-xs text-white/40">{t("detalle.soloLectura")}</p>}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Una red en el detalle: su logo (con ✕ para quitarla, como en la tarjeta), la cuenta y cómo va. */
function FilaRed({ red, pubs, opera }: { red: string; pubs: PublicacionCalendario[]; opera: boolean }) {
  const t = useTranslations("calendario");
  const nombre = REDES[red]?.nombre ?? red;
  const estado = (e: EstadoPublicacion) => (e in ESTADOS_PUBLICACION ? t(`estados.${e}`) : e);
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span className="pt-0.5">
        <LogoRed red={red} pubs={pubs} opera={opera} />
      </span>
      <div className="min-w-0 flex-1">
        {pubs.length === 0 ? (
          <p className="text-white/35">
            {nombre} · {t("detalle.noSale")}
          </p>
        ) : (
          pubs.map((x) => (
            <div key={x._id} className="min-w-0">
              <p className="truncate">
                <span className="font-medium">{nombre}</span>
                {x.cuentaNombre ? <span className="text-white/50"> · {x.cuentaNombre}</span> : null}
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${ESTADOS_PUBLICACION[x.estado]?.clase ?? "bg-white/10 text-white/70"}`}
                >
                  {estado(x.estado)}
                </span>
              </p>
              {x.estado === "PUBLICADA" && x.permalink && (
                <a href={x.permalink} target="_blank" rel="noreferrer" className="text-xs text-ng-celeste hover:underline">
                  {t("detalle.verEn", { red: nombre })}
                </a>
              )}
              {x.estado === "FALLIDA" && x.error && <p className="break-words text-xs text-red-400">{x.error}</p>}
              {x.estado === "PROGRAMADA" && x.error && (
                <p className="break-words text-xs text-amber-300">{t("detalle.reintentando", { error: x.error })}</p>
              )}
            </div>
          ))
        )}
      </div>
    </li>
  );
}

/**
 * Lo que se edita de las programadas del grupo. Una descripción para todas
 * (como al programar), el título en YouTube y la portada; se guarda con una
 * llamada por publicación, y si una red rechaza, las otras quedan guardadas y
 * se dice cuál falló.
 */
function EditarAgendada({
  programadas,
  videoUrl,
  duracionClip,
  enlaceClip,
  onMover,
}: {
  programadas: PublicacionCalendario[];
  videoUrl: string | null;
  duracionClip: number;
  enlaceClip: string | null;
  onMover: () => void;
}) {
  const t = useTranslations("calendario.detalle");
  const [editar] = useMutation(EDITAR_PUBLICACION, { refetchQueries: REFETCH });
  const inicial = programadas[0];
  const youtube = programadas.find((x) => x.red === "YOUTUBE");
  const [descripcion, setDescripcion] = useState(inicial.descripcion ?? "");
  const [tituloYoutube, setTituloYoutube] = useState(youtube?.ajustes?.titulo ?? "");
  const [portadaSeg, setPortadaSeg] = useState<number | null>(inicial.portadaSeg ?? null);
  const [duracionVideo, setDuracionVideo] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; textos: string[] } | null>(null);

  const descripcionLarga = descripcion.trim().length > DESCRIPCION_MAX;
  const tituloVacio = !!youtube && !tituloYoutube.trim();
  const comoSale = comoSaleEnCadaRed(
    programadas.map((x) => ({ red: x.red as Red })),
    descripcion.trim(),
    tituloYoutube.trim(),
  );
  // Sin clip (no debería) la duración la da el propio video al cargar.
  const duracion = duracionClip > 0 ? duracionClip : duracionVideo;

  /** Lo que cambia en una publicación: solo eso se manda. */
  function cambiosDe(x: PublicacionCalendario): Record<string, unknown> | null {
    const v: Record<string, unknown> = {};
    if (descripcion.trim() !== (x.descripcion ?? "").trim()) v.descripcion = descripcion.trim();
    if (x.red === "YOUTUBE" && tituloYoutube.trim() !== (x.ajustes?.titulo ?? "")) v.tituloYoutube = tituloYoutube.trim();
    if (portadaSeg !== (x.portadaSeg ?? null)) {
      if (portadaSeg == null) v.quitarPortada = true;
      else v.portadaSeg = portadaSeg;
    }
    return Object.keys(v).length ? v : null;
  }

  async function guardar() {
    setAviso(null);
    const pendientes = programadas.map((x) => [x, cambiosDe(x)] as const).filter(([, v]) => v);
    if (!pendientes.length) {
      setAviso({ tono: "ok", textos: [t("sinCambios")] });
      return;
    }
    setGuardando(true);
    const fallas: string[] = [];
    // Una por red: si una rechaza (el límite de TikTok, los < > de YouTube), las otras se guardan igual.
    for (const [x, v] of pendientes) {
      try {
        await editar({ variables: { marcaId: x.marcaId, id: x._id, ...v } });
      } catch (e) {
        fallas.push(
          t("errorRed", { red: REDES[x.red]?.nombre ?? x.red, mensaje: e instanceof Error ? e.message : t("noSePudo") }),
        );
      }
    }
    setGuardando(false);
    setAviso(fallas.length ? { tono: "error", textos: fallas } : { tono: "ok", textos: [t("guardado")] });
  }

  return (
    <section className="space-y-3 border-t border-white/10 pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-white/45">{t("editar")}</h3>

      <label className="block space-y-1">
        <span className="block text-xs text-white/45">{t("descripcion")}</span>
        <span className="block text-[11px] text-white/35">{t("descripcionAyuda")}</span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-ng-azul"
        />
        {descripcionLarga && <span className="block text-xs text-red-400">{t("descripcionLarga", { max: DESCRIPCION_MAX })}</span>}
      </label>
      <ComoSaleEnCadaRed comoSale={comoSale} />

      {youtube && (
        <label className="block space-y-1">
          <span className="block text-xs text-white/45">{t("tituloYoutube")}</span>
          <input
            value={tituloYoutube}
            onChange={(e) => setTituloYoutube(e.target.value)}
            maxLength={TITULO_YOUTUBE_MAX}
            className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-ng-azul"
          />
        </label>
      )}

      {videoUrl && (
        <div className="space-y-1.5">
          <span className="block text-xs text-white/45">{t("portada")}</span>
          {duracion > 0 ? (
            <ElegirPortadaClip url={videoUrl} duracion={duracion} valor={portadaSeg} onCambiar={setPortadaSeg} />
          ) : (
            <video
              src={videoUrl}
              preload="metadata"
              muted
              className="hidden"
              onLoadedMetadata={(e) => setDuracionVideo(e.currentTarget.duration || 0)}
            />
          )}
        </div>
      )}

      {aviso && (
        <div role={aviso.tono === "error" ? "alert" : "status"} className={`space-y-0.5 text-xs ${aviso.tono === "error" ? "text-red-400" : "text-emerald-400"}`}>
          {aviso.textos.map((x) => (
            <p key={x} className="break-words">
              {x}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => void guardar()}
          disabled={guardando || descripcionLarga || tituloVacio}
          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
        >
          {guardando ? t("guardando") : t("guardar")}
        </button>
        <button onClick={onMover} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/75 hover:bg-white/5">
          {t("cambiarHora")}
        </button>
        {enlaceClip && (
          <Link href={enlaceClip} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/75 hover:bg-white/5">
            {t("agregarRedes")}
          </Link>
        )}
      </div>
    </section>
  );
}

/** Elegir la hora nueva de una programada. Sin arrastrar: un selector y listo. */
function CambiarHora({ pubs, onCerrar }: { pubs: PublicacionCalendario[]; onCerrar: () => void }) {
  const p = pubs[0];
  const t = useTranslations("calendario.cambiarHora");
  const locale = useLocale();
  const [fecha, setFecha] = useState(() => aInputLocal(new Date(p.publicarEn)));
  const [reprogramar, { loading }] = useMutation(REPROGRAMAR_PUBLICACION, { refetchQueries: REFETCH });
  const [error, setError] = useState<string | null>(null);
  const cuando = fecha ? new Date(fecha) : null;
  const yaPaso = !cuando || Number.isNaN(cuando.getTime()) || cuando.getTime() < Date.now() + MARGEN_MS;

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  async function guardar() {
    if (!cuando || yaPaso) return;
    setError(null);
    try {
      // Todas las redes programadas de la tarjeta se mueven juntas.
      for (const x of pubs) {
        await reprogramar({ variables: { marcaId: x.marcaId, id: x._id, publicarEn: cuando.toISOString() } });
      }
      onCerrar();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorCambiar"));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal
        aria-label={t("titulo")}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-ng-elevada p-4"
      >
        <p className="font-semibold">{t("titulo")}</p>
        <p className="mt-0.5 truncate text-sm text-white/50">
          {p.clip?.titulo ?? p.descripcion ?? t("publicacion")} ·{" "}
          {pubs.map((x) => REDES[x.red]?.nombre ?? x.red).join(", ")}
        </p>
        <p className="mt-2 text-xs text-white/40">{t("ahoraSale", { cuando: diaYHora(new Date(p.publicarEn), locale) })}</p>
        <input
          type="datetime-local"
          value={fecha}
          min={aInputLocal(new Date(Date.now() + MARGEN_MS))}
          onChange={(e) => setFecha(e.target.value)}
          autoFocus
          className="mt-3 w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-ng-azul"
        />
        <p className={`mt-1.5 text-xs ${yaPaso ? "text-red-400" : "text-white/40"}`}>
          {yaPaso
            ? t("yaPaso", { zona: zonaHoraria(locale) })
            : t("vaASalir", { cuando: diaYHora(cuando!, locale), zona: zonaHoraria(locale) })}
        </p>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCerrar} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5">
            {t("volver")}
          </button>
          <button
            onClick={() => void guardar()}
            disabled={loading || yaPaso}
            className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            {loading ? t("guardando") : t("guardar")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
        activo ? "border-ng-azul bg-ng-azul/15 text-white" : "border-white/15 text-white/60 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

/** El lunes 00:00 (hora local) de la semana de esa fecha. */
function lunesDe(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** Con setDate y no sumando milisegundos: el día del cambio de horario tiene 23 o 25 horas. */
function sumarDias(fecha: Date, dias: number): Date {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

/** "29 sep – 5 oct 2026". */
function rangoDeSemana(lunes: Date, locale: string): string {
  const domingo = sumarDias(lunes, 6);
  const corto = (d: Date) => d.toLocaleDateString(locale, { day: "numeric", month: "short" }).replace(".", "");
  return `${corto(lunes)} – ${corto(domingo)} ${domingo.getFullYear()}`;
}
