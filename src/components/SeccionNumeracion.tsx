"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@apollo/client";
import { useTranslations } from "next-intl";
import { GUARDAR_AJUSTES_NUMERACION } from "@/graphql/operations";
import {
  FORMATO_NUMERACION_POR_DEFECTO,
  LARGO_MAXIMO_FORMATO,
  NUMERO_MAXIMO,
  VARIABLES_NUMERACION,
  ejemploFormato,
  formatoValido,
  useAjustesNumeracion,
  type AjustesNumeracion,
} from "@/lib/numeracion";

/**
 * La numeración en Brand Kit: "Programa 31 | Video 2" al inicio del texto de
 * cada publicación, de la portada de marca o de los dos. Se guarda aparte,
 * con su botón, como la portada de marca.
 *
 * Los contadores ("el próximo programa es el…") los mueve el backend al
 * programar; acá se fija desde dónde arrancan o se corrigen.
 */
export function SeccionNumeracion({ marcaId, opera }: { marcaId: string; opera: boolean }) {
  const t = useTranslations("numeracion");
  const { ajustes, cargando } = useAjustesNumeracion(marcaId);
  const [guardarMut, { loading: guardando }] = useMutation(GUARDAR_AJUSTES_NUMERACION, {
    refetchQueries: ["AjustesNumeracion", "NumeracionDeClip"],
  });
  const [a, setA] = useState<AjustesNumeracion | null>(null);
  const [cambiado, setCambiado] = useState(false);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  // Lo guardado pisa lo local al cargar o al cambiar de marca, no mientras se edita.
  useEffect(() => {
    if (ajustes) setA(ajustes);
    setCambiado(false);
  }, [ajustes, marcaId]);

  function cambiar(c: Partial<AjustesNumeracion>) {
    setA((x) => (x ? { ...x, ...c } : x));
    setCambiado(true);
    setAviso(null);
  }

  async function guardar() {
    if (!a) return;
    setAviso(null);
    try {
      await guardarMut({
        variables: {
          marcaId,
          ajustes: {
            activa: a.activa,
            formato: a.formato.trim(),
            enTexto: a.enTexto,
            enPortada: a.enPortada,
            siguientePrograma: a.siguientePrograma,
            siguientePublicacion: a.siguientePublicacion,
          },
        },
      });
      setCambiado(false);
      setAviso({ tono: "ok", texto: t("guardado") });
    } catch (e) {
      setAviso({ tono: "error", texto: e instanceof Error ? e.message : t("errorGuardar") });
    }
  }

  const valido =
    a != null &&
    formatoValido(a.formato) &&
    [a.siguientePrograma, a.siguientePublicacion].every((n) => Number.isInteger(n) && n >= 1 && n <= NUMERO_MAXIMO);
  const numero = (valor: number, onCambio: (n: number) => void, etiqueta: string, ayuda: string) => (
    <label className="block">
      <span className="block text-xs text-white/60">{etiqueta}</span>
      <input
        type="number"
        min={1}
        max={NUMERO_MAXIMO}
        value={Number.isNaN(valor) ? "" : valor}
        onChange={(e) => onCambio(e.target.valueAsNumber)}
        disabled={!opera}
        className="mt-1 w-28 rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 text-sm"
      />
      <span className="mt-0.5 block text-xs text-white/40">{ayuda}</span>
    </label>
  );
  const opcion = (activa: boolean) =>
    `rounded-lg border px-2.5 py-1.5 text-left text-xs ${
      activa ? "border-ng-azul bg-ng-azul/15 text-white" : "border-white/15 text-white/70 hover:bg-white/5"
    }`;
  const donde = a ? (a.enTexto && a.enPortada ? "ambos" : a.enPortada ? "portada" : "texto") : "texto";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{t("titulo")}</h2>
        {a && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={a.activa} onChange={(e) => cambiar({ activa: e.target.checked })} disabled={!opera} />
            {t("activa")}
          </label>
        )}
      </div>
      <p className="mt-0.5 text-xs text-white/45">{t("ayuda")}</p>

      {!a ? (
        <p className="mt-4 text-sm text-white/50">{cargando ? t("cargando") : t("errorCargar")}</p>
      ) : (
        <div className={`mt-4 space-y-4 ${a.activa ? "" : "opacity-60"}`}>
          <label className="block">
            <span className="block text-xs text-white/60">{t("formato")}</span>
            <input
              value={a.formato}
              maxLength={LARGO_MAXIMO_FORMATO}
              onChange={(e) => cambiar({ formato: e.target.value })}
              placeholder={FORMATO_NUMERACION_POR_DEFECTO}
              disabled={!opera}
              className="mt-1 w-full max-w-md rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 text-sm"
            />
            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-white/40">
              {t("variables")}
              {VARIABLES_NUMERACION.map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={!opera || a.formato.length + v.length + 2 > LARGO_MAXIMO_FORMATO}
                  onClick={() => cambiar({ formato: `${a.formato}{${v}}` })}
                  className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-white/70 hover:bg-white/5 disabled:opacity-40"
                >
                  {`{${v}}`}
                </button>
              ))}
            </span>
            {formatoValido(a.formato) ? (
              <span className="mt-1.5 block text-sm">
                <span className="text-white/45">{t("asiQueda")} </span>
                <span className="font-semibold">
                  {ejemploFormato(a.formato, { programa: a.siguientePrograma, video: 1, publicacion: a.siguientePublicacion })}
                </span>
              </span>
            ) : (
              <span className="mt-1.5 block text-xs text-red-400">{t("formatoInvalido")}</span>
            )}
          </label>

          <div>
            <span className="block text-xs text-white/60">{t("donde")}</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {(["texto", "portada", "ambos"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={!opera}
                  onClick={() => cambiar({ enTexto: d !== "portada", enPortada: d !== "texto" })}
                  className={opcion(donde === d)}
                >
                  {t(`dondeOpciones.${d}`)}
                </button>
              ))}
            </div>
            {a.enPortada && <span className="mt-1 block text-xs text-white/40">{t("portadaAyuda")}</span>}
          </div>

          <div className="flex flex-wrap gap-6">
            {numero(a.siguientePrograma, (n) => cambiar({ siguientePrograma: n }), t("siguientePrograma"), t("siguienteProgramaAyuda"))}
            {numero(a.siguientePublicacion, (n) => cambiar({ siguientePublicacion: n }), t("siguientePublicacion"), t("siguientePublicacionAyuda"))}
          </div>
          <p className="text-xs text-white/40">{t("videoAyuda")}</p>
        </div>
      )}

      {opera && a && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando || !cambiado || !valido}
            className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-ng-tinta hover:brightness-110 disabled:opacity-40"
          >
            {guardando ? t("guardando") : t("guardar")}
          </button>
          {aviso && <p className={`text-xs ${aviso.tono === "ok" ? "text-ng-teal" : "text-red-400"}`}>{aviso.texto}</p>}
        </div>
      )}
    </section>
  );
}
