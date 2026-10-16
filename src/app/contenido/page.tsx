"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { CalendarClock, ChartColumn, ChevronDown, Film, Pencil, Plus, UploadCloud } from "lucide-react";
import { CLIPS_DE_EPISODIO, CLIPS_SUBIDOS, EPISODIOS, MOVER_CLIP_SUBIDO } from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PestanasPublicaciones } from "@/components/PestanasPublicaciones";
import { ReproductorEpisodio, type ControlReproductor } from "@/components/ReproductorEpisodio";
import { CrearClipGuiado } from "@/components/episodios/CrearClipGuiado";
import { TarjetaClipSubido, etapaDe, type ClipSubido } from "@/components/episodios/ClipsSubidos";
import { useSubirClips } from "@/components/episodios/useSubirClips";
import { EstadoPublicacionClip, type ResumenPublicacionClip } from "@/components/episodios/ListoClip";
import { EtiquetaRevision } from "@/components/revision/EtiquetaRevision";
import { etiquetaDeClip, useRevisionMarca, type EstadoRevision } from "@/lib/revision";
import { esMotivo } from "@/lib/momentos";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";

/** Lo que se muestra de un episodio en el selector y para crear clips. */
interface Episodio {
  _id: string;
  titulo: string;
  createdAt: string;
  duracionSeg?: number | null;
  urlReproduccion?: string | null;
  miniaturaUrl?: string | null;
  estadoTranscripcion?: string | null;
  estadoMomentos?: string | null;
}

/** Un clip de la IA o hecho a mano (ClipsDeEpisodio). */
interface Clip {
  _id: string;
  titulo: string;
  motivo: string;
  origen?: "IA" | "MANUAL";
  formato?: "VERTICAL" | "CUADRADO" | "HORIZONTAL" | null;
  estadoRender?: "EN_COLA" | "RENDERIZANDO" | "LISTO" | "FALLIDO" | null;
  urlPoster?: string | null;
  publicacion?: ResumenPublicacionClip | null;
  estadoRevision?: EstadoRevision | null;
}

type Pestana = "todo" | "ia" | "manuales" | "subidos" | "porRevisar";

/** El valor del selector para los subidos de antes, que no son de ningún episodio. */
const SIN_EPISODIO = "sin";

/**
 * Contenido (reemplaza a /publicados): todo lo de un episodio en un lugar.
 * Arriba se elige el episodio (por defecto, el último) y desde ahí se crea un
 * clip a mano, se sube uno ya editado afuera (be#228: queda en ese episodio) y
 * se ve lo que hay, separado por origen. Quien revisa ve además "Por revisar".
 */
export default function ContenidoPage() {
  return (
    <DashboardLayout>
      <PestanasPublicaciones />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-white/5" />}>
        <Contenido />
      </Suspense>
    </DashboardLayout>
  );
}

function Contenido() {
  const t = useTranslations("contenido");
  const router = useRouter();
  const params = useSearchParams();
  const { activa, cargando: cargandoMarca } = useMarcaActiva();
  const { puedeOperar, esPropietario } = useSesion();
  const marcaId = activa?._id ?? null;
  const opera = puedeOperar(marcaId);
  const revision = useRevisionMarca(marcaId ?? undefined);
  // "Por revisar" es de quien aprueba: los revisores y el propietario.
  const veRevision = revision.activa && (revision.soyRevisor || esPropietario(marcaId));

  const episodiosQ = useQuery(EPISODIOS, { variables: { marcaId, limite: 100 }, skip: !marcaId });
  const episodios: Episodio[] = [...(episodiosQ.data?.episodios ?? [])].sort((a: Episodio, b: Episodio) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const sueltosQ = useQuery(CLIPS_SUBIDOS, {
    variables: { marcaId, sinEpisodio: true },
    skip: !marcaId,
    errorPolicy: "all",
  });
  const sueltos: ClipSubido[] = sueltosQ.data?.clipsSubidos ?? [];

  // El elegido: el de la URL, el de la última vez (por marca) o el último episodio.
  const clave = `contenido-episodio:${marcaId}`;
  const deUrl = params.get("episodio");
  const [recordado] = useState<string | null>(() => {
    try {
      return typeof window === "undefined" ? null : sessionStorage.getItem(clave);
    } catch {
      return null;
    }
  });
  const existe = (id: string | null) =>
    !!id && (id === SIN_EPISODIO ? sueltos.length > 0 : episodios.some((e) => e._id === id));
  const elegido = existe(deUrl) ? deUrl! : existe(recordado) ? recordado! : (episodios[0]?._id ?? (sueltos.length ? SIN_EPISODIO : null));

  function elegir(id: string) {
    try {
      sessionStorage.setItem(clave, id);
    } catch {
      // Sin almacenamiento (privado): vale la URL.
    }
    router.replace(`/contenido?episodio=${id}`, { scroll: false });
  }

  if (!cargandoMarca && !marcaId) return <p className="text-sm text-amber-400">{t("sinMarca")}</p>;
  if (!marcaId || (episodiosQ.loading && !episodiosQ.data)) {
    return <div className="h-64 animate-pulse rounded-2xl bg-white/5" />;
  }

  if (!elegido) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-14 text-center">
        <Film size={28} className="text-white/30" aria-hidden />
        <p className="font-medium">{t("sinEpisodios.titulo")}</p>
        <p className="max-w-sm text-sm text-white/50">{t("sinEpisodios.detalle")}</p>
        <Link href="/episodios" className="mt-2 rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-ng-tinta">
          {t("sinEpisodios.ir")}
        </Link>
      </div>
    );
  }

  const episodio = episodios.find((e) => e._id === elegido) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{t("titulo")}</h1>
          <p className="mt-1 text-sm text-white/50">{t("descripcion")}</p>
        </div>
      </div>

      <SelectorEpisodio
        episodios={episodios}
        sueltos={sueltos.length}
        elegido={elegido}
        onElegir={elegir}
      />

      {episodio ? (
        <ContenidoDeEpisodio
          key={episodio._id}
          episodio={episodio}
          marcaId={marcaId}
          opera={opera}
          veRevision={veRevision}
          alCambiarSubidos={() => void sueltosQ.refetch()}
        />
      ) : (
        <SinEpisodio
          sueltos={sueltos}
          episodios={episodios}
          marcaId={marcaId}
          opera={opera}
          alCambiar={() => {
            void sueltosQ.refetch();
          }}
        />
      )}
    </div>
  );
}

/** El episodio elegido, grande, con un desplegable para cambiarlo. */
function SelectorEpisodio({
  episodios,
  sueltos,
  elegido,
  onElegir,
}: {
  episodios: Episodio[];
  sueltos: number;
  elegido: string;
  onElegir: (id: string) => void;
}) {
  const t = useTranslations("contenido");
  const actual = episodios.find((e) => e._id === elegido);
  return (
    <label className="relative flex items-center gap-3 rounded-2xl border border-marca/40 bg-marca/[0.06] p-3 pr-10">
      {actual?.miniaturaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={actual.miniaturaUrl} alt="" className="h-12 w-20 shrink-0 rounded-md object-cover" />
      ) : (
        <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md bg-black/40">
          <Film size={18} className="text-white/30" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-white/45">{t("episodio")}</span>
        <span className="block truncate font-semibold">
          {actual ? actual.titulo : t("sinEpisodio.titulo")}
          {actual && actual._id === episodios[0]?._id ? (
            <span className="ml-2 rounded-full bg-marca px-2 py-0.5 align-middle text-[10px] font-semibold text-ng-tinta">
              {t("ultimo")}
            </span>
          ) : null}
        </span>
      </span>
      <ChevronDown size={18} className="pointer-events-none absolute right-3 text-white/60" aria-hidden />
      {/* El select de verdad, transparente encima: accesible y nativo en el teléfono. */}
      <select
        value={elegido}
        onChange={(e) => onElegir(e.target.value)}
        aria-label={t("elegirEpisodio")}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {episodios.map((e) => (
          <option key={e._id} value={e._id}>
            {e.titulo}
          </option>
        ))}
        {sueltos > 0 && <option value={SIN_EPISODIO}>{t("sinEpisodio.opcion", { n: sueltos })}</option>}
      </select>
    </label>
  );
}

function ContenidoDeEpisodio({
  episodio,
  marcaId,
  opera,
  veRevision,
  alCambiarSubidos,
}: {
  episodio: Episodio;
  marcaId: string;
  opera: boolean;
  veRevision: boolean;
  alCambiarSubidos: () => void;
}) {
  const t = useTranslations("contenido");
  const tc = useTranslations("clipsSubidos");
  const input = useRef<HTMLInputElement>(null);
  const reproductor = useRef<ControlReproductor>(null);
  const [creando, setCreando] = useState(false);

  const clipsQ = useQuery(CLIPS_DE_EPISODIO, { variables: { id: episodio._id, marcaId } });
  const subidosQ = useQuery(CLIPS_SUBIDOS, {
    variables: { marcaId, episodioId: episodio._id },
    errorPolicy: "all",
    notifyOnNetworkStatusChange: false,
  });
  const clips: Clip[] = clipsQ.data?.clipsDeEpisodio ?? [];
  const subidos: ClipSubido[] = subidosQ.data?.clipsSubidos ?? [];
  const { encolar, borrar, subiendo, enCola, avisos } = useSubirClips({
    marcaId,
    episodioId: episodio._id,
    alCambiar: () => {
      void subidosQ.refetch();
      alCambiarSubidos();
    },
  });

  // Lo que se está preparando se consulta seguido (así el backend le pregunta a Bunny).
  const { startPolling, stopPolling } = subidosQ;
  const hayPendientes = subidos.some((c) => etapaDe(c) === "preparando");
  useEffect(() => {
    if (hayPendientes || subiendo) startPolling(8000);
    else stopPolling();
    return () => stopPolling();
  }, [hayPendientes, subiendo, startPolling, stopPolling]);

  const deIa = clips.filter((c) => c.origen !== "MANUAL");
  const manuales = clips.filter((c) => c.origen === "MANUAL");
  const porRevisarClips = clips.filter((c) => c.estadoRevision === "PENDIENTE");
  const porRevisarSubidos = subidos.filter((c) => c.clip?.estadoRevision === "PENDIENTE");
  const cuantos: Record<Pestana, number> = {
    todo: clips.length + subidos.length,
    ia: deIa.length,
    manuales: manuales.length,
    subidos: subidos.length,
    porRevisar: porRevisarClips.length + porRevisarSubidos.length,
  };
  const pestanas: Pestana[] = ["todo", "ia", "manuales", "subidos", ...(veRevision ? (["porRevisar"] as const) : [])];
  // Quien revisa entra directo a lo que le toca, si hay algo.
  const [pestana, setPestana] = useState<Pestana | null>(null);
  const actual: Pestana = pestana ?? (veRevision && cuantos.porRevisar > 0 ? "porRevisar" : "todo");

  const verClips =
    actual === "todo" ? clips : actual === "ia" ? deIa : actual === "manuales" ? manuales : actual === "porRevisar" ? porRevisarClips : [];
  const verSubidos =
    actual === "todo" || actual === "subidos" ? subidos : actual === "porRevisar" ? porRevisarSubidos : [];
  const cargando = (clipsQ.loading && !clipsQ.data) || (subidosQ.loading && !subidosQ.data);
  const transcrito = episodio.estadoTranscripcion === "LISTA";
  const buscando = episodio.estadoMomentos === "EN_COLA" || episodio.estadoMomentos === "ANALIZANDO";

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Lo que se hace desde acá ---- */}
      <div className="flex flex-wrap items-center gap-2">
        {opera && (
          <>
            <button
              type="button"
              onClick={() => setCreando((v) => !v)}
              disabled={!transcrito || !episodio.urlReproduccion}
              title={transcrito ? t("crearClipAyuda") : t("crearNoListo")}
              aria-expanded={creando}
              className="flex items-center gap-1.5 rounded-lg bg-marca px-3.5 py-2 text-sm font-semibold text-ng-tinta transition hover:brightness-110 disabled:opacity-40"
            >
              <Plus size={16} aria-hidden />
              {t("crearClip")}
            </button>
            <button
              type="button"
              onClick={() => input.current?.click()}
              title={t("subirAyuda")}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-2 text-sm text-white/85 transition hover:bg-white/5"
            >
              <UploadCloud size={16} aria-hidden />
              {t("subirClip")}
            </button>
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
          </>
        )}
        <Link href={`/episodios/${episodio._id}`} className="ml-auto text-sm text-ng-celeste hover:underline">
          {t("verEpisodio")}
        </Link>
      </div>

      {subiendo && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="truncate text-sm">{tc("subiendo", { nombre: subiendo.nombre })}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-marca transition-[width]" style={{ width: `${subiendo.pct}%` }} />
          </div>
          <p className="mt-1 text-xs tabular-nums text-white/50">
            {Math.round(subiendo.pct)}%{enCola > 0 ? ` · ${tc("enCola", { n: enCola })}` : ""}
          </p>
        </div>
      )}
      {avisos.length > 0 && (
        <div className="flex flex-col gap-1 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          {avisos.map((a) => (
            <p key={a} className="text-sm text-red-300">
              {a}
            </p>
          ))}
        </div>
      )}

      {creando && episodio.urlReproduccion && (
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <ReproductorEpisodio ref={reproductor} url={episodio.urlReproduccion} poster={episodio.miniaturaUrl} />
          <CrearClipGuiado
            episodioId={episodio._id}
            marcaId={marcaId}
            duracionEpisodio={episodio.duracionSeg ?? 0}
            reproductor={reproductor}
            onCerrar={() => setCreando(false)}
          />
        </div>
      )}

      {/* ---- Las pestañas ---- */}
      <div role="tablist" aria-label={t("pestanas.etiqueta")} className="flex gap-1 overflow-x-auto border-b border-white/10">
        {pestanas.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={actual === p}
            onClick={() => setPestana(p)}
            className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition ${
              actual === p ? "border-marca font-semibold text-white" : "border-transparent text-white/55 hover:text-white/80"
            }`}
          >
            {t(`pestanas.${p}`)}
            <span
              className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                p === "porRevisar" && cuantos.porRevisar > 0
                  ? "bg-amber-400/20 text-amber-300"
                  : actual === p
                    ? "bg-marca text-ng-tinta"
                    : "bg-white/5"
              }`}
            >
              {cuantos[p]}
            </span>
          </button>
        ))}
      </div>

      {(actual === "todo" || actual === "ia") && buscando && (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/50">{t("analizando")}</p>
      )}

      {cargando ? (
        <Grilla>
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-white/5" />
          ))}
        </Grilla>
      ) : verClips.length + verSubidos.length > 0 ? (
        <Grilla>
          {verClips.map((c) => (
            <TarjetaContenido key={c._id} clip={c} episodioId={episodio._id} opera={opera} veRevision={veRevision} />
          ))}
          {verSubidos.map((c) => (
            <TarjetaClipSubido
              key={c.episodio._id}
              c={c}
              subiendoPct={subiendo?.episodioId === c.episodio._id ? subiendo.pct : null}
              puedeOperar={opera}
              onBorrar={() => void borrar(c)}
            />
          ))}
        </Grilla>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-12 text-center">
          <Film size={28} className="text-white/30" aria-hidden />
          <p className="text-sm text-white/60">{t(`vacio.${actual}`)}</p>
        </div>
      )}
    </div>
  );
}

/** Los subidos de antes, sin episodio: se ven y se mueven al que corresponde. */
function SinEpisodio({
  sueltos,
  episodios,
  marcaId,
  opera,
  alCambiar,
}: {
  sueltos: ClipSubido[];
  episodios: Episodio[];
  marcaId: string;
  opera: boolean;
  alCambiar: () => void;
}) {
  const t = useTranslations("contenido");
  const { borrar, avisos } = useSubirClips({ marcaId, alCambiar });
  const [mover, { loading: moviendo }] = useMutation(MOVER_CLIP_SUBIDO);
  const [error, setError] = useState<string | null>(null);

  async function moverA(c: ClipSubido, episodioId: string) {
    setError(null);
    try {
      await mover({ variables: { id: c.episodio._id, marcaId, episodioId }, refetchQueries: ["ClipsSubidos"] });
      alCambiar();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mover.error"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-white/55">{t("sinEpisodio.ayuda")}</p>
      {[...avisos, ...(error ? [error] : [])].map((a) => (
        <p key={a} className="text-sm text-red-300">
          {a}
        </p>
      ))}
      <Grilla>
        {sueltos.map((c) => (
          <TarjetaClipSubido
            key={c.episodio._id}
            c={c}
            subiendoPct={null}
            puedeOperar={opera}
            onBorrar={() => void borrar(c)}
            extra={
              opera && episodios.length > 0 ? (
                <select
                  value=""
                  disabled={moviendo}
                  onChange={(e) => e.target.value && void moverA(c, e.target.value)}
                  aria-label={t("mover.etiqueta")}
                  className="w-full rounded-md border border-white/15 bg-ng-superficie px-2 py-1.5 text-xs text-white/80"
                >
                  <option value="">{t("mover.etiqueta")}</option>
                  {episodios.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.titulo}
                    </option>
                  ))}
                </select>
              ) : null
            }
          />
        ))}
      </Grilla>
    </div>
  );
}

function Grilla({ children }: { children: React.ReactNode }) {
  return <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{children}</ul>;
}

/** Un clip de la IA o hecho a mano, como tarjeta vertical: abre el editor, programa o lleva a revisar. */
function TarjetaContenido({
  clip,
  episodioId,
  opera,
  veRevision,
}: {
  clip: Clip;
  episodioId: string;
  opera: boolean;
  veRevision: boolean;
}) {
  const t = useTranslations("contenido");
  const tMotivo = useTranslations("episodiosMotivos");
  const base = `/episodios/${episodioId}/clips/${clip._id}`;
  const origen =
    clip.origen === "MANUAL" ? t("origen.manual") : esMotivo(clip.motivo) ? tMotivo(clip.motivo) : t("origen.ia");
  const porRevisar = veRevision && clip.estadoRevision === "PENDIENTE";
  return (
    <li className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-marca/40">
      <Link href={base} className="relative block aspect-[9/16] bg-black" aria-label={t("acciones.editarClip", { titulo: clip.titulo })}>
        {clip.urlPoster ? (
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
        <span
          className={`absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            clip.origen === "MANUAL" ? "bg-white text-ng-tinta" : "bg-black/70 text-white"
          }`}
        >
          {origen}
        </span>
        {(clip.estadoRender === "EN_COLA" || clip.estadoRender === "RENDERIZANDO") && (
          <span className="absolute bottom-2 left-2 rounded bg-sky-400/90 px-1.5 py-0.5 text-[11px] font-semibold text-ng-tinta">
            {t("render.renderizando")}
          </span>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm font-semibold">{clip.titulo}</p>
        <div className="flex flex-wrap items-center gap-1">
          <EtiquetaRevision etiqueta={etiquetaDeClip(clip.estadoRevision)} chica />
          <EstadoPublicacionClip publicacion={clip.publicacion} />
        </div>
        <div className="mt-auto flex items-center gap-1.5">
          {porRevisar ? (
            <Link
              href={`${base}/publicar#revision`}
              className="flex flex-1 items-center justify-center rounded-md bg-marca px-2 py-1.5 text-xs font-semibold text-ng-tinta hover:brightness-110"
            >
              {t("acciones.revisar")}
            </Link>
          ) : opera ? (
            <Link
              href={`${base}/publicar`}
              className="flex flex-1 items-center justify-center gap-1 rounded-md bg-marca px-2 py-1.5 text-xs font-semibold text-ng-tinta hover:brightness-110"
            >
              <CalendarClock size={13} aria-hidden />
              {t("acciones.programar")}
            </Link>
          ) : null}
          <Link
            href={base}
            aria-label={t("acciones.editar")}
            title={t("acciones.editar")}
            className="flex items-center justify-center rounded-md border border-white/15 p-1.5 hover:bg-white/10"
          >
            <Pencil size={13} aria-hidden />
          </Link>
          {(clip.publicacion?.publicadas ?? 0) > 0 && (
            <Link
              href={`/metricas/clips/${clip._id}`}
              aria-label={t("acciones.metricas")}
              title={t("acciones.metricas")}
              className="flex items-center justify-center rounded-md border border-white/15 p-1.5 hover:bg-white/10"
            >
              <ChartColumn size={13} aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}
