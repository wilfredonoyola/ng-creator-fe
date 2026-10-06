"use client";

import Link from "next/link";
import { useRef } from "react";
import { useQuery } from "@apollo/client";
import { ArrowRight, Clapperboard, Loader2, Mic, Play, Sparkles, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { CLIPS_DE_EPISODIO, COLA_DE_REVISION, EPISODIOS } from "@/graphql/operations";
import { ReproductorEpisodio, type ControlReproductor } from "@/components/ReproductorEpisodio";
import { MOTIVOS, reloj } from "@/lib/momentos";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AvisoPlan, usePlanDeMarca } from "@/components/prueba/AvisoPlan";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";

interface EpisodioResumen {
  _id: string;
  titulo: string;
  nombreArchivo: string;
  estado: "SUBIENDO" | "PROCESANDO" | "LISTO" | "FALLIDO";
  duracionSeg?: number | null;
  miniaturaUrl?: string | null;
  urlReproduccion?: string | null;
  estadoTranscripcion?: "EN_COLA" | "TRANSCRIBIENDO" | "LISTA" | "FALLIDA" | null;
  progresoTranscripcion?: number | null;
  estadoMomentos?: "EN_COLA" | "ANALIZANDO" | "LISTO" | "FALLIDO" | null;
  clipsSugeridos?: number | null;
  createdAt: string;
}

type Traductor = ReturnType<typeof useTranslations<"panel">>;

/**
 * En qué punto del camino está un episodio, dicho como lo diría una persona.
 * `listo` es que ya tiene clips para editar; `falla` que necesita que alguien
 * lo mire.
 */
function etapa(ep: EpisodioResumen, t: Traductor): { texto: string; listo: boolean; falla: boolean } {
  if (ep.estado === "FALLIDO" || ep.estadoTranscripcion === "FALLIDA" || ep.estadoMomentos === "FALLIDO")
    return { texto: t("etapas.revision"), listo: false, falla: true };
  if (ep.estado === "SUBIENDO") return { texto: t("etapas.subiendo"), listo: false, falla: false };
  if (ep.estado === "PROCESANDO") return { texto: t("etapas.procesando"), listo: false, falla: false };
  if (ep.estadoTranscripcion === "TRANSCRIBIENDO")
    return {
      texto: t("etapas.transcribiendo", { progreso: ep.progresoTranscripcion ?? 0 }),
      listo: false,
      falla: false,
    };
  if (ep.estadoTranscripcion !== "LISTA") return { texto: t("etapas.enCola"), listo: false, falla: false };
  if (ep.estadoMomentos === "LISTO")
    return { texto: t("etapas.clips", { n: ep.clipsSugeridos ?? 0 }), listo: true, falla: false };
  return { texto: t("etapas.buscando"), listo: false, falla: false };
}

function duracion(t: Traductor, seg?: number | null) {
  if (!seg) return null;
  const h = Math.floor(seg / 3600);
  const m = Math.round((seg % 3600) / 60);
  return h ? t("duracionHoras", { h, m }) : t("duracionMinutos", { m });
}

/** Los motivos con nombre propio (`motivos.<clave>` en panel.json). */
type Motivo = "GANCHO_FUERTE" | "OPINION_POLEMICA" | "HISTORIA_COMPLETA" | "FRASE_CITABLE" | "HUMOR" | "EMOCION" | "DATO_SORPRENDENTE";

/** Un clip del episodio reciente, con lo que el Inicio muestra de él. */
interface ClipResumen {
  _id: string;
  desdeSeg: number;
  hastaSeg: number;
  /** Ya sin los cortes del medio. */
  duracionEfectivaSeg?: number | null;
  puntuacion: number;
  motivo: string;
  titulo: string;
  estadoRender?: string | null;
  urlPoster?: string | null;
}

/**
 * Inicio: lo que te toca hoy en la marca activa, armado alrededor del
 * episodio más reciente que ya tiene clips. Arriba, el episodio para mirarlo
 * y los clips que ya se procesaron; abajo, los mejores momentos que encontró
 * la IA (tocar uno lo reproduce arriba). Después, lo que está en camino. Cada
 * bloque lleva a una acción.
 */
export default function InicioPage() {
  const t = useTranslations("panel");
  const { activa } = useMarcaActiva();
  const { bloqueado: agotada } = usePlanDeMarca();
  const { usuario, esAdmin } = useSesion();
  const marcaId = activa?._id ?? "";
  const { data, loading } = useQuery(EPISODIOS, {
    variables: { marcaId, limite: 30 },
    skip: !activa,
    // Mientras haya algo en camino, el backend avanza estados al listar.
    pollInterval: 20000,
  });
  const { data: colaData } = useQuery(COLA_DE_REVISION, {
    variables: { marcaId: activa?._id ?? null },
    skip: !esAdmin,
  });

  const episodios: EpisodioResumen[] = data?.episodios ?? [];
  const conEtapa = episodios.map((ep) => ({ ep, e: etapa(ep, t) }));
  const enCamino = conEtapa.filter(({ e }) => !e.listo);
  const listos = conEtapa.filter(({ e }) => e.listo);
  const reciente = listos[0]?.ep ?? null;
  const otrosListos = listos.slice(1, 7);
  const clipsTotales = listos.reduce((n, { ep }) => n + (ep.clipsSugeridos ?? 0), 0);

  const clipsQ = useQuery(CLIPS_DE_EPISODIO, {
    variables: { id: reciente?._id ?? "", marcaId },
    skip: !reciente,
  });
  const clips: ClipResumen[] = clipsQ.data?.clipsDeEpisodio ?? [];
  const procesados = clips.filter((c) => c.estadoRender === "LISTO" && c.urlPoster);
  const destacados = [...clips].sort((a, b) => b.puntuacion - a.puntuacion).slice(0, 4);

  const reproductor = useRef<ControlReproductor>(null);
  const cajaReproductor = useRef<HTMLDivElement>(null);
  function reproducir(c: ClipResumen) {
    reproductor.current?.reproducirTramo(c.desdeSeg, c.hastaSeg);
    cajaReproductor.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const delMes = episodios.filter((ep) => new Date(ep.createdAt) >= inicioMes).length;

  const nombre = usuario?.nombre?.split(" ")[0];
  const colaReaccion = colaData?.colaDeRevision?.length ?? 0;

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{nombre ? t("hola", { nombre }) : t("inicio")}</h1>
          <p className="mt-1 text-ng-secundario">
            {activa ? t("hoyEn", { marca: activa.nombre }) : t("elegiMarca")}
          </p>
        </div>
        {agotada ? (
          <button
            disabled
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-ng-md bg-marca px-5 py-2.5 text-sm font-semibold text-ng-tinta opacity-40"
          >
            <Upload size={16} aria-hidden /> {t("subirEpisodio")}
          </button>
        ) : (
          <Link
            href="/episodios"
            className="inline-flex items-center gap-2 rounded-ng-md bg-marca px-5 py-2.5 text-sm font-semibold text-ng-tinta brillo-marca hover:brightness-110"
          >
            <Upload size={16} aria-hidden /> {t("subirEpisodio")}
          </Link>
        )}
      </div>

      <AvisoPlan className="mb-6" />

      {episodios.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 text-xs">
          <Cifra valor={delMes} etiqueta={t("cifras.delMes")} />
          <Cifra valor={enCamino.length} etiqueta={t("cifras.enProceso")} />
          <Cifra valor={clipsTotales} etiqueta={t("cifras.clips")} />
        </div>
      )}

      {loading && !episodios.length ? (
        <div className="flex items-center gap-2 text-sm text-ng-secundario">
          <Loader2 size={16} className="animate-spin" aria-hidden /> {t("cargando")}
        </div>
      ) : !episodios.length ? (
        <div className="rounded-ng-xl border border-dashed border-white/15 bg-ng-tarjeta/60 p-10 text-center">
          <Mic size={36} className="mx-auto text-ng-celeste" aria-hidden />
          <p className="mt-4 text-lg font-semibold">{t("primero.titulo")}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ng-secundario">
            {t("primero.detalle")}
          </p>
          <Link
            href="/episodios"
            className="mt-6 inline-block rounded-ng-md bg-marca px-6 py-3 font-semibold text-ng-tinta hover:brightness-110"
          >
            {t("subirEpisodio")}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {reciente && (
            <>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                {/* ---- Episodio reciente ---- */}
                <section ref={cajaReproductor} className="rounded-ng-xl border border-white/10 bg-ng-tarjeta p-4">
                  <Encabezado
                    titulo={t("reciente.titulo")}
                    accion={{ href: `/episodios/${reciente._id}`, texto: t("reciente.abrir") }}
                  />
                  {reciente.urlReproduccion ? (
                    <div className="overflow-hidden rounded-ng-lg bg-black">
                      <ReproductorEpisodio ref={reproductor} url={reciente.urlReproduccion} poster={reciente.miniaturaUrl} />
                    </div>
                  ) : (
                    <Miniatura ep={reciente} className="aspect-video w-full" />
                  )}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="truncate font-semibold">{reciente.titulo || reciente.nombreArchivo}</p>
                    {duracion(t, reciente.duracionSeg) && (
                      <span className="shrink-0 text-xs text-ng-tenue">{duracion(t, reciente.duracionSeg)}</span>
                    )}
                  </div>
                </section>

                {/* ---- Clips generados ---- */}
                <section className="flex min-w-0 flex-col rounded-ng-xl border border-white/10 bg-ng-tarjeta p-4">
                  <Encabezado
                    titulo={t("generados.titulo")}
                    cuenta={procesados.length}
                    accion={{ href: `/episodios/${reciente._id}`, texto: t("generados.verTodos") }}
                  />
                  {procesados.length ? (
                    <div className="-mx-1 flex flex-1 gap-3 overflow-x-auto px-1 pb-1">
                      {procesados.map((c, i) => (
                        <Link
                          key={c._id}
                          href={`/episodios/${reciente._id}/clips/${c._id}`}
                          className="group w-[30%] min-w-[118px] shrink-0"
                        >
                          <div
                            className={`relative aspect-[9/16] overflow-hidden rounded-ng-lg border transition ${
                              i === 0 ? "border-ng-azul/70 brillo-marca" : "border-white/10 group-hover:border-ng-azul/50"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- poster del CDN */}
                            <img src={c.urlPoster!} alt="" className="h-full w-full object-cover" />
                            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] tabular-nums text-white">
                              {reloj(c.duracionEfectivaSeg ?? c.hastaSeg - c.desdeSeg)}
                            </span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug">{c.titulo}</p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-ng-lg border border-dashed border-white/10 p-6 text-center">
                      <Clapperboard size={26} className="text-ng-tenue" aria-hidden />
                      <p className="mt-2 text-sm text-ng-secundario">{t("generados.vacio")}</p>
                      <p className="mt-0.5 text-xs text-ng-tenue">{t("generados.ayuda")}</p>
                    </div>
                  )}
                </section>
              </div>

              {/* ---- Momentos destacados ---- */}
              {destacados.length > 0 && (
                <section className="rounded-ng-xl border border-white/10 bg-ng-tarjeta p-4">
                  <Encabezado
                    titulo={t("destacados.titulo")}
                    detalle={t("destacados.detalle")}
                    accion={{
                      href: `/episodios/${reciente._id}`,
                      texto: t("destacados.verTodos", { n: clips.length }),
                      destacada: true,
                    }}
                  />
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {destacados.map((c) => (
                      <div key={c._id} className="group">
                        <button
                          onClick={() => reproducir(c)}
                          className="relative block aspect-video w-full overflow-hidden rounded-ng-lg border border-white/10 text-left transition hover:border-ng-azul/50"
                          title={t("destacados.reproducir")}
                        >
                          <Miniatura ep={reciente} className="h-full w-full rounded-none" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                            <Play size={28} className="text-white opacity-0 drop-shadow transition group-hover:opacity-100" aria-hidden />
                          </span>
                          <span className="absolute bottom-2 left-2 rounded-md bg-ng-violeta px-1.5 py-0.5 text-xs font-bold tabular-nums text-ng-tinta">
                            {c.puntuacion}
                          </span>
                        </button>
                        <p className="mt-2 text-[11px] uppercase tracking-wide text-ng-lila">{c.motivo in MOTIVOS ? t(`motivos.${c.motivo as Motivo}`) : c.motivo}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">{c.titulo}</p>
                        <div className="mt-1 flex items-center justify-between text-xs text-ng-tenue">
                          <span className="tabular-nums">
                            {reloj(c.desdeSeg)} – {reloj(c.hastaSeg)}
                          </span>
                          <Link href={`/episodios/${reciente._id}/clips/${c._id}`} className="text-ng-celeste hover:underline">
                            {t("destacados.editar")}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {otrosListos.length > 0 && (
            <section>
              <Encabezado titulo={t("otros.titulo")} detalle={t("otros.detalle")} />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {otrosListos.map(({ ep, e }) => (
                  <TarjetaEpisodio key={ep._id} ep={ep} etapa={e} />
                ))}
              </div>
            </section>
          )}

          {enCamino.length > 0 && (
            <section>
              <Encabezado titulo={t("enCamino.titulo")} detalle={t("enCamino.detalle")} />
              <ul className="divide-y divide-white/5 overflow-hidden rounded-ng-xl border border-white/10 bg-ng-tarjeta">
                {enCamino.map(({ ep, e }) => (
                  <li key={ep._id}>
                    <Link href={`/episodios/${ep._id}`} className="flex items-center gap-4 px-4 py-3 transition hover:bg-white/5">
                      <Miniatura ep={ep} className="h-10 w-16" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{ep.titulo || ep.nombreArchivo}</p>
                        <p className={`mt-0.5 text-xs ${e.falla ? "text-red-400" : "text-ng-celeste"}`}>{e.texto}</p>
                      </div>
                      {!e.falla && <Loader2 size={16} className="shrink-0 animate-spin text-ng-tenue" aria-hidden />}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Link href="/episodios" className="inline-flex items-center gap-1.5 text-sm text-ng-celeste hover:underline">
            {t("verEpisodios")} <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      )}

      {esAdmin && (
        <Link
          href="/revision"
          className="mt-12 flex items-center gap-4 rounded-ng-xl border border-white/10 bg-ng-superficie/40 p-4 transition hover:bg-white/5"
        >
          <Clapperboard size={20} className="text-ng-lila" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-medium">{t("reaccion.titulo")}</p>
            <p className="text-xs text-ng-secundario">
              {colaReaccion ? t("reaccion.esperando", { n: colaReaccion }) : t("reaccion.nada")}
            </p>
          </div>
          <ArrowRight size={16} className="text-ng-tenue" aria-hidden />
        </Link>
      )}
    </DashboardLayout>
  );
}

function Cifra({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-ng-tarjeta px-3 py-1 text-ng-secundario">
      <span className="font-semibold text-ng-texto">{valor}</span> {etiqueta}
    </span>
  );
}

function Encabezado({
  titulo,
  detalle,
  cuenta,
  accion,
}: {
  titulo: string;
  detalle?: string;
  cuenta?: number;
  accion?: { href: string; texto: string; destacada?: boolean };
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          {titulo}
          {cuenta !== undefined && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-ng-secundario">{cuenta}</span>
          )}
        </h2>
        {detalle && <p className="text-sm text-ng-tenue">{detalle}</p>}
      </div>
      {accion &&
        (accion.destacada ? (
          <Link
            href={accion.href}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-ng-md bg-ng-violeta/90 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
          >
            <Sparkles size={13} aria-hidden /> {accion.texto}
          </Link>
        ) : (
          <Link href={accion.href} className="inline-flex shrink-0 items-center gap-1 text-sm text-ng-celeste hover:underline">
            {accion.texto} <ArrowRight size={14} aria-hidden />
          </Link>
        ))}
    </div>
  );
}

function Miniatura({ ep, className }: { ep: EpisodioResumen; className: string }) {
  return ep.miniaturaUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={ep.miniaturaUrl} alt="" className={`shrink-0 rounded-md object-cover ${className}`} />
  ) : (
    <div className={`shrink-0 rounded-md bg-gradient-to-br from-[#262624] to-[#0A0A0A] ${className}`} />
  );
}

function TarjetaEpisodio({ ep, etapa: e }: { ep: EpisodioResumen; etapa: ReturnType<typeof etapa> }) {
  const t = useTranslations("panel");
  return (
    <Link
      href={`/episodios/${ep._id}`}
      className="group overflow-hidden rounded-ng-xl border border-white/10 bg-ng-tarjeta transition hover:border-ng-azul/50"
    >
      <Miniatura ep={ep} className="aspect-video w-full rounded-none" />
      <div className="p-4">
        <p className="truncate font-semibold">{ep.titulo || ep.nombreArchivo}</p>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-ng-teal">
            <Sparkles size={12} aria-hidden /> {e.texto}
          </span>
          {duracion(t, ep.duracionSeg) && <span className="text-ng-tenue">{duracion(t, ep.duracionSeg)}</span>}
        </div>
      </div>
    </Link>
  );
}
