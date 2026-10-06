"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
  clip?: {
    _id: string;
    episodioId: string;
    titulo: string;
    urlPoster?: string | null;
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
 * Las publicaciones del mismo clip a la misma hora: una tarjeta, con un chip
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
          const ms = new Date(p.publicarEn).getTime();
          return ms >= desde && ms < fin;
        })
        .sort((a, b) => new Date(a.publicarEn).getTime() - new Date(b.publicarEn).getTime());
      return { dia, grupos: agrupar(pubs) };
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
              className={`rounded-xl border p-2 xl:min-h-[12rem] ${
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
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

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
}: {
  pubs: PublicacionCalendario[];
  opera: boolean;
  onMover: () => void;
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
  const todasCanceladas = pubs.every((x) => x.estado === "CANCELADA");

  return (
    <li className={`rounded-lg border border-white/10 bg-ng-tarjeta p-2 ${todasCanceladas ? "opacity-45" : ""}`}>
      <div className="flex gap-2">
        <Poster url={p.clip?.urlPoster ?? p.portadaUrl} className="h-16 w-9" />
        <div className="min-w-0 flex-1">
          <p className="text-xs">
            <span className="font-semibold tabular-nums" title={fechaCompleta(hora.toISOString(), locale)}>
              {horaCorta(hora, locale)}
            </span>
          </p>
          {enlace ? (
            <Link href={enlace} className="mt-0.5 line-clamp-2 text-sm leading-snug hover:underline">
              {titulo}
            </Link>
          ) : (
            <p className="mt-0.5 line-clamp-2 text-sm leading-snug">{titulo}</p>
          )}
          {editor && <p className="truncate text-[11px] text-white/55">{t("tarjeta.editadoPor", { nombre: editor })}</p>}
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {pubs.map((x) => (
          <ChipRed key={x._id} p={x} titulo={titulo} opera={opera} />
        ))}
      </div>
      {opera && hayProgramadas && (
        <button onClick={onMover} className="mt-1.5 text-[11px] text-white/55 hover:text-white hover:underline">
          {t("tarjeta.cambiarHora")}
        </button>
      )}
    </li>
  );
}

/**
 * Una red de la tarjeta: icono, cuenta y estado. La programada lleva una ✕
 * que la quita solo a ella; lo publicado o fallido se ve, sin ✕.
 */
function ChipRed({ p, titulo, opera }: { p: PublicacionCalendario; titulo: string; opera: boolean }) {
  const t = useTranslations("calendario");
  const [cancelar, { loading: cancelando }] = useMutation(CANCELAR_PUBLICACION, { refetchQueries: REFETCH });
  const [error, setError] = useState<string | null>(null);
  const conocido = p.estado in ESTADOS_PUBLICACION;
  const claseEstado = conocido ? ESTADOS_PUBLICACION[p.estado].clase : "bg-white/10 text-white/60";
  const textoEstado = conocido ? t(`estados.${p.estado}`) : p.estado;
  const programada = p.estado === "PROGRAMADA";
  const red = REDES[p.red]?.nombre ?? p.red;
  const cuenta = p.cuentaNombre ?? red;

  async function quitar() {
    if (!window.confirm(t("tarjeta.confirmarQuitar", { red }))) return;
    setError(null);
    try {
      await cancelar({ variables: { marcaId: p.marcaId, id: p._id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("tarjeta.errorCancelar"));
    }
  }

  const contenido = (
    <>
      <IconoRed red={p.red} chico />
      <span className={`truncate ${p.estado === "CANCELADA" ? "line-through" : ""}`}>{cuenta}</span>
      <span className={`shrink-0 rounded-full px-1.5 ${claseEstado}`}>{textoEstado}</span>
    </>
  );

  return (
    <div className="max-w-full">
      <span
        title={`${red} · ${cuenta} · ${textoEstado}${p.canceladoPor?.nombre ? ` · ${t("tarjeta.canceladaPor", { nombre: p.canceladoPor.nombre })}` : ""}`}
        className={`flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] py-0.5 pl-0.5 text-[11px] ${
          opera && programada ? "pr-0.5" : "pr-1.5"
        } ${p.estado === "CANCELADA" ? "opacity-50" : ""}`}
      >
        {p.estado === "PUBLICADA" && p.permalink ? (
          <a
            href={p.permalink}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 items-center gap-1 hover:underline"
            aria-label={`${red} · ${t("tarjeta.ver")}`}
          >
            {contenido}
          </a>
        ) : (
          contenido
        )}
        {opera && programada && (
          <button
            onClick={() => void quitar()}
            disabled={cancelando}
            aria-label={t("tarjeta.quitarRed", { red, titulo })}
            title={t("tarjeta.quitarRed", { red, titulo })}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
          >
            {cancelando ? "…" : "✕"}
          </button>
        )}
      </span>
      {/* El motivo del fallo a la vista: es lo que hay que leer para arreglarlo.
          En una programada, es un intento que falló y espera su reintento. */}
      {p.error && (p.estado === "FALLIDA" || programada) && (
        <p className={`mt-0.5 break-words text-[11px] ${programada ? "text-amber-400/80" : "text-red-400"}`}>
          {red}: {programada ? t("tarjeta.reintentando") : ""}
          {p.error}
        </p>
      )}
      {error && <p className="mt-0.5 text-[11px] text-red-400">{error}</p>}
    </div>
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
