"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useTranslations } from "next-intl";
import { Hash } from "lucide-react";
import { CORREGIR_NUMERACION_CLIP } from "@/graphql/operations";
import { NUMERO_MAXIMO, type NumeracionClip } from "@/lib/numeracion";

/**
 * "Programa 31 | Video 2" del clip, al programar, con la opción de cambiar
 * los números. Al cambiarlos avisa el encabezado de antes y el nuevo, para
 * que la pantalla lo cambie en el texto.
 */
export function NumeracionDelClip({
  marcaId,
  clipId,
  numeracion,
  opera,
  onCambio,
}: {
  marcaId: string;
  clipId: string;
  numeracion: NumeracionClip;
  opera: boolean;
  onCambio: (antes: string | null, despues: NumeracionClip | null) => void;
}) {
  const t = useTranslations("numeracion.delClip");
  const [corregir, { loading }] = useMutation(CORREGIR_NUMERACION_CLIP);
  const [editando, setEditando] = useState(false);
  const [n, setN] = useState({ programa: NaN, video: NaN, publicacion: NaN });
  const [error, setError] = useState<string | null>(null);

  function abrir() {
    setN({
      programa: numeracion.programa ?? NaN,
      video: numeracion.video ?? NaN,
      publicacion: numeracion.publicacion ?? NaN,
    });
    setError(null);
    setEditando(true);
  }

  const valido = (v: number) => Number.isInteger(v) && v >= 1 && v <= NUMERO_MAXIMO;
  const conPrograma = numeracion.programa != null;

  async function aplicar() {
    setError(null);
    try {
      const r = await corregir({
        variables: {
          marcaId,
          clipId,
          numeros: {
            programa: conPrograma && valido(n.programa) ? n.programa : null,
            video: conPrograma && valido(n.video) ? n.video : null,
            publicacion: valido(n.publicacion) ? n.publicacion : null,
          },
        },
      });
      onCambio(numeracion.encabezado, (r.data?.corregirNumeracionClip ?? null) as NumeracionClip | null);
      setEditando(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    }
  }

  const campo = (clave: keyof typeof n, etiqueta: string) => (
    <label className="block">
      <span className="block text-xs text-white/50">{etiqueta}</span>
      <input
        type="number"
        min={1}
        max={NUMERO_MAXIMO}
        value={Number.isNaN(n[clave]) ? "" : n[clave]}
        onChange={(e) => setN((x) => ({ ...x, [clave]: e.target.valueAsNumber }))}
        className="mt-0.5 w-24 rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-sm"
      />
    </label>
  );

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Hash size={14} className="shrink-0 text-marca" aria-hidden />
        {numeracion.encabezado ? (
          <span className="font-semibold">{numeracion.encabezado}</span>
        ) : (
          <span className="text-xs text-white/45">{t("sinPrograma")}</span>
        )}
        {!numeracion.asignada && <span className="text-xs text-white/40">· {t("seFijaAlProgramar")}</span>}
        {opera && !editando && (
          <button type="button" onClick={abrir} className="ml-auto text-xs text-ng-celeste hover:underline">
            {t("cambiar")}
          </button>
        )}
      </div>
      {editando && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-end gap-3">
            {conPrograma && campo("programa", t("programa"))}
            {conPrograma && campo("video", t("video"))}
            {campo("publicacion", t("publicacion"))}
          </div>
          {conPrograma && <p className="text-xs text-white/40">{t("programaAyuda")}</p>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void aplicar()}
              disabled={loading}
              className="rounded-lg bg-marca px-3 py-1.5 text-xs font-semibold text-ng-tinta hover:brightness-110 disabled:opacity-50"
            >
              {t("aplicar")}
            </button>
            <button type="button" onClick={() => setEditando(false)} className="text-xs text-white/60 hover:underline">
              {t("cancelar")}
            </button>
            {error && <span className="text-xs text-red-400">{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
