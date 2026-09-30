"use client";

import { useState } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import {
  YOUTUBE_CANALES,
  YOUTUBE_CONFIGURADO,
  YOUTUBE_DESCONECTAR,
  YOUTUBE_SET_CANAL_ACTIVO,
  YOUTUBE_URL_DE_CONEXION,
} from "@/graphql/operations";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";

export interface CanalYoutube {
  _id: string;
  marcaId: string;
  canalId: string;
  nombre: string;
  miniaturaUrl?: string | null;
  activa: boolean;
  requiereReconexion: boolean;
}

/**
 * Los canales de YouTube de la marca activa (ng-creator-be#61).
 *
 * A diferencia de Facebook, un canal se conecta DESDE una marca que ya existe:
 * por eso trabaja sobre la marca elegida en la barra lateral, y es de su
 * propietario, no de un ADMIN.
 */
export function CanalesYoutube() {
  const { activa: marca } = useMarcaActiva();
  const { esPropietario } = useSesion();
  const marcaId = marca?._id;
  const mando = esPropietario(marcaId);

  const { data: estado } = useQuery(YOUTUBE_CONFIGURADO, { errorPolicy: "all" });
  const { data, loading } = useQuery(YOUTUBE_CANALES, {
    variables: { marcaId },
    skip: !marcaId,
    errorPolicy: "all",
  });
  const refetchQueries = [{ query: YOUTUBE_CANALES, variables: { marcaId } }];

  const [pedirUrl, { loading: pidiendoUrl }] = useLazyQuery(
    YOUTUBE_URL_DE_CONEXION,
    { fetchPolicy: "network-only" },
  );
  const [setActivo] = useMutation(YOUTUBE_SET_CANAL_ACTIVO, { refetchQueries });
  const [desconectar] = useMutation(YOUTUBE_DESCONECTAR, { refetchQueries });
  const [error, setError] = useState<string | null>(null);

  const configurado: boolean = estado?.youtubeConfigurado ?? false;
  const canales: CanalYoutube[] = data?.youtubeCanales ?? [];

  async function conectar() {
    setError(null);
    try {
      const { data: r, error: e } = await pedirUrl({ variables: { marcaId } });
      if (e) throw e;
      const url = r?.youtubeUrlDeConexion;
      if (!url) throw new Error("El backend no devolvió la URL de autorización");
      window.location.href = url;
    } catch (e: any) {
      setError(e?.message ?? "No se pudo iniciar la conexión");
    }
  }

  async function accion(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? "La operación falló");
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-[#FF0000] px-1.5 py-0.5 text-[10px] font-bold text-white">
          YouTube
        </span>
        <h2 className="font-semibold">
          Canales de {marca?.nombre ?? "la marca activa"}
        </h2>
        {loading && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
        )}
      </div>
      <p className="mb-4 text-sm text-white/50">
        Los Shorts de esta marca se suben a estos canales. Para otra marca,
        cambiala en la barra lateral.
      </p>

      {!configurado ? (
        <p className="rounded-lg border border-dashed border-white/15 p-3 text-xs text-white/40">
          El backend todavía no tiene las credenciales de Google
          (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REDIRECT_URI).
        </p>
      ) : !marca ? (
        <p className="text-xs text-white/40">Elegí una marca en la barra lateral.</p>
      ) : (
        <>
          {canales.length > 0 && (
            <div className="mb-4 space-y-2">
              {canales.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  {c.miniaturaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.miniaturaUrl}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full"
                    />
                  ) : (
                    <div className="h-9 w-9 shrink-0 rounded-full bg-white/10" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.nombre}</p>
                    {c.requiereReconexion ? (
                      <p className="text-xs text-amber-400">
                        Google revocó el acceso: hay que reconectarlo.
                      </p>
                    ) : (
                      <p className="text-xs text-white/40">
                        {c.activa ? "Habilitado como destino" : "Deshabilitado"}
                      </p>
                    )}
                  </div>
                  {mando && (
                    <div className="flex shrink-0 items-center gap-3 text-xs">
                      {c.requiereReconexion ? (
                        <button
                          onClick={conectar}
                          className="text-amber-400 hover:underline"
                        >
                          Reconectar
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            accion(() =>
                              setActivo({
                                variables: {
                                  marcaId,
                                  canalId: c.canalId,
                                  activa: !c.activa,
                                },
                              }),
                            )
                          }
                          className="text-white/60 hover:text-white hover:underline"
                        >
                          {c.activa ? "Deshabilitar" : "Habilitar"}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `¿Desconectar "${c.nombre}"? Lo programado para este canal va a fallar a su hora.`,
                            )
                          ) {
                            void accion(() =>
                              desconectar({
                                variables: { marcaId, canalId: c.canalId },
                              }),
                            );
                          }
                        }}
                        className="text-red-400/70 hover:text-red-400 hover:underline"
                      >
                        Desconectar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {mando ? (
            <button
              onClick={conectar}
              disabled={pidiendoUrl}
              className="rounded-lg bg-[#FF0000] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {pidiendoUrl
                ? "Abriendo Google…"
                : canales.length
                  ? "Conectar otro canal"
                  : "Conectar un canal de YouTube"}
            </button>
          ) : (
            <p className="text-xs text-white/40">
              Conectar canales es del propietario de la marca.
            </p>
          )}

          <p className="mt-3 text-[11px] text-white/30">
            Mientras Google no apruebe la app, solo pueden conectar las cuentas
            agregadas como testers y los videos suben como privados.
          </p>
        </>
      )}

      {error && (
        <p className="mt-3 break-words rounded-lg bg-red-500/10 p-2 text-xs text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
