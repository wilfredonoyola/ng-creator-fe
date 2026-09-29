"use client";

import Link from "next/link";
import { useQuery } from "@apollo/client";
import { ArrowRight, Clapperboard, Loader2, Mic, Sparkles, Upload } from "lucide-react";
import { COLA_DE_REVISION, EPISODIOS } from "@/graphql/operations";
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

/**
 * Inicio: lo que te toca hoy en la marca activa. Primero lo que está en
 * camino, después lo que ya tiene clips para editar. Sin métricas de
 * adorno: cada bloque lleva a una acción.
 */
export default function InicioPage() {
  const { activa } = useMarcaActiva();
  const { usuario, esAdmin } = useSesion();
  const { data, loading } = useQuery(EPISODIOS, {
    variables: { marcaId: activa?._id ?? "", limite: 30 },
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
  const paraEditar = conEtapa.filter(({ e }) => e.listo).slice(0, 6);
  const clipsTotales = paraEditar.reduce((n, { ep }) => n + (ep.clipsSugeridos ?? 0), 0);

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const delMes = episodios.filter((ep) => new Date(ep.createdAt) >= inicioMes).length;

  const nombre = usuario?.nombre?.split(" ")[0];
  const colaReaccion = colaData?.colaDeRevision?.length ?? 0;

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
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

      <div className="mb-8 grid grid-cols-3 gap-3">
        <Cifra valor={delMes} etiqueta="Episodios este mes" />
        <Cifra valor={enCamino.length} etiqueta="En proceso" />
        <Cifra valor={clipsTotales} etiqueta="Clips para editar" />
      </div>

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
        <div className="space-y-10">
          {paraEditar.length > 0 && (
            <section>
              <Encabezado titulo="Listos para editar" detalle="La IA ya encontró los momentos" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {paraEditar.map(({ ep, e }) => (
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
    <div className="rounded-ng-lg border border-white/10 bg-ng-tarjeta p-4">
      <p className="text-2xl font-bold">{valor}</p>
      <p className="mt-0.5 text-xs text-ng-secundario">{etiqueta}</p>
    </div>
  );
}

function Encabezado({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <p className="text-sm text-ng-tenue">{detalle}</p>
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
