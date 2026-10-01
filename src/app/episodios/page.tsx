"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  BORRAR_EPISODIO,
  CONFIRMAR_SUBIDA_EPISODIO,
  EPISODIOS,
  PREPARAR_SUBIDA_EPISODIO,
  RENOVAR_SUBIDA_EPISODIO,
  TRANSCRIBIR_EPISODIO,
  IMPORTAR_DE_RESTREAM,
} from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ImportarDeRestream } from "@/components/episodios/ImportarDeRestream";
import { SelloDeAutoria, type Autoria } from "@/components/SelloDeAutoria";
import { colorDeMarca, useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";
import {
  iniciarSubidaTus,
  type CredencialesTus,
  type EstadoSubida,
  type SubidaEpisodio,
} from "@/lib/subida-episodio";

type EstadoEpisodio = "SUBIENDO" | "PROCESANDO" | "LISTO" | "FALLIDO";
type EstadoTranscripcion = "EN_COLA" | "TRANSCRIBIENDO" | "LISTA" | "FALLIDA";

interface Episodio {
  _id: string;
  titulo: string;
  /** "restream:…" si Bunny lo trajo de una URL en vez de subirse. */
  importadoDe?: string | null;
  /** 0-100 mientras Bunny lo procesa. */
  progresoBunny?: number | null;
  /** El live que trae el worker por partes: bajar 0-40 %, comprimir 40-75 %, subir 75-100 %. */
  estadoImportacion?: "EN_COLA" | "BAJANDO" | "COMPRIMIENDO" | "SUBIENDO" | "LISTA" | "FALLIDA" | null;
  progresoImportacion?: number | null;
  errorImportacion?: string | null;
  nombreArchivo: string;
  tamanoBytes: number;
  estado: EstadoEpisodio;
  duracionSeg?: number | null;
  miniaturaUrl?: string | null;
  error?: string | null;
  estadoTranscripcion?: EstadoTranscripcion | null;
  progresoTranscripcion?: number | null;
  errorTranscripcion?: string | null;
  palabrasTranscritas?: number | null;
  costoTranscripcionUsd?: number | null;
  estadoMomentos?: "EN_COLA" | "ANALIZANDO" | "LISTO" | "FALLIDO" | null;
  clipsSugeridos?: number | null;
  createdAt: string;
  subidoPor?: Autoria | null;
}

/** La subida en curso en ESTA pestaña. Las de otras pestañas solo se ven en la lista. */
interface SubidaActiva {
  episodioId: string;
  nombre: string;
  retomada: boolean;
  subidos: number;
  total: number;
  estado: EstadoSubida;
  mensaje?: string;
  /** Para la velocidad: bytes y hora en que arrancó esta sesión de subida. */
  inicio: { bytes: number; en: number } | null;
}

const ESTILO_ESTADO: Record<EstadoEpisodio, { etiqueta: string; clase: string }> = {
  SUBIENDO: { etiqueta: "A medio subir", clase: "bg-amber-500/15 text-amber-300" },
  PROCESANDO: { etiqueta: "Procesando en Bunny", clase: "bg-sky-500/15 text-sky-300" },
  LISTO: { etiqueta: "Listo para transcribir", clase: "bg-ng-teal/15 text-ng-teal" },
  FALLIDO: { etiqueta: "Falló", clase: "bg-red-500/15 text-red-400" },
};

/** Un episodio LISTO en Bunny se muestra por el estado de su transcripción. */
function estiloDe(ep: Episodio): { etiqueta: string; clase: string } {
  if (ep.estado === "SUBIENDO" && ep.importadoDe) {
    switch (ep.estadoImportacion) {
      case "FALLIDA":
        return { etiqueta: "Falló la importación", clase: "bg-red-500/15 text-red-400" };
      case "BAJANDO":
        return { etiqueta: `Bajando de Restream · ${ep.progresoImportacion ?? 0}%`, clase: "bg-sky-500/15 text-sky-300" };
      case "COMPRIMIENDO":
        return { etiqueta: `Comprimiendo · ${ep.progresoImportacion ?? 0}%`, clase: "bg-sky-500/15 text-sky-300" };
      case "SUBIENDO":
        return { etiqueta: `Subiendo a Bunny · ${ep.progresoImportacion ?? 0}%`, clase: "bg-sky-500/15 text-sky-300" };
      case "LISTA":
        return ESTILO_ESTADO.PROCESANDO;
      default:
        return { etiqueta: "En fila para traer", clase: "bg-sky-500/15 text-sky-300" };
    }
  }
  if (ep.estado !== "LISTO" || !ep.estadoTranscripcion) return ESTILO_ESTADO[ep.estado];
  switch (ep.estadoTranscripcion) {
    case "EN_COLA":
      return { etiqueta: "En cola para transcribir", clase: "bg-sky-500/15 text-sky-300" };
    case "TRANSCRIBIENDO":
      return {
        etiqueta: `Transcribiendo · ${ep.progresoTranscripcion ?? 0}%`,
        clase: "bg-sky-500/15 text-sky-300",
      };
    case "LISTA":
      // Transcrito: lo que importa ahora es la búsqueda de clips (ng-creator-be#68).
      switch (ep.estadoMomentos) {
        case "EN_COLA":
        case "ANALIZANDO":
          return { etiqueta: "Buscando momentos", clase: "bg-sky-500/15 text-sky-300" };
        case "LISTO":
          return {
            etiqueta: `${ep.clipsSugeridos ?? 0} clips sugeridos`,
            clase: "bg-ng-teal/15 text-ng-teal",
          };
        case "FALLIDO":
          return { etiqueta: "Falló la búsqueda de clips", clase: "bg-red-500/15 text-red-400" };
        default:
          return { etiqueta: "Transcrito", clase: "bg-ng-teal/15 text-ng-teal" };
      }
    case "FALLIDA":
      return { etiqueta: "Falló la transcripción", clase: "bg-red-500/15 text-red-400" };
  }
}

export default function EpisodiosPage() {
  const { activa } = useMarcaActiva();
  const { puedeOperar } = useSesion();
  // Los episodios son de la marca, no de una cuenta: uno largo se recorta
  // después para cualquier red (ng-creator-be#58).
  const marcaId = activa?._id ?? null;
  const opera = puedeOperar(marcaId);

  const [subida, setSubida] = useState<SubidaActiva | null>(null);
  const [error, setError] = useState<string | null>(null);
  const control = useRef<SubidaEpisodio | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const { data, loading, refetch, startPolling, stopPolling } = useQuery(EPISODIOS, {
    variables: { marcaId: marcaId ?? "" },
    skip: !marcaId,
    notifyOnNetworkStatusChange: false,
  });
  const episodios: Episodio[] = data?.episodios ?? [];

  const [preparar] = useMutation(PREPARAR_SUBIDA_EPISODIO);
  const [renovarFirma] = useMutation(RENOVAR_SUBIDA_EPISODIO);
  const [confirmar] = useMutation(CONFIRMAR_SUBIDA_EPISODIO);
  const [borrar] = useMutation(BORRAR_EPISODIO);
  const [pedirTranscripcion] = useMutation(TRANSCRIBIR_EPISODIO);
  const [importarDeRestream] = useMutation(IMPORTAR_DE_RESTREAM);

  // Se consulta seguido solo mientras haya algo pendiente. Consultar es lo que
  // hace que el backend le pregunte a Bunny, así que es lo que mueve un
  // episodio de "procesando" a "listo". La transcripción la avanza el worker
  // solo; consultar ahí es para ver el progreso.
  const hayPendientes = episodios.some(
    (e) =>
      e.estado === "SUBIENDO" ||
      e.estadoImportacion === "EN_COLA" ||
      e.estadoImportacion === "BAJANDO" ||
      e.estadoImportacion === "COMPRIMIENDO" ||
      e.estadoImportacion === "SUBIENDO" ||
      e.estado === "PROCESANDO" ||
      e.estadoTranscripcion === "EN_COLA" ||
      e.estadoTranscripcion === "TRANSCRIBIENDO" ||
      e.estadoMomentos === "EN_COLA" ||
      e.estadoMomentos === "ANALIZANDO",
  );
  useEffect(() => {
    if (hayPendientes) startPolling(15_000);
    else stopPolling();
    return () => stopPolling();
  }, [hayPendientes, startPolling, stopPolling]);

  // Cerrar la pestaña corta la subida. Se puede retomar, pero conviene avisar.
  const subiendo =
    subida !== null && subida.estado !== "terminada" && subida.estado !== "pausada";
  useEffect(() => {
    if (!subiendo) return;
    function avisar(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [subiendo]);

  // Irse a otra sección desmonta la pantalla y frena la subida: dejarla
  // corriendo sin nadie que muestre el progreso ni confirme al terminar sería
  // peor. No se pierde lo subido: al volver y elegir el mismo archivo, sigue.
  useEffect(() => () => control.current?.detener(), []);

  async function elegirArchivo(archivo: File) {
    if (!marcaId) return;
    setError(null);
    control.current?.detener();

    let cred: CredencialesTus & { retomada: boolean; episodio: Episodio };
    try {
      const r = await preparar({
        variables: {
          input: {
            marcaId,
            nombreArchivo: archivo.name,
            tamanoBytes: archivo.size,
            tipoArchivo: archivo.type || null,
          },
        },
      });
      cred = r.data.prepararSubidaEpisodio;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo preparar la subida");
      return;
    }

    const episodioId = cred.episodio._id;
    setSubida({
      episodioId,
      nombre: archivo.name,
      retomada: cred.retomada,
      subidos: 0,
      total: archivo.size,
      estado: "subiendo",
      inicio: null,
    });
    void refetch();

    try {
      control.current = await iniciarSubidaTus({
        archivo,
        titulo: cred.episodio.titulo,
        credenciales: cred,
        renovar: async () => {
          const r = await renovarFirma({ variables: { id: episodioId, marcaId } });
          return r.data.renovarSubidaEpisodio as CredencialesTus;
        },
        onProgreso: (subidos, total) =>
          setSubida((s) =>
            s && {
              ...s,
              subidos,
              total,
              // El primer dato de progreso marca desde dónde se mide la
              // velocidad. Si se retomó, arranca en el offset y no en cero:
              // contar lo ya subido inflaría la velocidad.
              inicio: s.inicio ?? { bytes: subidos, en: Date.now() },
            },
          ),
        onEstado: (estado, mensaje) => {
          setSubida((s) =>
            s && {
              ...s,
              estado,
              mensaje,
              inicio: estado === "subiendo" ? s.inicio : null,
            },
          );
          if (estado === "terminada") void alTerminar(episodioId);
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar la subida");
    }
  }

  async function alTerminar(episodioId: string) {
    if (!marcaId) return;
    try {
      await confirmar({ variables: { id: episodioId, marcaId } });
    } catch {
      // No es grave: la lista le pregunta a Bunny sola en la próxima consulta.
    }
    void refetch();
  }

  /** Pide otra vez el live a Restream (link nuevo) y vuelve a la fila. */
  async function reintentarImportacion(ep: Episodio) {
    const eventoId = ep.importadoDe?.split(":")[1];
    if (!marcaId || !eventoId) return;
    setError(null);
    try {
      await importarDeRestream({ variables: { marcaId, eventoId } });
      void refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reintentar");
    }
  }

  async function transcribir(ep: Episodio) {
    if (!marcaId) return;
    try {
      await pedirTranscripcion({ variables: { id: ep._id, marcaId } });
      void refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo pedir la transcripción");
    }
  }

  async function descartar(ep: Episodio) {
    if (!marcaId) return;
    const aviso =
      ep.estado === "SUBIENDO"
        ? `¿Descartar "${ep.titulo}"? Se pierde lo que ya se subió.`
        : `¿Borrar "${ep.titulo}"? Se borra también de Bunny.`;
    if (!window.confirm(aviso)) return;
    if (subida?.episodioId === ep._id) {
      control.current?.detener();
      control.current = null;
      setSubida(null);
    }
    try {
      await borrar({ variables: { id: ep._id, marcaId } });
      void refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar");
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Episodios</h1>
          <p className="mt-1 max-w-xl text-white/50">
            Episodios largos de podcast en video. Se suben directo a Bunny, por
            partes: si se corta la conexión, siguen desde donde quedaron.
          </p>
        </div>
        {activa && (
          <div
            style={{ borderLeftColor: colorDeMarca(activa) }}
            className="rounded-lg border border-l-4 border-white/10 bg-white/5 px-3 py-2"
          >
            <span className="block text-[10px] uppercase tracking-wider text-white/35">
              Episodios de
            </span>
            <span className="block text-sm font-medium">{activa.nombre}</span>
          </div>
        )}
      </div>

      {!marcaId ? (
        <p className="text-sm text-amber-400">Sin marca activa: no hay dónde subir.</p>
      ) : (
        <>
          {opera && (
            <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5">
              <input
                ref={input}
                type="file"
                accept="video/*,.mov,.mkv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  // Se limpia para que elegir el MISMO archivo otra vez (que es
                  // como se retoma) vuelva a disparar el evento.
                  e.target.value = "";
                  if (f) void elegirArchivo(f);
                }}
              />

              {subida && subida.estado !== "terminada" ? (
                <PanelSubida
                  subida={subida}
                  onPausar={() => control.current?.pausar()}
                  onReanudar={() => control.current?.reanudar()}
                />
              ) : (
                <button
                  onClick={() => input.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-white/20 py-10 text-sm text-white/60 transition hover:border-ng-azul/60 hover:text-white"
                >
                  <span className="block text-3xl">🎙️</span>
                  <span className="mt-2 block font-medium">Subir un episodio</span>
                  <span className="mt-1 block text-xs text-white/40">
                    mp4, mov, webm o mkv · hasta 50 GB
                  </span>
                </button>
              )}

              {subida?.estado === "terminada" && (
                <p className="mt-3 text-sm text-ng-teal">
                  “{subida.nombre}” subido. Bunny lo está procesando; en unos
                  minutos aparece con su duración.
                </p>
              )}
              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
              <ImportarDeRestream marcaId={marcaId} onImportado={() => void refetch()} />
            </section>
          )}

          {loading && !data ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-ng-azul border-t-transparent" />
            </div>
          ) : episodios.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white/50">
              Todavía no hay episodios en {activa?.nombre ?? "esta marca"}.
            </div>
          ) : (
            <ul className="space-y-3">
              {episodios.map((ep) => (
                <FilaEpisodio
                  key={ep._id}
                  ep={ep}
                  enEstaPestana={subida?.episodioId === ep._id}
                  puedeBorrar={opera}
                  onBorrar={() => void descartar(ep)}
                  onTranscribir={opera ? () => void transcribir(ep) : undefined}
                  onReintentarImportacion={opera && marcaId ? () => void reintentarImportacion(ep) : undefined}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

function PanelSubida({
  subida,
  onPausar,
  onReanudar,
}: {
  subida: SubidaActiva;
  onPausar: () => void;
  onReanudar: () => void;
}) {
  const pct = subida.total ? (subida.subidos / subida.total) * 100 : 0;
  const velocidad = velocidadBytesPorSeg(subida);
  const restanteSeg =
    velocidad > 0 ? (subida.total - subida.subidos) / velocidad : null;
  const frenada =
    subida.estado === "pausada" ||
    subida.estado === "error" ||
    subida.estado === "sin-conexion";

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="truncate text-sm font-medium">
          {subida.retomada ? "Retomando " : "Subiendo "}
          <span className="text-white/70">{subida.nombre}</span>
        </p>
        <p className="text-xs tabular-nums text-white/50">
          {gb(subida.subidos)} de {gb(subida.total)} · {pct.toFixed(1)}%
        </p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full transition-[width] duration-500 ${
            frenada ? "bg-amber-400" : "bg-marca"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-white/45">
        <span>
          {subida.estado === "subiendo" && velocidad > 0
            ? `${(velocidad / 1024 / 1024).toFixed(1)} MB/s · quedan ${duracion(restanteSeg ?? 0)}`
            : subida.estado === "pausada"
              ? "En pausa"
              : (subida.mensaje ?? "Conectando con Bunny…")}
        </span>
        {frenada ? (
          <button
            onClick={onReanudar}
            className="rounded-lg bg-marca px-3 py-1.5 font-medium text-white"
          >
            Reanudar
          </button>
        ) : (
          <button
            onClick={onPausar}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-white/70 hover:bg-white/5"
          >
            Pausar
          </button>
        )}
      </div>
      {(subida.estado === "error" || subida.estado === "sin-conexion") && subida.mensaje && (
        <p className="mt-2 text-xs text-amber-300">{subida.mensaje}</p>
      )}
      <p className="mt-3 text-[11px] text-white/30">
        Si cerrás la pestaña, volvé acá y elegí el mismo archivo: sigue desde
        donde quedó.
      </p>
    </div>
  );
}

function FilaEpisodio({
  ep,
  enEstaPestana,
  puedeBorrar,
  onBorrar,
  onTranscribir,
  onReintentarImportacion,
}: {
  ep: Episodio;
  enEstaPestana: boolean;
  puedeBorrar: boolean;
  onBorrar: () => void;
  /** Sin esto (rol que solo ve) no hay botón. */
  onTranscribir?: () => void;
  onReintentarImportacion?: () => void;
}) {
  const estilo = estiloDe(ep);
  // Los nuevos entran solos a la fila. El botón es para los que quedaron
  // listos antes de la transcripción, y para reintentar los que fallaron.
  const botonTranscribir =
    ep.estado === "LISTO" && (!ep.estadoTranscripcion || ep.estadoTranscripcion === "FALLIDA")
      ? ep.estadoTranscripcion === "FALLIDA"
        ? "Reintentar"
        : "Transcribir"
      : null;
  return (
    <li className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      {/* Fondo y no <img>: next/image pediría registrar el dominio de Bunny, y
          un <img> suelto suma un aviso de lint sobre un tope que no puede subir. */}
      <div
        className="h-16 w-28 shrink-0 rounded-lg bg-white/5 bg-cover bg-center"
        style={
          ep.miniaturaUrl ? { backgroundImage: `url(${ep.miniaturaUrl})` } : undefined
        }
      />
      <div className="min-w-0 flex-1">
        {ep.estado === "LISTO" ? (
          <Link
            href={`/episodios/${ep._id}`}
            className="block truncate font-medium hover:text-ng-celeste"
          >
            {ep.titulo}
          </Link>
        ) : (
          <p className="truncate font-medium">{ep.titulo}</p>
        )}
        <p className="mt-0.5 text-xs text-white/45">
          {ep.duracionSeg ? `${duracion(ep.duracionSeg)} · ` : ""}
          {gb(ep.tamanoBytes)}
        </p>
        {ep.importadoDe && ((ep.estadoImportacion && ep.estadoImportacion !== "LISTA") || ep.estado === "FALLIDO") && (
          <BarraImportando ep={ep} onReintentar={onReintentarImportacion} />
        )}
        {ep.estado === "PROCESANDO" && (
          <BarraProcesando
            progreso={ep.progresoBunny ?? 0}
            transcripcion={ep.estadoTranscripcion === "TRANSCRIBIENDO" ? (ep.progresoTranscripcion ?? 0) : ep.estadoTranscripcion}
          />
        )}
        {ep.estado === "SUBIENDO" && !ep.importadoDe && !enEstaPestana && (
          <p className="mt-0.5 text-xs text-amber-300/80">
            Quedó a medias. Elegí “{ep.nombreArchivo}” otra vez para retomarlo.
          </p>
        )}
        {ep.error && !ep.importadoDe && <p className="mt-0.5 text-xs text-red-400">{ep.error}</p>}
        {ep.estadoTranscripcion === "FALLIDA" && ep.errorTranscripcion && (
          <p className="mt-0.5 text-xs text-red-400">{ep.errorTranscripcion}</p>
        )}
        {ep.estadoTranscripcion === "LISTA" && (
          <p className="mt-0.5 text-xs text-white/45">
            {(ep.palabrasTranscritas ?? 0).toLocaleString("es")} palabras
            {ep.costoTranscripcionUsd != null &&
              ` · costó US$${ep.costoTranscripcionUsd.toFixed(2)}`}
          </p>
        )}
        <SelloDeAutoria accion="Subido" autoria={ep.subidoPor} />
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${estilo.clase}`}>
        {estilo.etiqueta}
      </span>
      {botonTranscribir && onTranscribir && (
        <button
          onClick={onTranscribir}
          className="shrink-0 rounded-lg bg-marca px-3 py-1.5 text-xs font-medium text-white"
        >
          {botonTranscribir}
        </button>
      )}
      {puedeBorrar && (
        <button
          onClick={onBorrar}
          title={ep.estado === "SUBIENDO" ? "Descartar" : "Borrar"}
          className="shrink-0 rounded-lg px-2 py-1 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
        >
          ✕
        </button>
      )}
    </li>
  );
}

function useAhora(ms: number): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setAhora(Date.now()), ms);
    return () => clearInterval(i);
  }, [ms]);
  return ahora;
}

/**
 * El live de Restream que trae el worker por partes: cuánto lleva (bajar es
 * 0-50 %, subir 50-100 %), cuánto falta según cómo viene avanzando, y si
 * falló, el motivo y "Reintentar" (sigue desde lo que ya bajó).
 */
function BarraImportando({ ep, onReintentar }: { ep: Episodio; onReintentar?: () => void }) {
  const ahora = useAhora(5_000);
  const p = ep.progresoImportacion ?? 0;
  // La primera vez que se ve avanzar: con eso se calcula cuánto falta.
  const [inicio, setInicio] = useState<{ p: number; t: number } | null>(null);
  if (ep.estadoImportacion !== "FALLIDA" && p > 0 && (!inicio || p < inicio.p)) setInicio({ p, t: ahora });
  const falta =
    inicio && p - inicio.p >= 1 ? Math.round((((ahora - inicio.t) / (p - inicio.p)) * (100 - p)) / 60_000) : null;
  if (ep.estadoImportacion === "FALLIDA" || ep.estado === "FALLIDO") {
    return (
      <div className="mt-1.5 max-w-md text-xs">
        <p className="text-red-400">No se pudo traer: {ep.errorImportacion ?? ep.error ?? "error desconocido"}</p>
        {onReintentar && (
          <button onClick={onReintentar} className="mt-1 rounded-lg bg-marca px-2.5 py-1 font-medium text-white">
            Reintentar (sigue desde lo que ya bajó)
          </button>
        )}
      </div>
    );
  }
  const paso =
    ep.estadoImportacion === "SUBIENDO"
      ? "③ Subiendo a Bunny"
      : ep.estadoImportacion === "COMPRIMIENDO"
        ? "② Comprimiendo a 1440p y 30 fps (pesa ~la mitad)"
        : ep.estadoImportacion === "BAJANDO"
          ? "① Bajando de Restream"
          : "En fila: arranca en unos segundos";
  return (
    <div className="mt-1.5 max-w-md">
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-sky-400 transition-all duration-700" style={{ width: `${Math.max(3, p)}%` }} />
      </div>
      <p className="mt-1 text-xs text-sky-300/80">
        {paso} · {p}%{falta != null ? ` · faltan ~${Math.max(1, falta)} min` : ""}. Después Bunny lo procesa y se transcribe
        solo; no hace falta dejar la página abierta.
      </p>
    </div>
  );
}

/** Bunny procesando: acá sí informa el porcentaje. */
function BarraProcesando({ progreso, transcripcion }: { progreso: number; transcripcion?: number | string | null }) {
  return (
    <div className="mt-1.5 max-w-md">
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-sky-400 transition-all duration-700" style={{ width: `${Math.max(3, progreso)}%` }} />
      </div>
      <p className="mt-1 text-xs text-sky-300/80">
        Bunny lo está procesando · {progreso}%.{" "}
        {typeof transcripcion === "number"
          ? `Mientras, ya se está transcribiendo · ${transcripcion}%.`
          : transcripcion === "EN_COLA"
            ? "Mientras, ya está en fila para transcribir."
            : transcripcion === "LISTA"
              ? "La transcripción ya está; los clips aparecen cuando Bunny termine."
              : "Después se transcribe solo."}
      </p>
    </div>
  );
}

function velocidadBytesPorSeg(s: SubidaActiva): number {
  if (!s.inicio) return 0;
  const seg = (Date.now() - s.inicio.en) / 1000;
  // Los primeros segundos dan cualquier cosa: el primer pedazo todavía no llegó.
  if (seg < 5) return 0;
  return (s.subidos - s.inicio.bytes) / seg;
}

function gb(bytes: number): string {
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/** 7243 → "2:00:43". */
function duracion(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return h ? `${h}:${mm}:${String(r).padStart(2, "0")}` : `${mm}:${String(r).padStart(2, "0")}`;
}
