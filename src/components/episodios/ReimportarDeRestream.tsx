"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useTranslations } from "next-intl";
import { VOLVER_A_IMPORTAR_EPISODIO } from "@/graphql/operations";

export type EstadoReimportacion = "EN_COLA" | "BAJANDO" | "SUBIENDO" | "PROCESANDO" | "LISTA" | "FALLIDA";

export interface Reimportacion {
  estado: EstadoReimportacion;
  progreso?: number | null;
  error?: string | null;
  empezoEn?: string | null;
  terminoEn?: string | null;
}

/** Mientras está en uno de estos, la pantalla del episodio pregunta seguido. */
export function reimportando(r: Reimportacion | null | undefined): boolean {
  return r?.estado === "EN_COLA" || r?.estado === "BAJANDO" || r?.estado === "SUBIENDO" || r?.estado === "PROCESANDO";
}

/**
 * "Calidad del original": volver a traer de Restream la grabación sin
 * recomprimir. Reemplaza el video del episodio y conserva los clips (mismos
 * tiempos); después hay que volver a procesarlos para que salgan del original.
 */
export function ReimportarDeRestream({
  episodioId,
  marcaId,
  puedeReimportar,
  reimportacion,
  opera,
  anclaClips,
  onLanzada,
}: {
  episodioId: string;
  marcaId: string;
  puedeReimportar: boolean;
  reimportacion: Reimportacion | null | undefined;
  opera: boolean;
  /** Dónde está la lista de clips, para el "volvé a procesarlos". */
  anclaClips: string;
  onLanzada: () => void;
}) {
  const t = useTranslations("episodioReimportar");
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lanzar, { loading }] = useMutation(VOLVER_A_IMPORTAR_EPISODIO);

  const enCurso = reimportando(reimportacion);
  if (!puedeReimportar && !reimportacion) return null;

  async function confirmar() {
    setError(null);
    try {
      await lanzar({ variables: { id: episodioId, marcaId } });
      setConfirmando(false);
      onLanzada();
    } catch (e) {
      setConfirmando(false);
      setError(e instanceof Error ? e.message : t("errorLanzar"));
    }
  }

  const p = Math.round(Math.min(1, Math.max(0, reimportacion?.progreso ?? 0)) * 100);
  const fallida = reimportacion?.estado === "FALLIDA";

  return (
    <section className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3 text-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">{t("titulo")}</h3>

      {enCurso && reimportacion ? (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-marca transition-all duration-700"
              style={{ width: `${Math.max(3, p)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-white/60">
            {t("avance", { paso: t(`estados.${reimportacion.estado}`), p })}
          </p>
        </div>
      ) : (
        <>
          {reimportacion?.estado === "LISTA" && (
            <p className="mt-2 text-white/80">
              {t("lista")}{" "}
              <a href={anclaClips} className="text-ng-celeste hover:underline">
                {t("verClips")}
              </a>
            </p>
          )}
          {fallida && (
            <p className="mt-2 text-red-400">
              {t("fallida", { error: reimportacion?.error ?? t("sinDetalle") })}
            </p>
          )}
          {puedeReimportar && (
            <>
              <p className="mt-2 text-white/50">{t("explicacion")}</p>
              {opera && (
                <button
                  onClick={() => setConfirmando(true)}
                  disabled={loading}
                  className="mt-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
                >
                  {fallida ? t("reintentar") : t("boton")}
                </button>
              )}
            </>
          )}
        </>
      )}

      {error && <p className="mt-2 text-red-400">{error}</p>}

      {confirmando && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reimportar-titulo"
          onClick={() => !loading && setConfirmando(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-ng-superficie p-5"
          >
            <h2 id="reimportar-titulo" className="text-base font-semibold">
              {t("confirmar.titulo")}
            </h2>
            <p className="mt-2 text-sm text-white/60">{t("confirmar.detalle")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmando(false)}
                disabled={loading}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
              >
                {t("confirmar.cancelar")}
              </button>
              <button
                onClick={() => void confirmar()}
                disabled={loading}
                className="rounded-lg bg-marca px-3 py-1.5 text-sm font-medium text-ng-tinta hover:brightness-110 disabled:opacity-50"
              >
                {loading ? t("confirmar.lanzando") : t("confirmar.si")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
