"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useTranslations } from "next-intl";
import { MARCAS_ACTIVAS, RENOMBRAR_MARCA } from "@/graphql/operations";

/** El nombre de la marca tiene entre 2 y 60 caracteres (lo exige el backend). */
const valido = (v: string) => {
  const n = v.trim().replace(/\s+/g, " ").length;
  return n >= 2 && n <= 60;
};

/**
 * "Cambiar nombre" de la marca, en línea: solo para el propietario
 * (ng-creator-be#169). Al guardar se refrescan las marcas, así el selector y
 * todas las pantallas muestran el nombre nuevo.
 */
export function RenombrarMarca({ marcaId, actual }: { marcaId: string; actual: string }) {
  const t = useTranslations("renombrarMarca");
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(actual);
  const [error, setError] = useState<string | null>(null);
  const [renombrar, { loading }] = useMutation(RENOMBRAR_MARCA, {
    refetchQueries: [{ query: MARCAS_ACTIVAS }],
    awaitRefetchQueries: true,
  });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido(valor)) return;
    setError(null);
    try {
      await renombrar({ variables: { marcaId, nombre: valor.trim() } });
      setEditando(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    }
  }

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => {
          setValor(actual);
          setError(null);
          setEditando(true);
        }}
        className="text-xs text-ng-celeste hover:underline"
      >
        {t("cambiar")}
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-2 w-full max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value.slice(0, 60))}
          aria-label={t("nombre")}
          autoFocus
          className="min-w-0 flex-1 rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2 text-sm text-white outline-none transition focus:border-ng-azul"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditando(false)}
            disabled={loading}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 disabled:opacity-50"
          >
            {t("cancelar")}
          </button>
          <button
            type="submit"
            disabled={!valido(valor) || loading}
            className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-ng-tinta transition hover:brightness-110 disabled:opacity-40"
          >
            {loading ? t("guardando") : t("guardar")}
          </button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </form>
  );
}
