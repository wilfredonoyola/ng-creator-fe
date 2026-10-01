"use client";

import { useState } from "react";
import Link from "next/link";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import {
  IMPORTAR_DE_RESTREAM,
  RESTREAM_CONFIGURADO,
  RESTREAM_CUENTA,
  RESTREAM_DESCONECTAR,
  RESTREAM_EVENTOS,
  RESTREAM_URL_DE_CONEXION,
} from "@/graphql/operations";
import { useSesion } from "@/lib/sesion";

interface EventoRestream {
  id: string;
  titulo: string;
  portadaUrl?: string | null;
  empezoEn?: string | null;
  duracionSeg?: number | null;
  archivo?: string | null;
  grabacionVenceEn?: string | null;
  episodioId?: string | null;
}

function duracion(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.round((seg % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

/**
 * Traer la grabación de un live de Restream como episodio: sin esperar a que
 * YouTube la procese (puede tardar un día). Bunny la baja directo de Restream,
 * así que no hay nada que subir desde la computadora.
 */
export function ImportarDeRestream({ marcaId, onImportado }: { marcaId: string; onImportado: () => void }) {
  const { esPropietario } = useSesion();
  const mando = esPropietario(marcaId);
  const { data: conf } = useQuery(RESTREAM_CONFIGURADO, { errorPolicy: "all" });
  const cuentaQ = useQuery(RESTREAM_CUENTA, { variables: { marcaId }, errorPolicy: "all" });
  const cuenta = cuentaQ.data?.restreamCuenta;
  const [abierto, setAbierto] = useState(false);
  const eventosQ = useQuery(RESTREAM_EVENTOS, {
    variables: { marcaId },
    skip: !cuenta || cuenta.requiereReconexion || !abierto,
    fetchPolicy: "network-only",
  });
  const eventos: EventoRestream[] = eventosQ.data?.restreamEventos ?? [];
  const [pedirUrl, { loading: pidiendoUrl }] = useLazyQuery(RESTREAM_URL_DE_CONEXION, { fetchPolicy: "network-only" });
  const [importar] = useMutation(IMPORTAR_DE_RESTREAM);
  const [desconectar] = useMutation(RESTREAM_DESCONECTAR, {
    refetchQueries: [{ query: RESTREAM_CUENTA, variables: { marcaId } }],
  });
  const [importando, setImportando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!conf?.restreamConfigurado) return null;

  async function conectar() {
    setError(null);
    try {
      const { data: r, error: e } = await pedirUrl({ variables: { marcaId } });
      if (e) throw e;
      if (!r?.restreamUrlDeConexion) throw new Error("El backend no devolvió la URL de autorización");
      window.location.href = r.restreamUrlDeConexion;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar la conexión");
    }
  }

  async function traer(ev: EventoRestream) {
    setError(null);
    setImportando(ev.id);
    try {
      await importar({ variables: { marcaId, eventoId: ev.id } });
      await eventosQ.refetch();
      onImportado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo importar");
    } finally {
      setImportando(null);
    }
  }

  if (!cuenta || cuenta.requiereReconexion) {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
        <div>
          <p className="text-sm font-medium">📡 Traer el live desde Restream</p>
          <p className="text-xs text-white/50">
            {cuenta?.requiereReconexion
              ? "Restream pidió volver a conectar la cuenta."
              : "Sin esperar a que YouTube procese el video: la grabación llega directo."}
          </p>
        </div>
        {mando ? (
          <button
            onClick={() => void conectar()}
            disabled={pidiendoUrl}
            className="rounded-lg bg-ng-violeta px-3 py-1.5 text-xs font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            {cuenta?.requiereReconexion ? "Reconectar Restream" : "Conectar Restream"}
          </button>
        ) : (
          <span className="text-xs text-white/40">Lo conecta quien es propietario de la marca.</span>
        )}
        {error && <p className="w-full text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => setAbierto((a) => !a)} className="text-left">
          <p className="text-sm font-medium">📡 Traer un live desde Restream {abierto ? "▾" : "▸"}</p>
          <p className="text-xs text-white/50">Conectado como {cuenta.nombre}</p>
        </button>
        {mando && (
          <button
            onClick={() => window.confirm("¿Desconectar Restream de esta marca?") && void desconectar({ variables: { marcaId } })}
            className="text-xs text-white/40 hover:text-red-400"
          >
            Desconectar
          </button>
        )}
      </div>
      {abierto && (
        <div className="mt-3 space-y-2">
          {eventosQ.loading && <p className="text-xs text-white/40">Buscando tus lives…</p>}
          {!eventosQ.loading && !eventos.length && <p className="text-xs text-white/50">No hay lives terminados en Restream.</p>}
          {eventos.map((ev) => {
            const vence = ev.grabacionVenceEn ? new Date(ev.grabacionVenceEn) : null;
            const dias = vence ? Math.ceil((vence.getTime() - Date.now()) / 86_400_000) : null;
            return (
              <div key={ev.id} className="flex items-center gap-3 rounded-lg border border-white/10 p-2">
                <div
                  className="h-12 w-20 shrink-0 rounded bg-white/5 bg-cover bg-center"
                  style={ev.portadaUrl ? { backgroundImage: `url(${ev.portadaUrl})` } : undefined}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{ev.titulo}</p>
                  <p className="text-xs text-white/45">
                    {ev.empezoEn ? new Date(ev.empezoEn).toLocaleDateString("es", { day: "numeric", month: "short" }) : ""}
                    {ev.duracionSeg ? ` · ${duracion(ev.duracionSeg)}` : ""}
                    {dias != null && !ev.episodioId && (
                      <span className={dias <= 2 ? "text-amber-300" : ""}> · Restream la borra en {Math.max(0, dias)} día{dias === 1 ? "" : "s"}</span>
                    )}
                  </p>
                </div>
                {ev.episodioId ? (
                  <Link href={`/episodios/${ev.episodioId}`} className="shrink-0 text-xs text-ng-teal hover:underline">
                    ✓ Ya importado
                  </Link>
                ) : ev.archivo ? (
                  <button
                    onClick={() => void traer(ev)}
                    disabled={importando !== null}
                    className="shrink-0 rounded-lg bg-marca px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {importando === ev.id ? "Pidiendo…" : "Importar"}
                  </button>
                ) : (
                  <span className="shrink-0 text-xs text-white/35">Sin grabación</span>
                )}
              </div>
            );
          })}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
