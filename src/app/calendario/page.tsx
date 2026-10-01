"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CANCELAR_PUBLICACION,
  CLIPS_LISTOS_SIN_PROGRAMAR,
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
  type Publicacion,
} from "@/lib/publicaciones";
import { fechaCompleta, tiempoRelativo, useAhora } from "@/lib/time";
import type { Autoria } from "@/components/episodios/TomarClip";

interface PublicacionCalendario extends Publicacion {
  /** El clip de la publicación; null en las de expedientes o si se borró. */
  clip?: { _id: string; episodioId: string; titulo: string; urlPoster?: string | null } | null;
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
 * El calendario de la marca (#70, ng-creator-be#63): qué está programado y qué
 * ya salió, semana por semana, y los clips que alguien marcó listos y nadie
 * programó todavía.
 *
 * Las horas son las del navegador, y se dice cuál es: el equipo puede estar en
 * países distintos. Mover una publicación es elegir la hora nueva, no
 * arrastrarla; y solo se mueven las programadas: lo publicado ya salió.
 */
export default function CalendarioPage() {
  const { activa } = useMarcaActiva();
  const { puedeOperar } = useSesion();
  const marcaId = activa?._id ?? "";
  const opera = puedeOperar(activa?._id);
  // Null hasta montar: el lunes depende de la zona del navegador, no de la del servidor.
  const [inicio, setInicio] = useState<Date | null>(null);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [moviendo, setMoviendo] = useState<PublicacionCalendario | null>(null);
  const [zona, setZona] = useState("");
  const ahora = useAhora();

  useEffect(() => {
    setInicio(lunesDe(new Date()));
    setZona(zonaHoraria());
  }, []);

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
          const t = new Date(p.publicarEn).getTime();
          return t >= desde && t < fin;
        })
        .sort((a, b) => new Date(a.publicarEn).getTime() - new Date(b.publicarEn).getTime());
      return { dia, pubs };
    });
  }, [inicio, visibles]);

  const programadas = visibles.filter((p) => p.estado === "PROGRAMADA" || p.estado === "AGENDADA_EN_RED").length;
  const publicadas = visibles.filter((p) => p.estado === "PUBLICADA").length;
  const fallidas = visibles.filter((p) => p.estado === "FALLIDA").length;
  const esEstaSemana = inicio ? lunesDe(new Date(ahora)).getTime() === inicio.getTime() : true;

  return (
    <DashboardLayout>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendario</h1>
          <p className="mt-1 text-sm text-white/50">
            Qué está programado y qué ya salió{activa ? ` en ${activa.nombre}` : ""}.
          </p>
        </div>
        {zona && <p className="text-xs text-white/40">Horas de {zona}</p>}
      </div>

      <ListosParaProgramar listos={listos} opera={opera} cargando={listosQ.loading && !listosQ.data} />

      {/* Semana */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => inicio && setInicio(sumarDias(inicio, -7))}
            aria-label="Semana anterior"
            className="rounded-lg border border-white/15 p-1.5 text-white/70 hover:bg-white/5"
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button
            onClick={() => setInicio(lunesDe(new Date()))}
            disabled={esEstaSemana}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5 disabled:opacity-40"
          >
            Hoy
          </button>
          <button
            onClick={() => inicio && setInicio(sumarDias(inicio, 7))}
            aria-label="Semana siguiente"
            className="rounded-lg border border-white/15 p-1.5 text-white/70 hover:bg-white/5"
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
        <p className="font-medium">{inicio ? rangoDeSemana(inicio) : ""}</p>
        <p className="text-xs text-white/40">
          {programadas} programada{programadas === 1 ? "" : "s"} · {publicadas} publicada{publicadas === 1 ? "" : "s"}
          {fallidas ? ` · ${fallidas} fallida${fallidas === 1 ? "" : "s"}` : ""}
        </p>
      </div>

      {/* Filtro por red */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Chip activo={!filtro} onClick={() => setFiltro(null)}>
          Todas
        </Chip>
        {FILTROS.map((r) => (
          <Chip key={r} activo={filtro === r} onClick={() => setFiltro(filtro === r ? null : r)}>
            <IconoRed red={r} chico />
            {REDES[r].nombre}
          </Chip>
        ))}
      </div>

      {pubsQ.error && !pubsQ.data && (
        <p className="mb-4 text-sm text-red-400">No se pudo cargar el calendario: {pubsQ.error.message}</p>
      )}

      {/* En el teléfono, una lista por día; en pantallas anchas, las siete columnas. */}
      <div className="space-y-4 xl:grid xl:grid-cols-7 xl:gap-2 xl:space-y-0">
        {dias.map(({ dia, pubs }) => {
          const hoy = dia.toDateString() === new Date(ahora).toDateString();
          return (
            <section
              key={dia.toISOString()}
              className={`rounded-xl border p-2 xl:min-h-[12rem] ${
                hoy ? "border-ng-azul/50 bg-ng-azul/[0.04]" : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <h2 className="mb-2 flex items-baseline gap-2 px-1 text-sm">
                <span className={`font-semibold capitalize ${hoy ? "text-ng-celeste" : ""}`}>
                  {dia.toLocaleDateString("es", { weekday: "long" })}
                </span>
                <span className="text-white/40">{dia.toLocaleDateString("es", { day: "numeric", month: "short" })}</span>
                {hoy && <span className="ml-auto rounded-full bg-ng-azul/20 px-1.5 text-[10px] text-ng-celeste">Hoy</span>}
              </h2>
              {pubs.length === 0 ? (
                <p className="px-1 pb-1 text-xs text-white/25">{pubsQ.loading && !pubsQ.data ? "…" : "Nada"}</p>
              ) : (
                <ul className="space-y-2">
                  {pubs.map((p) => (
                    <TarjetaPublicacion key={p._id} p={p} opera={opera} onMover={() => setMoviendo(p)} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {moviendo && <CambiarHora p={moviendo} onCerrar={() => setMoviendo(null)} />}
    </DashboardLayout>
  );
}

/** Los clips que alguien marcó listos y nadie programó: lo que le queda a quien programa. */
function ListosParaProgramar({ listos, opera, cargando }: { listos: ClipListo[]; opera: boolean; cargando: boolean }) {
  if (cargando) return null;
  return (
    <section className="mb-6 rounded-xl border border-ng-teal/25 bg-ng-teal/[0.03] p-3">
      <h2 className="mb-2 text-sm font-semibold">
        Listos para programar
        {listos.length > 0 && <span className="ml-2 rounded-full bg-ng-teal/15 px-2 text-xs text-ng-teal">{listos.length}</span>}
      </h2>
      {listos.length === 0 ? (
        <p className="text-xs text-white/40">
          No hay clips esperando. Cuando alguien marque uno como Listo en el editor, aparece acá.
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
                  <p className="text-xs text-white/45" title={fechaCompleta(c.listoPor.en)}>
                    Listo por {c.listoPor.nombre} · {tiempoRelativo(c.listoPor.en)}
                  </p>
                )}
              </div>
              {opera && (
                <Link
                  href={`/episodios/${c.episodioId}/clips/${c._id}/publicar`}
                  className="shrink-0 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:brightness-110"
                >
                  Programar
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TarjetaPublicacion({
  p,
  opera,
  onMover,
}: {
  p: PublicacionCalendario;
  opera: boolean;
  onMover: () => void;
}) {
  const [cancelar, { loading: cancelando }] = useMutation(CANCELAR_PUBLICACION, { refetchQueries: REFETCH });
  const [error, setError] = useState<string | null>(null);
  const estado = ESTADOS_PUBLICACION[p.estado] ?? { texto: p.estado, clase: "bg-white/10 text-white/60" };
  const hora = new Date(p.publicadaEn ?? p.publicarEn);
  const titulo = p.clip?.titulo ?? (p.descripcion?.split("\n")[0].trim() || "Sin descripción");
  const enlace = p.clip
    ? `/episodios/${p.clip.episodioId}/clips/${p.clip._id}/publicar`
    : p.expedienteId
      ? `/publicados/${p.expedienteId}`
      : null;
  const programada = p.estado === "PROGRAMADA";

  async function cancelarla() {
    if (!window.confirm(`¿Cancelar «${titulo}» en ${REDES[p.red]?.nombre ?? p.red}? No sale.`)) return;
    setError(null);
    try {
      await cancelar({ variables: { marcaId: p.marcaId, id: p._id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cancelar");
    }
  }

  return (
    <li
      className={`rounded-lg border border-white/10 bg-ng-tarjeta p-2 ${p.estado === "CANCELADA" ? "opacity-45" : ""}`}
    >
      <div className="flex gap-2">
        <Poster url={p.clip?.urlPoster ?? p.portadaUrl} className="h-16 w-9" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold tabular-nums" title={fechaCompleta(hora.toISOString())}>
              {horaCorta(hora)}
            </span>
            <IconoRed red={p.red} chico />
          </p>
          {enlace ? (
            <Link href={enlace} className="mt-0.5 line-clamp-2 text-sm leading-snug hover:underline">
              {titulo}
            </Link>
          ) : (
            <p className="mt-0.5 line-clamp-2 text-sm leading-snug">{titulo}</p>
          )}
          <p className="truncate text-[11px] text-white/40" title={p.cuentaNombre ?? undefined}>
            {REDES[p.red]?.nombre ?? p.red}
            {p.cuentaNombre ? ` · ${p.cuentaNombre}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
        <span className={`rounded-full px-2 py-0.5 ${estado.clase}`}>{estado.texto}</span>
        {p.estado === "PUBLICADA" && p.permalink && (
          <a href={p.permalink} target="_blank" rel="noreferrer" className="text-ng-celeste hover:underline">
            Ver ↗
          </a>
        )}
        {opera && programada && (
          <>
            <button onClick={onMover} className="text-white/55 hover:text-white hover:underline">
              Cambiar hora
            </button>
            <button
              onClick={() => void cancelarla()}
              disabled={cancelando}
              className="text-red-400/75 hover:text-red-400 hover:underline disabled:opacity-50"
            >
              {cancelando ? "Cancelando…" : "Cancelar"}
            </button>
          </>
        )}
      </div>
      {/* El motivo del fallo a la vista: es lo que hay que leer para arreglarlo.
          En una programada, es un intento que falló y espera su reintento. */}
      {p.error && (p.estado === "FALLIDA" || programada) && (
        <p className={`mt-1 break-words text-[11px] ${programada ? "text-amber-400/80" : "text-red-400"}`}>
          {programada ? "Reintentando: " : ""}
          {p.error}
        </p>
      )}
      {p.estado === "CANCELADA" && p.canceladoPor?.nombre && (
        <p className="mt-1 text-[11px] text-white/40">Cancelada por {p.canceladoPor.nombre}</p>
      )}
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </li>
  );
}

/** Elegir la hora nueva de una programada. Sin arrastrar: un selector y listo. */
function CambiarHora({ p, onCerrar }: { p: PublicacionCalendario; onCerrar: () => void }) {
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
      await reprogramar({ variables: { marcaId: p.marcaId, id: p._id, publicarEn: cuando.toISOString() } });
      onCerrar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar la hora");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal
        aria-label="Cambiar hora"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-ng-elevada p-4"
      >
        <p className="font-semibold">Cambiar hora</p>
        <p className="mt-0.5 truncate text-sm text-white/50">
          {p.clip?.titulo ?? p.descripcion ?? "Publicación"} · {REDES[p.red]?.nombre ?? p.red}
        </p>
        <p className="mt-2 text-xs text-white/40">Ahora sale el {diaYHora(new Date(p.publicarEn))}.</p>
        <input
          type="datetime-local"
          value={fecha}
          min={aInputLocal(new Date(Date.now() + MARGEN_MS))}
          onChange={(e) => setFecha(e.target.value)}
          autoFocus
          className="mt-3 w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-ng-azul"
        />
        <p className={`mt-1.5 text-xs ${yaPaso ? "text-red-400" : "text-white/40"}`}>
          {yaPaso ? "Esa hora ya pasó: elegí una de acá en adelante." : `Va a salir el ${diaYHora(cuando!)}.`} Hora de{" "}
          {zonaHoraria()}.
        </p>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCerrar} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5">
            Volver
          </button>
          <button
            onClick={() => void guardar()}
            disabled={loading || yaPaso}
            className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Guardando…" : "Guardar"}
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
function rangoDeSemana(lunes: Date): string {
  const domingo = sumarDias(lunes, 6);
  const corto = (d: Date) => d.toLocaleDateString("es", { day: "numeric", month: "short" }).replace(".", "");
  return `${corto(lunes)} – ${corto(domingo)} ${domingo.getFullYear()}`;
}
