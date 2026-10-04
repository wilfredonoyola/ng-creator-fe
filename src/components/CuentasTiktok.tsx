"use client";

import { useState } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import {
  TIKTOK_CONFIGURADO,
  TIKTOK_CUENTAS,
  TIKTOK_DESCONECTAR,
  TIKTOK_SET_CUENTA_ACTIVA,
  TIKTOK_URL_DE_CONEXION,
} from "@/graphql/operations";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";

export interface CuentaTiktok {
  _id: string;
  marcaId: string;
  openId: string;
  nombre: string;
  usuario?: string | null;
  avatarUrl?: string | null;
  activa: boolean;
  requiereReconexion: boolean;
}

/**
 * Las cuentas de TikTok de la marca activa (ng-creator-be#62). Misma forma que
 * CanalesYoutube: se conectan desde la marca y son de su propietario.
 */
export function CuentasTiktok() {
  const t = useTranslations("redesTiktok");
  const { activa: marca } = useMarcaActiva();
  const { esPropietario } = useSesion();
  const marcaId = marca?._id;
  const mando = esPropietario(marcaId);

  const { data: estado } = useQuery(TIKTOK_CONFIGURADO, { errorPolicy: "all" });
  const { data, loading } = useQuery(TIKTOK_CUENTAS, {
    variables: { marcaId },
    skip: !marcaId,
    errorPolicy: "all",
  });
  const refetchQueries = [{ query: TIKTOK_CUENTAS, variables: { marcaId } }];

  const [pedirUrl, { loading: pidiendoUrl }] = useLazyQuery(
    TIKTOK_URL_DE_CONEXION,
    { fetchPolicy: "network-only" },
  );
  const [setActiva] = useMutation(TIKTOK_SET_CUENTA_ACTIVA, { refetchQueries });
  const [desconectar] = useMutation(TIKTOK_DESCONECTAR, { refetchQueries });
  const [error, setError] = useState<string | null>(null);

  const configurado: boolean = estado?.tiktokConfigurado ?? false;
  const cuentas: CuentaTiktok[] = data?.tiktokCuentas ?? [];

  async function conectar() {
    setError(null);
    try {
      const { data: r, error: e } = await pedirUrl({ variables: { marcaId } });
      if (e) throw e;
      const url = r?.tiktokUrlDeConexion;
      if (!url) throw new Error(t("sinUrl"));
      window.location.href = url;
    } catch (e: any) {
      setError(e?.message ?? t("errorConectar"));
    }
  }

  async function accion(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? t("errorOperacion"));
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-black px-1.5 py-0.5 text-[10px] font-bold text-white ring-1 ring-white/20">
          TikTok
        </span>
        <h2 className="font-semibold">
          {marca?.nombre ? t("titulo", { marca: marca.nombre }) : t("tituloSinMarca")}
        </h2>
        {loading && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
        )}
      </div>
      <p className="mb-4 text-sm text-white/50">
        {t("descripcion")}
      </p>

      {!configurado ? (
        <p className="rounded-lg border border-dashed border-white/15 p-3 text-xs text-white/40">
          {t("sinCredenciales")}
        </p>
      ) : !marca ? (
        <p className="text-xs text-white/40">{t("eligeMarca")}</p>
      ) : (
        <>
          {cuentas.length > 0 && (
            <div className="mb-4 space-y-2">
              {cuentas.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  {c.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full" />
                  ) : (
                    <div className="h-9 w-9 shrink-0 rounded-full bg-white/10" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {c.nombre}
                      {c.usuario && (
                        <span className="ml-1.5 text-xs font-normal text-white/40">
                          @{c.usuario}
                        </span>
                      )}
                    </p>
                    {c.requiereReconexion ? (
                      <p className="text-xs text-amber-400">
                        {t("revocado")}
                      </p>
                    ) : (
                      <p className="text-xs text-white/40">
                        {c.activa ? t("habilitada") : t("deshabilitada")}
                      </p>
                    )}
                  </div>
                  {mando && (
                    <div className="flex shrink-0 items-center gap-3 text-xs">
                      {c.requiereReconexion ? (
                        <button onClick={conectar} className="text-amber-400 hover:underline">
                          {t("reconectar")}
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            accion(() =>
                              setActiva({
                                variables: { marcaId, openId: c.openId, activa: !c.activa },
                              }),
                            )
                          }
                          className="text-white/60 hover:text-white hover:underline"
                        >
                          {c.activa ? t("deshabilitar") : t("habilitar")}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              t("confirmarDesconectar", { nombre: c.nombre }),
                            )
                          ) {
                            void accion(() =>
                              desconectar({ variables: { marcaId, openId: c.openId } }),
                            );
                          }
                        }}
                        className="text-red-400/70 hover:text-red-400 hover:underline"
                      >
                        {t("desconectar")}
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
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 transition hover:bg-white/10 disabled:opacity-50"
            >
              {pidiendoUrl
                ? t("abriendo")
                : cuentas.length
                  ? t("conectarOtra")
                  : t("conectarPrimera")}
            </button>
          ) : (
            <p className="text-xs text-white/40">
              {t("soloPropietario")}
            </p>
          )}

          <p className="mt-3 text-[11px] text-white/30">
            {t("auditoria")}
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
