"use client";

import Link from "next/link";
import { useRef } from "react";
import { useQuery } from "@apollo/client";
import { ArrowRight, Clapperboard, Loader2, Mic, Play, Sparkles, Upload } from "lucide-react";
import { CLIPS_DE_EPISODIO, COLA_DE_REVISION, EPISODIOS } from "@/graphql/operations";
import { ReproductorEpisodio, type ControlReproductor } from "@/components/ReproductorEpisodio";
import { MOTIVOS, reloj } from "@/lib/momentos";
import { DashboardLayout } from "@/components/DashboardLayout";
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

/**
 * En qué punto del camino está un episodio, dicho como lo diría una persona.
 * `listo` es que ya tiene clips para editar; `falla` que necesita que alguien
 * lo mire.
 */
function etapa(ep: EpisodioResumen): { texto: string; listo: boolean; falla: boolean } {
  if (ep.estado === "FALLIDO" || ep.estadoTranscripcion === "FALLIDA" || ep.estadoMomentos === "FALLIDO")
    return { texto: "Necesita revisión", listo: false, falla: true };
  if (ep.estado === "SUBIENDO") return { texto: "A medio subir", listo: false, falla: false };
  if (ep.estado === "PROCESANDO") return { texto: "Procesando el video", listo: false, falla: false };
  if (ep.estadoTranscripcion === "TRANSCRIBIENDO")
    return { texto: `Transcribiendo · ${ep.progresoTranscripcion ?? 0}%`, listo: false, falla: false };
  if (ep.estadoTranscripcion !== "LISTA") return { texto: "En cola para transcribir", listo: false, falla: false };
  if (ep.estadoMomentos === "LISTO")
    return { texto: `${ep.clipsSugeridos ?? 0} clips para editar`, listo: true, falla: false };
  return { texto: "La IA busca los momentos", listo: false, falla: false };
}

function duracion(seg?: number | null) {
  if (!seg) return null;
  const h = Math.floor(seg / 3600);
  const m = Math.round((seg % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

/** Un clip del episodio reciente, con lo que el Inicio muestra de él. */
interface ClipResumen {
  _id: string;
  desdeSeg: number;
  hastaSeg: number;
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
  const { activa } = useMarcaActiva();
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
  const conEtapa = episodios.map((ep) => ({ ep, e: etapa(ep) }));
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
          <h1 className="text-2xl font-bold">{nombre ? `Hola, ${nombre}` : "Inicio"}</h1>
          <p className="mt-1 text-ng-secundario">
            {activa ? `Lo que te toca hoy en ${activa.nombre}.` : "Elegí una marca para empezar."}
          </p>
        </div>
        <Link
          href="/episodios"
          className="inline-flex items-center gap-2 rounded-ng-md bg-marca px-5 py-2.5 text-sm font-semibold text-white brillo-marca hover:brightness-110"
        >
          <Upload size={16} aria-hidden /> Subir episodio
        </Link>
      </div>

      {episodios.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 text-xs">
          <Cifra valor={delMes} etiqueta="episodios este mes" />
          <Cifra valor={enCamino.length} etiqueta="en proceso" />
          <Cifra valor={clipsTotales} etiqueta="clips para editar" />
        </div>
      )}

      {loading && !episodios.length ? (
        <div className="flex items-center gap-2 text-sm text-ng-secundario">
          <Loader2 size={16} className="animate-spin" aria-hidden /> Cargando episodios…
        </div>
      ) : !episodios.length ? (
        <div className="rounded-ng-xl border border-dashed border-white/15 bg-ng-tarjeta/60 p-10 text-center">
          <Mic size={36} className="mx-auto text-ng-celeste" aria-hidden />
          <p className="mt-4 text-lg font-semibold">Subí tu primer episodio</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ng-secundario">
            El video completo del podcast. Se transcribe solo y la IA te marca los mejores momentos para clips.
          </p>
          <Link
            href="/episodios"
            className="mt-6 inline-block rounded-ng-md bg-marca px-6 py-3 font-semibold text-white hover:brightness-110"
          >
            Subir episodio
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
                    titulo="Episodio reciente"
                    accion={{ href: `/episodios/${reciente._id}`, texto: "Abrir episodio" }}
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
                    {duracion(reciente.duracionSeg) && (
                      <span className="shrink-0 text-xs text-ng-tenue">{duracion(reciente.duracionSeg)}</span>
                    )}
                  </div>
                </section>

                {/* ---- Clips generados ---- */}
                <section className="flex min-w-0 flex-col rounded-ng-xl border border-white/10 bg-ng-tarjeta p-4">
                  <Encabezado
                    titulo="Clips generados"
                    cuenta={procesados.length}
                    accion={{ href: `/episodios/${reciente._id}`, texto: "Ver todos" }}
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
                              {reloj(c.hastaSeg - c.desdeSeg)}
                            </span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug">{c.titulo}</p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-ng-lg border border-dashed border-white/10 p-6 text-center">
                      <Clapperboard size={26} className="text-ng-tenue" aria-hidden />
                      <p className="mt-2 text-sm text-ng-secundario">Todavía no procesaste clips de este episodio.</p>
                      <p className="mt-0.5 text-xs text-ng-tenue">Elegí un momento de abajo, ajustalo y procesalo: aparece acá.</p>
                    </div>
                  )}
                </section>
              </div>

              {/* ---- Momentos destacados ---- */}
              {destacados.length > 0 && (
                <section className="rounded-ng-xl border border-white/10 bg-ng-tarjeta p-4">
                  <Encabezado
                    titulo="Momentos destacados (IA)"
                    detalle="Tocá uno para verlo arriba"
                    accion={{
                      href: `/episodios/${reciente._id}`,
                      texto: `Ver los ${clips.length} momentos`,
                      destacada: true,
                    }}
                  />
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {destacados.map((c) => (
                      <div key={c._id} className="group">
                        <button
                          onClick={() => reproducir(c)}
                          className="relative block aspect-video w-full overflow-hidden rounded-ng-lg border border-white/10 text-left transition hover:border-ng-azul/50"
                          title="Reproducir este momento arriba"
                        >
                          <Miniatura ep={reciente} className="h-full w-full rounded-none" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                            <Play size={28} className="text-white opacity-0 drop-shadow transition group-hover:opacity-100" aria-hidden />
                          </span>
                          <span className="absolute bottom-2 left-2 rounded-md bg-ng-violeta px-1.5 py-0.5 text-xs font-bold tabular-nums text-white">
                            {c.puntuacion}
                          </span>
                        </button>
                        <p className="mt-2 text-[11px] uppercase tracking-wide text-ng-lila">{MOTIVOS[c.motivo] ?? c.motivo}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">{c.titulo}</p>
                        <div className="mt-1 flex items-center justify-between text-xs text-ng-tenue">
                          <span className="tabular-nums">
                            {reloj(c.desdeSeg)} – {reloj(c.hastaSeg)}
                          </span>
                          <Link href={`/episodios/${reciente._id}/clips/${c._id}`} className="text-ng-celeste hover:underline">
                            Editar
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
              <Encabezado titulo="Otros episodios listos para editar" detalle="La IA ya encontró los momentos" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {otrosListos.map(({ ep, e }) => (
                  <TarjetaEpisodio key={ep._id} ep={ep} etapa={e} />
                ))}
              </div>
            </section>
          )}

          {enCamino.length > 0 && (
            <section>
              <Encabezado titulo="En proceso" detalle="Avanzan solos; se actualiza cada 20 segundos" />
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
            Ver todos los episodios <ArrowRight size={14} aria-hidden />
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
            <p className="text-sm font-medium">Videos de reacción</p>
            <p className="text-xs text-ng-secundario">
              {colaReaccion ? `${colaReaccion} esperando revisión` : "Nada esperando revisión"}
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
    <div className={`shrink-0 rounded-md bg-gradient-to-br from-[#1e293b] to-[#0b0f1a] ${className}`} />
  );
}

function TarjetaEpisodio({ ep, etapa: e }: { ep: EpisodioResumen; etapa: ReturnType<typeof etapa> }) {
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
          {duracion(ep.duracionSeg) && <span className="text-ng-tenue">{duracion(ep.duracionSeg)}</span>}
        </div>
      </div>
    </Link>
  );
}
